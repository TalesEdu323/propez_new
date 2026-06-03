import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import Stripe from 'stripe';
import type { EnvironmentConfig } from '../env.js';
import { insertSubscriptionEvent, recordPlanChange } from '../services/subscriptionEvents.js';
import {
  recordAffiliateCommission,
  recordSubscriptionConversion,
  fetchOrgAffiliateInfo,
} from '../services/affiliateCommissions.js';
import {
  incrementCouponRedemption,
  resolvePromotionCodeForCheckout,
} from '../services/stripeCoupons.js';

export interface StripeWebhookOptions {
  stripe: Stripe;
  config: EnvironmentConfig;
  pool: Pool;
}

export interface StripeCheckoutOptions {
  stripe: Stripe;
  config: EnvironmentConfig;
  pool: Pool;
}

type PlanId = 'pro' | 'business';
type BillingCycle = 'monthly' | 'yearly';

function normalizeReturnPath(path: string, fallback: string): string {
  if (!path || typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return fallback;
  return trimmed;
}

function resolvePlanFromPriceId(priceId: string | undefined | null, config: EnvironmentConfig): { plan: PlanId; cycle: BillingCycle } | null {
  if (!priceId) return null;
  const { pro, business } = config.stripePlans;
  if (priceId === pro.monthly) return { plan: 'pro', cycle: 'monthly' };
  if (priceId === pro.yearly) return { plan: 'pro', cycle: 'yearly' };
  if (priceId === business.monthly) return { plan: 'business', cycle: 'monthly' };
  if (priceId === business.yearly) return { plan: 'business', cycle: 'yearly' };
  return null;
}

/**
 * Tenta resolver `organization_id` a partir do customer/subscription do Stripe.
 * Usa o índice único em organizations(stripe_customer_id) /
 * organizations(stripe_subscription_id) — definido em sql/002_core.sql.
 */
async function fetchOrgBilling(
  pool: Pool,
  orgId: string,
): Promise<{ plan: string | null; billing_cycle: string | null } | null> {
  const { rows } = await pool.query<{ plan: string | null; billing_cycle: string | null }>(
    `SELECT plan, billing_cycle FROM organizations WHERE id = $1`,
    [orgId],
  );
  return rows[0] ?? null;
}

async function resolveOrgIdFromStripe(
  pool: Pool,
  hints: {
    clientReferenceId?: string | null;
    customerId?: string | null;
    subscriptionId?: string | null;
  },
): Promise<string | null> {
  if (hints.clientReferenceId) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM organizations WHERE id = $1`,
      [hints.clientReferenceId],
    );
    if (rows[0]?.id) return rows[0].id;
  }
  if (hints.subscriptionId) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM organizations WHERE stripe_subscription_id = $1`,
      [hints.subscriptionId],
    );
    if (rows[0]?.id) return rows[0].id;
  }
  if (hints.customerId) {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM organizations WHERE stripe_customer_id = $1`,
      [hints.customerId],
    );
    if (rows[0]?.id) return rows[0].id;
  }
  return null;
}

function derivePaymentMethod(
  types: string[] | undefined | null,
  fallback = 'card',
): 'card' | 'pix' | 'boleto' | string {
  if (!Array.isArray(types) || types.length === 0) return fallback;
  if (types.includes('card')) return 'card';
  if (types.includes('pix')) return 'pix';
  if (types.includes('boleto')) return 'boleto';
  return types[0] ?? fallback;
}

async function insertPayment(
  pool: Pool,
  payload: {
    organizationId: string | null;
    eventId: string;
    sessionId?: string | null;
    invoiceId?: string | null;
    subscriptionId?: string | null;
    customerId?: string | null;
    paymentMethod: string;
    amountCents: number;
    currency: string;
    status: 'paid' | 'failed' | 'refunded';
    plan?: string | null;
    billingCycle?: string | null;
    raw: unknown;
  },
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO stripe_payments (
         organization_id, stripe_event_id, stripe_session_id, stripe_invoice_id,
         stripe_subscription_id, stripe_customer_id, payment_method, amount_cents,
         currency, status, plan, billing_cycle, raw
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (stripe_event_id) DO NOTHING`,
      [
        payload.organizationId,
        payload.eventId,
        payload.sessionId ?? null,
        payload.invoiceId ?? null,
        payload.subscriptionId ?? null,
        payload.customerId ?? null,
        payload.paymentMethod,
        payload.amountCents,
        payload.currency,
        payload.status,
        payload.plan ?? null,
        payload.billingCycle ?? null,
        payload.raw ?? null,
      ],
    );
  } catch (err) {
    console.error('[stripe/webhook] insert payment falhou:', err);
  }
}

