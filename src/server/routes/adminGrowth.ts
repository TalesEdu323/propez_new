import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import Stripe from 'stripe';
import { z } from 'zod';
import type { EnvironmentConfig } from '../env.js';
import { buildRequireAuth } from '../auth/middleware.js';
import { buildRequirePlatformAdmin } from '../auth/platformAdmin.js';
import { generateAffiliateCode } from '../services/affiliateEvents.js';
import {
  createStripeCouponAndPromo,
  deactivateCoupon,
  findCouponById,
} from '../services/stripeCoupons.js';

const createAffiliateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional().nullable(),
  code: z.string().trim().regex(/^[A-Za-z0-9_-]{2,40}$/).optional(),
  commissionPercent: z.number().min(0).max(100).default(0),
  defaultCouponId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).optional(),
});

const updateAffiliateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().nullable().optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
  defaultCouponId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).optional(),
});

const createCouponSchema = z.object({
  code: z.string().trim().regex(/^[A-Za-z0-9_-]{2,40}$/),
  name: z.string().trim().max(120).optional(),
  discountType: z.enum(['percent', 'free_months', 'trial_days']),
  discountValue: z.number().int().min(1).max(100),
  duration: z.enum(['once', 'repeating', 'forever']).optional(),
  durationInMonths: z.number().int().min(1).max(36).nullable().optional(),
  maxRedemptions: z.number().int().min(1).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  appliesToPlans: z.array(z.enum(['pro', 'business'])).nullable().optional(),
});

const updateCommissionSchema = z.object({
  status: z.enum(['paid', 'cancelled']).optional(),
  paidNotes: z.string().max(2000).optional(),
});

