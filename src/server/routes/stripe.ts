import express from 'express';
import type { Request, Response, Router } from 'express';
import Stripe from 'stripe';
import type { EnvironmentConfig } from '../env.js';

export interface StripeWebhookOptions {
  stripe: Stripe;
  config: EnvironmentConfig;
}

type PlanId = 'pro' | 'business';
type BillingCycle = 'monthly' | 'yearly';

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
 * Cria o handler de webhook do Stripe.
 *
 * ATENÇÃO: este handler precisa ser registrado com `express.raw({ type: 'application/json' })`
 * ANTES de qualquer `express.json()` global, senão a assinatura do Stripe falha.
 */
export function createStripeWebhookRouter({ stripe, config }: StripeWebhookOptions): Router {
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

      // Eventos de assinatura: logamos e deixamos a UI polar via /session/:id.
      // Quando for implementada persistência por conta (DB de usuários), é aqui
      // que o plano deverá ser atualizado para o `customerId` do evento.
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('[stripe/webhook] checkout.session.completed', {
            sessionId: session.id,
            mode: session.mode,
            customer: session.customer,
            subscription: session.subscription,
            clientReferenceId: session.client_reference_id,
          });
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          console.log(`[stripe/webhook] ${event.type}`, {
            subscriptionId: sub.id,
            status: sub.status,
            customer: sub.customer,
            priceId: sub.items.data[0]?.price?.id,
          });
          break;
        }
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[stripe/webhook] ${event.type}`, {
            invoiceId: invoice.id,
            customer: invoice.customer,
            amount: invoice.amount_paid,
          });
          break;
        }
        default:
          console.log(`[stripe/webhook] unhandled ${event.type}`);
      }

      res.json({ received: true });
    },
  );

  return router;
}

export function createCheckoutRouter({ stripe, config }: StripeWebhookOptions): Router {
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
        successPath = '/?route=configuracoes&success=true&session_id={CHECKOUT_SESSION_ID}',
        cancelPath = '/?route=planos&canceled=true',
        clientReferenceId,
        customerEmail,
      } = (req.body ?? {}) as {
        priceId?: string;
        successPath?: string;
        cancelPath?: string;
        clientReferenceId?: string;
        customerEmail?: string;
      };

      if (!priceId) {
        return res.status(400).json({ error: 'priceId é obrigatório' });
      }

      const planMatch = resolvePlanFromPriceId(priceId, config);
      if (!planMatch) {
        return res.status(400).json({ error: 'priceId não corresponde a nenhum plano configurado' });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${config.appUrl}${successPath}`,
        cancel_url: `${config.appUrl}${cancelPath}`,
        client_reference_id: clientReferenceId,
        customer_email: customerEmail,
        allow_promotion_codes: true,
        subscription_data: {
          metadata: {
            plan: planMatch.plan,
            cycle: planMatch.cycle,
            clientReferenceId: clientReferenceId ?? '',
          },
        },
        metadata: {
          plan: planMatch.plan,
          cycle: planMatch.cycle,
          clientReferenceId: clientReferenceId ?? '',
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: unknown) {
      console.error('Stripe checkout error:', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar sessão de checkout';
      res.status(500).json({ error: message });
    }
  });

  // Retorna o status normalizado de uma sessão para a UI atualizar o localStorage.
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