/**
 * Cria o handler de webhook do Stripe.
 *
 * ATENÇÃO: este handler precisa ser registrado com `express.raw({ type: 'application/json' })`
 * ANTES de qualquer `express.json()` global, senão a assinatura do Stripe falha.
 *
 * Persiste:
 *  - `stripe_payments` (idempotente por `stripe_event_id`)
 *  - atualiza `organizations` com plano, ciclo, customer/subscription, datas
 */
export function createStripeWebhookRouter({ stripe, config, pool }: StripeWebhookOptions): Router {
  const router = express.Router();

  router.post(
    '/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const sig = req.headers['stripe-signature'] as string;
      if (!sig) {
        return res.status(400).send('Missing stripe-signature header');
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          config.stripeWebhookSecret,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown webhook error';
        console.error(`Webhook Error: ${message}`);
        return res.status(400).send('Webhook validation failed');
      }

      try {
        switch (event.type) {
          case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.mode !== 'subscription') break;

            // Expandimos subscription para extrair priceId + período
            let subscription: Stripe.Subscription | null = null;
            if (typeof session.subscription === 'string') {
              try {
                subscription = await stripe.subscriptions.retrieve(session.subscription, {
                  expand: ['items.data.price'],
                });
              } catch (err) {
                console.error('[stripe/webhook] retrieve subscription falhou:', err);
              }
            } else if (session.subscription && typeof session.subscription === 'object') {
              subscription = session.subscription as Stripe.Subscription;
            }

            const customerId =
              typeof session.customer === 'string'
                ? session.customer
                : session.customer?.id ?? null;
            const subscriptionId = subscription?.id ?? null;
            const priceId = subscription?.items.data[0]?.price?.id;
            const planMatch = resolvePlanFromPriceId(priceId, config);

            const orgId = await resolveOrgIdFromStripe(pool, {
              clientReferenceId: session.client_reference_id ?? null,
              customerId,
              subscriptionId,
            });

            const before = orgId ? await fetchOrgBilling(pool, orgId) : null;

            if (orgId && planMatch) {
              const item = subscription?.items.data[0] as
                | (Stripe.SubscriptionItem & { current_period_end?: number })
                | undefined;
              const periodEndSec =
                item?.current_period_end ??
                (subscription as (Stripe.Subscription & { current_period_end?: number }) | null)
                  ?.current_period_end ??
                null;
              const periodEndIso = periodEndSec
                ? new Date(periodEndSec * 1000).toISOString()
                : null;

              const couponCode = session.metadata?.coupon_code ?? null;

              await pool.query(
                `UPDATE organizations SET
                   plan = $2,
                   billing_cycle = $3,
                   stripe_customer_id = COALESCE($4, stripe_customer_id),
                   stripe_subscription_id = COALESCE($5, stripe_subscription_id),
                   plan_started_at = COALESCE(plan_started_at, NOW()),
                   plan_renews_at = $6,
                   referred_coupon_code = COALESCE($7, referred_coupon_code)
                 WHERE id = $1`,
                [orgId, planMatch.plan, planMatch.cycle, customerId, subscriptionId, periodEndIso, couponCode],
              );

              await recordPlanChange(pool, {
                organizationId: orgId,
                fromPlan: before?.plan ?? 'free',
                fromCycle: before?.billing_cycle ?? null,
                toPlan: planMatch.plan,
                toCycle: planMatch.cycle,
                stripeEventId: `${event.id}:sub`,
              });

              const affiliateInfo = await fetchOrgAffiliateInfo(pool, orgId);
              if (affiliateInfo?.affiliate_id) {
                await recordSubscriptionConversion(pool, orgId, affiliateInfo.affiliate_id, {
                  sessionId: session.id,
                  plan: planMatch.plan,
                });
              }

              if (couponCode) {
                await incrementCouponRedemption(pool, couponCode);
              }
            }

            await insertPayment(pool, {
              organizationId: orgId,
              eventId: event.id,
              sessionId: session.id,
              subscriptionId,
              customerId,
              paymentMethod: derivePaymentMethod(session.payment_method_types as string[] | null),
              amountCents: session.amount_total ?? 0,
              currency: (session.currency || 'brl').toLowerCase(),
              status: 'paid',
              plan: planMatch?.plan ?? null,
              billingCycle: planMatch?.cycle ?? null,
              raw: { type: event.type, sessionId: session.id },
            });
            break;
          }

          case 'customer.subscription.updated':
          case 'customer.subscription.deleted': {
            const sub = event.data.object as Stripe.Subscription;
            const customerId =
              typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
            const priceId = sub.items.data[0]?.price?.id;
            const planMatch = resolvePlanFromPriceId(priceId, config);
            const orgId = await resolveOrgIdFromStripe(pool, {
              customerId,
              subscriptionId: sub.id,
            });
            if (!orgId) break;

            const before = await fetchOrgBilling(pool, orgId);

            const isCanceled =
              event.type === 'customer.subscription.deleted' ||
              sub.status === 'canceled' ||
              sub.status === 'unpaid' ||
              sub.status === 'incomplete_expired';

            const item = sub.items.data[0] as
              | (Stripe.SubscriptionItem & { current_period_end?: number })
              | undefined;
            const periodEndSec =
              item?.current_period_end ??
              (sub as Stripe.Subscription & { current_period_end?: number })
                .current_period_end ??
              null;
            const periodEndIso = periodEndSec
              ? new Date(periodEndSec * 1000).toISOString()
              : null;

            const cancelReason =
              (sub as Stripe.Subscription & { cancellation_details?: { reason?: string } })
                .cancellation_details?.reason ?? null;

            if (isCanceled) {
              await pool.query(
                `UPDATE organizations SET
                   plan = 'free',
                   billing_cycle = NULL,
                   plan_renews_at = NULL,
                   stripe_subscription_id = NULL
                 WHERE id = $1`,
                [orgId],
              );
              await recordPlanChange(pool, {
                organizationId: orgId,
                fromPlan: before?.plan ?? null,
                fromCycle: before?.billing_cycle ?? null,
                toPlan: 'free',
                toCycle: null,
                stripeEventId: event.id,
                isCancel: true,
                cancelReason,
              });
            } else if (planMatch) {
              await pool.query(
                `UPDATE organizations SET
                   plan = $2,
                   billing_cycle = $3,
                   plan_renews_at = $4
                 WHERE id = $1`,
                [orgId, planMatch.plan, planMatch.cycle, periodEndIso],
              );
              await recordPlanChange(pool, {
                organizationId: orgId,
                fromPlan: before?.plan ?? null,
                fromCycle: before?.billing_cycle ?? null,
                toPlan: planMatch.plan,
                toCycle: planMatch.cycle,
                stripeEventId: event.id,
              });
            }
            break;
          }

          case 'invoice.payment_succeeded':
          case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId =
              typeof invoice.customer === 'string'
                ? invoice.customer
                : invoice.customer?.id ?? null;
            const subscriptionId =
              typeof (invoice as Stripe.Invoice & { subscription?: string | { id?: string } | null })
                .subscription === 'string'
                ? (invoice as Stripe.Invoice & { subscription?: string }).subscription ?? null
                : ((invoice as Stripe.Invoice & { subscription?: { id?: string } })
                    .subscription?.id ?? null);

            // Tenta extrair priceId/plan da invoice. A linha pode trazer
            // `price` (versões antigas) ou `pricing.price_details.price`
            // (versões recentes). Tipamos como any para suportar ambos sem
            // forçar uma versão específica da SDK.
            const firstLine = invoice.lines?.data?.[0] as
              | (Stripe.InvoiceLineItem & {
                  price?: { id?: string };
                  pricing?: { price_details?: { price?: string } };
                })
              | undefined;
            const priceId =
              firstLine?.price?.id ??
              firstLine?.pricing?.price_details?.price ??
              undefined;
            const planMatch = resolvePlanFromPriceId(priceId, config);

            const orgId = await resolveOrgIdFromStripe(pool, {
              customerId,
              subscriptionId,
            });

            // Métodos de pagamento: invoice tem `payment_method_types` (recente)
            // ou cai no fallback `card`.
            const methodTypes = (invoice as Stripe.Invoice & {
              payment_method_types?: string[] | null;
            }).payment_method_types as string[] | null;

            const amountCents =
              event.type === 'invoice.payment_succeeded'
                ? invoice.amount_paid ?? 0
                : invoice.amount_due ?? 0;

            await insertPayment(pool, {
              organizationId: orgId,
              eventId: event.id,
              invoiceId: invoice.id,
              subscriptionId,
              customerId,
              paymentMethod: derivePaymentMethod(methodTypes),
              amountCents,
              currency: (invoice.currency || 'brl').toLowerCase(),
              status: event.type === 'invoice.payment_succeeded' ? 'paid' : 'failed',
              plan: planMatch?.plan ?? null,
              billingCycle: planMatch?.cycle ?? null,
              raw: { type: event.type, invoiceId: invoice.id },
            });

            if (orgId && event.type === 'invoice.payment_failed') {
              await insertSubscriptionEvent(pool, {
                organizationId: orgId,
                eventType: 'payment_failed',
                fromPlan: planMatch?.plan ?? null,
                toPlan: planMatch?.plan ?? null,
                fromCycle: planMatch?.cycle ?? null,
                toCycle: planMatch?.cycle ?? null,
                stripeEventId: `${event.id}:fail`,
                metadata: { invoiceId: invoice.id },
              });
            }

            if (orgId && event.type === 'invoice.payment_succeeded' && invoice.id) {
              const periodStart = invoice.period_start
                ? new Date(invoice.period_start * 1000)
                : null;
              const periodEnd = invoice.period_end
                ? new Date(invoice.period_end * 1000)
                : null;

              await recordAffiliateCommission(pool, {
                organizationId: orgId,
                stripeInvoiceId: invoice.id,
                amountPaidCents: invoice.amount_paid ?? 0,
                periodStart,
                periodEnd,
              });

              const couponCode = (
                invoice as Stripe.Invoice & { discount?: { coupon?: { name?: string } } }
              ).discount?.coupon?.name;
              if (couponCode) {
                await incrementCouponRedemption(pool, couponCode).catch(() => {});
              }
            }
            break;
          }

          default:
            // Eventos não tratados são silenciosamente ignorados.
            break;
        }
      } catch (err) {
        console.error(`[stripe/webhook] erro ao processar ${event.type}:`, err);
      }

      res.json({ received: true });
    },
  );

  return router;
}