export function createAdminGrowthRouter(deps: {
  pool: Pool;
  config: EnvironmentConfig;
  stripe: Stripe;
}): Router {
  const { pool, config, stripe } = deps;
  const router = express.Router();
  const requireAuth = buildRequireAuth(config.auth);
  const requirePlatformAdmin = buildRequirePlatformAdmin({ pool, config });

  router.use(requireAuth, requirePlatformAdmin);

  // ==========================================================================
  // Afiliados
  // ==========================================================================

  router.get('/affiliates', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT
           a.id, a.code, a.name, a.email, a.commission_percent, a.status,
           a.default_coupon_id, a.notes, a.created_at, a.updated_at,
           COALESCE(ev.clicks, 0)::int AS clicks,
           COALESCE(ev.views, 0)::int AS views,
           COALESCE(ev.signups, 0)::int AS signups,
           COALESCE(ev.subscriptions, 0)::int AS subscriptions,
           COALESCE(cm.mrr_cents, 0)::bigint AS attributed_mrr_cents,
           COALESCE(cm.pending_cents, 0)::bigint AS commission_pending_cents,
           COALESCE(cm.paid_cents, 0)::bigint AS commission_paid_cents
         FROM affiliates a
         LEFT JOIN LATERAL (
           SELECT
             COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
             COUNT(*) FILTER (WHERE event_type = 'view') AS views,
             COUNT(*) FILTER (WHERE event_type = 'signup') AS signups,
             COUNT(*) FILTER (WHERE event_type = 'subscription') AS subscriptions
           FROM affiliate_events ae WHERE ae.affiliate_id = a.id
         ) ev ON TRUE
         LEFT JOIN LATERAL (
           SELECT
             SUM(mrr_cents) AS mrr_cents,
             SUM(commission_cents) FILTER (WHERE status = 'pending') AS pending_cents,
             SUM(commission_cents) FILTER (WHERE status = 'paid') AS paid_cents
           FROM affiliate_commissions ac WHERE ac.affiliate_id = a.id
         ) cm ON TRUE
         ORDER BY a.created_at DESC`,
      );
      res.json(rows.map((row) => ({
        ...formatAffiliateListRow(row),
        link: `${config.appUrl}/r/${row.code}`,
      })));
    } catch (err) {
      console.error('[admin/affiliates] list:', err);
      res.status(500).json({ error: 'Erro ao listar afiliados' });
    }
  });

  router.post('/affiliates', async (req: Request, res: Response) => {
    const parsed = createAffiliateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }
    const data = parsed.data;
    const code = (data.code ?? generateAffiliateCode(data.name)).toUpperCase();

    try {
      const { rows } = await pool.query(
        `INSERT INTO affiliates (code, name, email, commission_percent, default_coupon_id, notes)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          code,
          data.name,
          data.email ?? null,
          data.commissionPercent,
          data.defaultCouponId ?? null,
          data.notes ?? '',
        ],
      );
      res.status(201).json(formatAffiliateRow(rows[0], config.appUrl));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('ux_affiliates_code_lower') || msg.includes('duplicate')) {
        return res.status(409).json({ error: 'Código de afiliado já existe' });
      }
      console.error('[admin/affiliates] create:', err);
      res.status(500).json({ error: 'Erro ao criar afiliado' });
    }
  });

  router.get('/affiliates/:id', async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT
           a.*,
           COALESCE(ev.clicks, 0)::int AS clicks,
           COALESCE(ev.views, 0)::int AS views,
           COALESCE(ev.signups, 0)::int AS signups,
           COALESCE(ev.subscriptions, 0)::int AS subscriptions
         FROM affiliates a
         LEFT JOIN LATERAL (
           SELECT
             COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
             COUNT(*) FILTER (WHERE event_type = 'view') AS views,
             COUNT(*) FILTER (WHERE event_type = 'signup') AS signups,
             COUNT(*) FILTER (WHERE event_type = 'subscription') AS subscriptions
           FROM affiliate_events ae WHERE ae.affiliate_id = a.id
         ) ev ON TRUE
         WHERE a.id = $1`,
        [req.params.id],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Afiliado não encontrado' });

      const events = await pool.query(
        `SELECT ae.id, ae.event_type, ae.session_id, ae.organization_id, ae.metadata, ae.created_at,
                o.name AS organization_name
         FROM affiliate_events ae
         LEFT JOIN organizations o ON o.id = ae.organization_id
         WHERE ae.affiliate_id = $1
         ORDER BY ae.created_at DESC
         LIMIT 100`,
        [req.params.id],
      );

      const commissions = await pool.query(
        `SELECT ac.*, o.name AS organization_name
         FROM affiliate_commissions ac
         LEFT JOIN organizations o ON o.id = ac.organization_id
         WHERE ac.affiliate_id = $1
         ORDER BY ac.created_at DESC
         LIMIT 100`,
        [req.params.id],
      );

      res.json({
        ...formatAffiliateListRow(rows[0]),
        link: `${config.appUrl}/r/${rows[0].code}`,
        events: events.rows.map((ev) => ({
          id: ev.id,
          eventType: ev.event_type,
          organizationName: ev.organization_name,
          createdAt: ev.created_at,
        })),
        commissions: commissions.rows.map(formatCommissionRow),
      });
    } catch (err) {
      console.error('[admin/affiliates] detail:', err);
      res.status(500).json({ error: 'Erro ao carregar afiliado' });
    }
  });

  router.patch('/affiliates/:id', async (req: Request, res: Response) => {
    const parsed = updateAffiliateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }
    const d = parsed.data;
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;

    if (d.name !== undefined) { sets.push(`name = $${i++}`); vals.push(d.name); }
    if (d.email !== undefined) { sets.push(`email = $${i++}`); vals.push(d.email); }
    if (d.commissionPercent !== undefined) { sets.push(`commission_percent = $${i++}`); vals.push(d.commissionPercent); }
    if (d.status !== undefined) { sets.push(`status = $${i++}`); vals.push(d.status); }
    if (d.defaultCouponId !== undefined) { sets.push(`default_coupon_id = $${i++}`); vals.push(d.defaultCouponId); }
    if (d.notes !== undefined) { sets.push(`notes = $${i++}`); vals.push(d.notes); }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    sets.push(`updated_at = NOW()`);
    vals.push(req.params.id);

    try {
      const { rows } = await pool.query(
        `UPDATE affiliates SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        vals,
      );
      if (!rows[0]) return res.status(404).json({ error: 'Afiliado não encontrado' });
      res.json(formatAffiliateRow(rows[0], config.appUrl));
    } catch (err) {
      console.error('[admin/affiliates] patch:', err);
      res.status(500).json({ error: 'Erro ao atualizar afiliado' });
    }
  });

  // ==========================================================================
  // Cupons
  // ==========================================================================

  router.get('/coupons', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM promo_coupons ORDER BY created_at DESC`,
      );
      res.json(rows.map(formatCouponRow));
    } catch (err) {
      console.error('[admin/coupons] list:', err);
      res.status(500).json({ error: 'Erro ao listar cupons' });
    }
  });

  router.post('/coupons', async (req: Request, res: Response) => {
    const parsed = createCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }
    const data = parsed.data;

    if (data.discountType === 'free_months' && data.discountValue > 12) {
      return res.status(400).json({ error: 'Máximo de 12 meses grátis' });
    }
    if (data.discountType === 'trial_days' && data.discountValue > 90) {
      return res.status(400).json({ error: 'Máximo de 90 dias de trial' });
    }

    try {
      const existing = await pool.query(
        `SELECT 1 FROM promo_coupons WHERE LOWER(code) = LOWER($1)`,
        [data.code],
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Código de cupom já existe' });
      }

      const coupon = await createStripeCouponAndPromo(stripe, pool, {
        code: data.code.toUpperCase(),
        name: data.name ?? data.code.toUpperCase(),
        discountType: data.discountType,
        discountValue: data.discountValue,
        duration: data.duration,
        durationInMonths: data.durationInMonths,
        maxRedemptions: data.maxRedemptions,
        expiresAt: data.expiresAt,
        appliesToPlans: data.appliesToPlans,
      });
      res.status(201).json(formatCouponRow(coupon));
    } catch (err) {
      console.error('[admin/coupons] create:', err);
      const message = err instanceof Error ? err.message : 'Erro ao criar cupom';
      res.status(500).json({ error: message });
    }
  });

  router.patch('/coupons/:id', async (req: Request, res: Response) => {
    const action = req.body?.action;
    if (action !== 'deactivate') {
      return res.status(400).json({ error: 'Ação inválida. Use action: "deactivate"' });
    }
    try {
      const coupon = await deactivateCoupon(stripe, pool, req.params.id);
      if (!coupon) return res.status(404).json({ error: 'Cupom não encontrado' });
      res.json(formatCouponRow(coupon));
    } catch (err) {
      console.error('[admin/coupons] deactivate:', err);
      res.status(500).json({ error: 'Erro ao desativar cupom' });
    }
  });

  router.get('/coupons/:id/redemptions', async (req: Request, res: Response) => {
    try {
      const coupon = await findCouponById(pool, req.params.id);
      if (!coupon) return res.status(404).json({ error: 'Cupom não encontrado' });

      const { rows } = await pool.query(
        `SELECT id, name, plan, referred_coupon_code, created_at
         FROM organizations
         WHERE LOWER(referred_coupon_code) = LOWER($1)
         ORDER BY created_at DESC
         LIMIT 100`,
        [coupon.code],
      );
      res.json(rows);
    } catch (err) {
      console.error('[admin/coupons] redemptions:', err);
      res.status(500).json({ error: 'Erro ao listar resgates' });
    }
  });

  // ==========================================================================
  // Comissões
  // ==========================================================================

  router.patch('/affiliate-commissions/:id', async (req: Request, res: Response) => {
    const parsed = updateCommissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }
    const d = parsed.data;
    if (!d.status) {
      return res.status(400).json({ error: 'status é obrigatório' });
    }

    try {
      const paidAt = d.status === 'paid' ? new Date().toISOString() : null;
      const { rows } = await pool.query(
        `UPDATE affiliate_commissions SET
           status = $2,
           paid_at = COALESCE($3, paid_at),
           paid_notes = COALESCE($4, paid_notes)
         WHERE id = $1
         RETURNING *`,
        [req.params.id, d.status, paidAt, d.paidNotes ?? null],
      );
      if (!rows[0]) return res.status(404).json({ error: 'Comissão não encontrada' });
      res.json(formatCommissionRow(rows[0]));
    } catch (err) {
      console.error('[admin/commissions] patch:', err);
      res.status(500).json({ error: 'Erro ao atualizar comissão' });
    }
  });

  return router;
}

function formatAffiliateListRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    email: row.email,
    commissionPercent: Number(row.commission_percent),
    status: row.status,
    defaultCouponId: row.default_coupon_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clicks: row.clicks,
    views: row.views,
    signups: row.signups,
    subscriptions: row.subscriptions,
    attributedMrrCents: Number(row.attributed_mrr_cents ?? 0),
    commissionPendingCents: Number(row.commission_pending_cents ?? 0),
    commissionPaidCents: Number(row.commission_paid_cents ?? 0),
  };
}

function formatAffiliateRow(row: Record<string, unknown>, appUrl: string) {
  const code = String(row.code);
  return {
    ...formatAffiliateListRow(row),
    link: `${appUrl}/r/${code}`,
    clicks: undefined,
    views: undefined,
    signups: undefined,
    subscriptions: undefined,
    attributedMrrCents: undefined,
    commissionPendingCents: undefined,
    commissionPaidCents: undefined,
  };
}

function formatCouponRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    duration: row.duration,
    durationInMonths: row.duration_in_months,
    maxRedemptions: row.max_redemptions,
    redemptionCount: row.redemption_count,
    expiresAt: row.expires_at,
    appliesToPlans: row.applies_to_plans,
    stripeCouponId: row.stripe_coupon_id,
    stripePromotionCodeId: row.stripe_promotion_code_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatCommissionRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    affiliateId: row.affiliate_id,
    organizationId: row.organization_id,
    organizationName: row.organization_name ?? null,
    stripeInvoiceId: row.stripe_invoice_id,
    mrrCents: Number(row.mrr_cents),
    commissionPercent: Number(row.commission_percent),
    commissionCents: Number(row.commission_cents),
    status: row.status,
    paidAt: row.paid_at,
    paidNotes: row.paid_notes,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    createdAt: row.created_at,
  };
}