export function createCheckoutRouter({ stripe, config, pool }: StripeCheckoutOptions): Router {
  const router = express.Router();

  // Retorna os planos disponíveis com os price IDs configurados no servidor.
  // A UI consome isso para montar os botões de checkout sem hardcodar IDs.
  router.get('/stripe/plans', (_req: Request, res: Response) => {
    const { pro, business } = config.stripePlans;
    res.json({
      currency: 'brl',
      plans: [
        {
          id: 'pro',
          name: 'Pro',
          prices: {
            monthly: pro.monthly || null,
            yearly: pro.yearly || null,
          },
        },
        {
          id: 'business',
          name: 'Business',
          prices: {
            monthly: business.monthly || null,
            yearly: business.yearly || null,
          },
        },
      ],
    });
  });

  // Cria uma sessão de checkout de ASSINATURA para um price específico.
  router.post('/stripe/create-checkout-session', async (req: Request, res: Response) => {
    try {
      const {
        priceId,
        successPath = '/app?route=configuracoes&success=true&session_id={CHECKOUT_SESSION_ID}',
        cancelPath = '/app?route=planos&canceled=true',
        clientReferenceId,
        organizationId,
        customerEmail,
        promotionCode,
        couponCode,
      } = (req.body ?? {}) as {
        priceId?: string;
        successPath?: string;
        cancelPath?: string;
        clientReferenceId?: string;
        organizationId?: string;
        customerEmail?: string;
        promotionCode?: string;
        couponCode?: string;
      };

      if (!priceId) {
        return res.status(400).json({ error: 'priceId é obrigatório' });
      }

      const planMatch = resolvePlanFromPriceId(priceId, config);
      if (!planMatch) {
        return res.status(400).json({ error: 'priceId não corresponde a nenhum plano configurado' });
      }

      const orgRef = organizationId ?? clientReferenceId ?? undefined;

      let resolvedCouponCode = (promotionCode ?? couponCode ?? '').trim() || null;
      let affiliateId: string | null = null;
      let affiliateDefaultCouponId: string | null = null;

      if (orgRef) {
        const orgAffiliate = await pool.query<{
          affiliate_id: string | null;
          default_coupon_id: string | null;
        }>(
          `SELECT o.affiliate_id, a.default_coupon_id
           FROM organizations o
           LEFT JOIN affiliates a ON a.id = o.affiliate_id
           WHERE o.id = $1`,
          [orgRef],
        );
        affiliateId = orgAffiliate.rows[0]?.affiliate_id ?? null;
        affiliateDefaultCouponId = orgAffiliate.rows[0]?.default_coupon_id ?? null;
      }

      if (!resolvedCouponCode && affiliateDefaultCouponId) {
        const defaultCoupon = await pool.query<{ code: string }>(
          `SELECT code FROM promo_coupons WHERE id = $1 AND status = 'active' LIMIT 1`,
          [affiliateDefaultCouponId],
        );
        resolvedCouponCode = defaultCoupon.rows[0]?.code ?? null;
      }

      const couponResolution = await resolvePromotionCodeForCheckout(pool, stripe, {
        couponCode: resolvedCouponCode,
        plan: planMatch.plan,
      });

      const safeSuccessPath = normalizeReturnPath(
        successPath,
        '/app?route=configuracoes&success=true&session_id={CHECKOUT_SESSION_ID}',
      );
      const safeCancelPath = normalizeReturnPath(cancelPath, '/app?route=planos&canceled=true');

      const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
        metadata: {
          plan: planMatch.plan,
          cycle: planMatch.cycle,
          clientReferenceId: orgRef ?? '',
          affiliate_id: affiliateId ?? '',
          coupon_code: couponResolution.coupon?.code ?? resolvedCouponCode ?? '',
        },
      };

      if (couponResolution.trialDays) {
        subscriptionData.trial_period_days = couponResolution.trialDays;
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${config.appUrl}${safeSuccessPath}`,
        cancel_url: `${config.appUrl}${safeCancelPath}`,
        client_reference_id: orgRef,
        customer_email: customerEmail,
        allow_promotion_codes: !couponResolution.stripePromotionCodeId,
        subscription_data: subscriptionData,
        metadata: {
          plan: planMatch.plan,
          cycle: planMatch.cycle,
          clientReferenceId: orgRef ?? '',
          affiliate_id: affiliateId ?? '',
          coupon_code: couponResolution.coupon?.code ?? resolvedCouponCode ?? '',
        },
      };

      if (couponResolution.stripePromotionCodeId) {
        sessionParams.discounts = [{ promotion_code: couponResolution.stripePromotionCodeId }];
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (orgRef && resolvedCouponCode) {
        await pool.query(
          `UPDATE organizations SET referred_coupon_code = $2 WHERE id = $1`,
          [orgRef, resolvedCouponCode],
        );
      }

      res.json({ id: session.id, url: session.url });
    } catch (error: unknown) {
      console.error('Stripe checkout error:', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar sessão de checkout';
      res.status(500).json({ error: message });
    }
  });

  // Retorna o status normalizado de uma sessão para a UI atualizar via refetch/API.
  router.get('/stripe/session/:id', async (req: Request, res: Response) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(req.params.id, {
        expand: ['subscription', 'subscription.items.data.price', 'customer'],
      });

      const subscription = typeof session.subscription === 'object' && session.subscription
        ? (session.subscription as Stripe.Subscription)
        : null;

      const priceId = subscription?.items.data[0]?.price?.id;
      const planMatch = resolvePlanFromPriceId(priceId, config);

      // `current_period_end` foi movido para `items.data[].current_period_end`
      // em versões recentes da API Stripe. Lemos do item como fonte primária
      // e caímos pro topo da subscription como fallback para versões antigas.
      const item = subscription?.items.data[0] as (Stripe.SubscriptionItem & {
        current_period_end?: number;
      }) | undefined;
      const periodEndSec =
        item?.current_period_end ??
        (subscription as Stripe.Subscription & { current_period_end?: number } | null)?.current_period_end;

      res.json({
        status: session.status,
        paymentStatus: session.payment_status,
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
        subscriptionId: subscription?.id ?? null,
        subscriptionStatus: subscription?.status ?? null,
        plan: planMatch?.plan ?? null,
        billingCycle: planMatch?.cycle ?? null,
        currentPeriodEnd: periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null,
      });
    } catch (error: unknown) {
      console.error('Stripe retrieve session error:', error);
      const message = error instanceof Error ? error.message : 'Erro ao buscar sessão';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
