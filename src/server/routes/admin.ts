import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import Stripe from 'stripe'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { buildRequirePlatformAdmin } from '../auth/platformAdmin.js'
import { registerAdminServiceRequestRoutes, adminOrgBrandPatchSchema, applyAdminOrgBrandPatch } from './adminServiceRequests.js'
import { registerAdminAnalyticsRoutes, enrichOrgDetail } from './adminAnalytics.js'
import { isOrgActiveForMrr, mrrBrlForPlan } from '../services/mrrPricing.js'
import type { MailClient } from '../mail/client.js'
import { isAuthMailFailure, respondAuthMailFailure, sendAuthEmail } from '../mail/authMail.js'
import { isMailConfigured } from '../env.js'
import {
  issueEmailVerification,
  issuePasswordReset,
} from '../services/authMailService.js'
import { canDeleteUser } from '../services/adminUserSafeguards.js'
function monthlyEquivalent(plan: string | null | undefined, cycle: string | null | undefined): number {
  return mrrBrlForPlan(plan, cycle)
}

function isOrgActive(org: { plan: string | null; stripe_subscription_id: string | null; trial_ends_at: Date | null }): boolean {
  return isOrgActiveForMrr(org)
}

const updateOrgSchema = z.object({
  plan: z.enum(['free', 'pro', 'business']).optional(),
  billingCycle: z.enum(['monthly', 'yearly']).nullable().optional(),
  planRenewsAt: z.string().datetime().nullable().optional(),
  trialEndsAt: z.string().datetime().nullable().optional(),
  csNotes: z.string().max(10000).optional(),
}).merge(adminOrgBrandPatchSchema)

const updateUserSchema = z
  .object({
    isPlatformAdmin: z.boolean().optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Nenhum campo para atualizar' })

export function createAdminRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
  mail: MailClient
  stripe: Stripe
}): Router {
  const { pool, config, mail, stripe } = deps
  const router = express.Router()
  const requireAuth = buildRequireAuth(config.auth)
  const requirePlatformAdmin = buildRequirePlatformAdmin({ pool, config })

  router.use(requireAuth, requirePlatformAdmin)

  registerAdminServiceRequestRoutes(router, { pool, config })

  registerAdminAnalyticsRoutes(router, { pool, config })

  // ==========================================================================
  // GET /api/admin/saas/metrics — métricas agregadas
  // ==========================================================================
  router.get('/saas/metrics', async (_req: Request, res: Response) => {
    try {
      const orgsRes = await pool.query<{
        id: string
        name: string
        plan: string | null
        billing_cycle: string | null
        stripe_subscription_id: string | null
        trial_ends_at: Date | null
        created_at: Date
      }>(
        `SELECT id, name, plan, billing_cycle, stripe_subscription_id,
                trial_ends_at, created_at
         FROM organizations
         ORDER BY created_at DESC`,
      )
      const orgs = orgsRes.rows

      const totalOrganizations = orgs.length
      const activeOrgs = orgs.filter(isOrgActive)
      const activeSubscriptions = activeOrgs.length

      const totalRevenueMonthly = activeOrgs.reduce(
        (sum, o) => sum + monthlyEquivalent(o.plan, o.billing_cycle),
        0,
      )

      // Distribuição por plano
      const planDistribution: Record<string, number> = { free: 0, pro: 0, business: 0 }
      for (const o of orgs) {
        const p = (o.plan || 'free').toLowerCase()
        if (p in planDistribution) planDistribution[p] += 1
      }

      // Pagamentos (real, vindos do Stripe via webhook)
      const paymentStats = {
        totalRevenue: 0,
        creditCardRevenue: 0,
        pixRevenue: 0,
        boletoRevenue: 0,
        creditCardCount: 0,
        pixCount: 0,
        boletoCount: 0,
        totalPayments: 0,
      }

      try {
        const totals = await pool.query<{
          payment_method: string
          total_cents: string
          count: string
        }>(
          `SELECT payment_method,
                  COALESCE(SUM(amount_cents), 0)::text AS total_cents,
                  COUNT(*)::text AS count
           FROM stripe_payments
           WHERE status = 'paid'
           GROUP BY payment_method`,
        )
        for (const row of totals.rows) {
          const total = Number(row.total_cents) / 100
          const count = Number(row.count)
          paymentStats.totalRevenue += total
          paymentStats.totalPayments += count
          if (row.payment_method === 'card') {
            paymentStats.creditCardRevenue = total
            paymentStats.creditCardCount = count
          } else if (row.payment_method === 'pix') {
            paymentStats.pixRevenue = total
            paymentStats.pixCount = count
          } else if (row.payment_method === 'boleto') {
            paymentStats.boletoRevenue = total
            paymentStats.boletoCount = count
          }
        }
      } catch (err) {
        console.error('[admin/metrics] payments query falhou:', err)
      }

      // Vendas por período (orgs criadas — proxy de novas vendas)
      const salesByPeriod = { today: 0, thisWeek: 0, thisMonth: 0, last30Days: 0 }
      try {
        const periodsRes = await pool.query<{
          today: string
          this_week: string
          this_month: string
          last_30: string
        }>(
          `SELECT
             COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE)::text AS today,
             COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::text AS this_week,
             COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE))::text AS this_month,
             COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')::text AS last_30
           FROM organizations`,
        )
        const r = periodsRes.rows[0]
        if (r) {
          salesByPeriod.today = Number(r.today)
          salesByPeriod.thisWeek = Number(r.this_week)
          salesByPeriod.thisMonth = Number(r.this_month)
          salesByPeriod.last30Days = Number(r.last_30)
        }
      } catch (err) {
        console.error('[admin/metrics] sales periods query falhou:', err)
      }

      // Totais auxiliares (clientes, propostas)
      let totalClients = 0
      let totalPropostas = 0
      try {
        const c = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM clientes`)
        const p = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM propostas`)
        totalClients = Number(c.rows[0]?.count ?? 0)
        totalPropostas = Number(p.rows[0]?.count ?? 0)
      } catch (err) {
        console.error('[admin/metrics] counts query falhou:', err)
      }

      // Total de usuários ativos da plataforma
      let totalUsers = 0
      try {
        const u = await pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users`)
        totalUsers = Number(u.rows[0]?.count ?? 0)
      } catch (err) {
        console.error('[admin/metrics] users count falhou:', err)
      }

      return res.json({
        stats: {
          totalOrganizations,
          activeSubscriptions,
          totalRevenueMonthly,
          totalRevenue: paymentStats.totalRevenue || totalRevenueMonthly,
          totalUsers,
          totalClients,
          totalPropostas,
          planDistribution,
          salesByPeriod,
          paymentStats,
        },
      })
    } catch (err) {
      console.error('[admin/metrics] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar métricas' })
    }
  })

  // ==========================================================================
  // GET /api/admin/organizations — lista
  // ==========================================================================
  router.get('/organizations', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{
        id: string
        name: string
        cnpj: string | null
        plan: string | null
        billing_cycle: string | null
        trial_ends_at: Date | null
        plan_started_at: Date | null
        plan_renews_at: Date | null
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        onboarded: boolean
        created_at: Date
        member_count: string
      }>(
        `SELECT o.id, o.name, o.cnpj, o.plan, o.billing_cycle,
                o.trial_ends_at, o.plan_started_at, o.plan_renews_at,
                o.stripe_customer_id, o.stripe_subscription_id, o.onboarded,
                o.created_at,
                (SELECT COUNT(*)::text FROM memberships m WHERE m.organization_id = o.id) AS member_count
         FROM organizations o
         ORDER BY o.created_at DESC`,
      )
      return res.json(
        rows.map((o) => ({
          id: o.id,
          name: o.name,
          cnpj: o.cnpj,
          plan: o.plan,
          billingCycle: o.billing_cycle,
          trialEndsAt: o.trial_ends_at,
          planStartedAt: o.plan_started_at,
          planRenewsAt: o.plan_renews_at,
          stripeCustomerId: o.stripe_customer_id,
          stripeSubscriptionId: o.stripe_subscription_id,
          onboarded: o.onboarded,
          createdAt: o.created_at,
          memberCount: Number(o.member_count),
          mrr: monthlyEquivalent(o.plan, o.billing_cycle),
          status: isOrgActive({
            plan: o.plan,
            stripe_subscription_id: o.stripe_subscription_id,
            trial_ends_at: o.trial_ends_at,
          })
            ? o.plan === 'free'
              ? 'trial'
              : 'active'
            : 'inactive',
        })),
      )
    } catch (err) {
      console.error('[admin/orgs] erro:', err)
      return res.status(500).json({ error: 'Erro ao listar organizações' })
    }
  })

  // ==========================================================================
  // GET /api/admin/organizations/:id — detalhe
  // ==========================================================================
  router.get('/organizations/:id', async (req: Request, res: Response) => {
    try {
      const orgRes = await pool.query(
        `SELECT id, name, cnpj, logo_url, primary_color, secondary_color,
                whitelabel_enabled, plan, billing_cycle,
                trial_ends_at, plan_started_at, plan_renews_at,
                stripe_customer_id, stripe_subscription_id, onboarded,
                cs_notes, created_at, updated_at
         FROM organizations WHERE id = $1`,
        [req.params.id],
      )
      const org = orgRes.rows[0]
      if (!org) return res.status(404).json({ error: 'Organização não encontrada' })

      const membersRes = await pool.query(
        `SELECT u.id, u.name, u.email, u.last_login_at, m.role, m.created_at AS joined_at
         FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.organization_id = $1
         ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name ASC`,
        [req.params.id],
      )

      const paymentsRes = await pool.query(
        `SELECT id, stripe_event_id, stripe_invoice_id, stripe_session_id,
                payment_method, amount_cents, currency, status, plan, billing_cycle,
                created_at
         FROM stripe_payments
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [req.params.id],
      )

      const payload = {
        organization: {
          id: org.id,
          name: org.name,
          cnpj: org.cnpj,
          logoUrl: org.logo_url,
          primaryColor: org.primary_color ?? null,
          secondaryColor: org.secondary_color ?? null,
          whitelabelEnabled: org.whitelabel_enabled === true,
          plan: org.plan,
          billingCycle: org.billing_cycle,
          trialEndsAt: org.trial_ends_at,
          planStartedAt: org.plan_started_at,
          planRenewsAt: org.plan_renews_at,
          stripeCustomerId: org.stripe_customer_id,
          stripeSubscriptionId: org.stripe_subscription_id,
          onboarded: org.onboarded,
          csNotes: org.cs_notes,
          createdAt: org.created_at,
          updatedAt: org.updated_at,
        },
        members: membersRes.rows.map((m: { id: string; name: string; email: string; last_login_at: Date | null; role: string; joined_at: Date }) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          lastLoginAt: m.last_login_at,
          role: m.role,
          joinedAt: m.joined_at,
        })),
        payments: paymentsRes.rows.map((p: { id: string; stripe_event_id: string; stripe_invoice_id: string | null; stripe_session_id: string | null; payment_method: string; amount_cents: number; currency: string; status: string; plan: string | null; billing_cycle: string | null; created_at: Date }) => ({
          id: p.id,
          eventId: p.stripe_event_id,
          invoiceId: p.stripe_invoice_id,
          sessionId: p.stripe_session_id,
          paymentMethod: p.payment_method,
          amountCents: Number(p.amount_cents),
          currency: p.currency,
          status: p.status,
          plan: p.plan,
          billingCycle: p.billing_cycle,
          createdAt: p.created_at,
        })),
      }
      const enriched = await enrichOrgDetail(pool, req.params.id, payload)
      return res.json(enriched)
    } catch (err) {
      console.error('[admin/orgs/detail] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar organização' })
    }
  })

  // ==========================================================================
  // PATCH /api/admin/organizations/:id — admin altera plano/datas manualmente
  // ==========================================================================
  router.patch('/organizations/:id', async (req: Request, res: Response) => {
    const parsed = updateOrgSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const patch = parsed.data
    try {
      const brandPatch = {
        whitelabelEnabled: patch.whitelabelEnabled,
        logoUrl: patch.logoUrl,
        primaryColor: patch.primaryColor,
        secondaryColor: patch.secondaryColor,
      };
      const hasBrand =
        patch.whitelabelEnabled !== undefined ||
        'logoUrl' in patch ||
        'primaryColor' in patch ||
        'secondaryColor' in patch;

      const { rows } = await pool.query(
        `UPDATE organizations SET
           plan = COALESCE($2, plan),
           billing_cycle = CASE WHEN $3::boolean THEN $4 ELSE billing_cycle END,
           plan_renews_at = CASE WHEN $5::boolean THEN $6 ELSE plan_renews_at END,
           trial_ends_at = CASE WHEN $7::boolean THEN $8 ELSE trial_ends_at END,
           cs_notes = CASE WHEN $9::boolean THEN $10 ELSE cs_notes END
         WHERE id = $1
         RETURNING id`,
        [
          req.params.id,
          patch.plan ?? null,
          'billingCycle' in patch,
          patch.billingCycle ?? null,
          'planRenewsAt' in patch,
          patch.planRenewsAt ?? null,
          'trialEndsAt' in patch,
          patch.trialEndsAt ?? null,
          'csNotes' in patch,
          patch.csNotes ?? null,
        ],
      )
      if (rows.length === 0) return res.status(404).json({ error: 'Organização não encontrada' })

      if (hasBrand) {
        await applyAdminOrgBrandPatch(pool, req.params.id, brandPatch)
      }

      return res.json({ ok: true })
    } catch (err) {
      console.error('[admin/orgs/update] erro:', err)
      return res.status(500).json({ error: 'Erro ao atualizar organização' })
    }
  })

  // ==========================================================================
  // GET /api/admin/users — lista
  // ==========================================================================
  router.get('/users', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{
        id: string
        name: string
        email: string
        email_verified_at: Date | null
        last_login_at: Date | null
        is_platform_admin: boolean
        created_at: Date
        org_count: string
      }>(
        `SELECT u.id, u.name, u.email, u.email_verified_at, u.last_login_at,
                u.is_platform_admin, u.created_at,
                (SELECT COUNT(*)::text FROM memberships m WHERE m.user_id = u.id) AS org_count
         FROM users u
         ORDER BY u.created_at DESC`,
      )
      return res.json(
        rows.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          emailVerifiedAt: u.email_verified_at,
          lastLoginAt: u.last_login_at,
          isPlatformAdmin: u.is_platform_admin,
          createdAt: u.created_at,
          orgCount: Number(u.org_count),
        })),
      )
    } catch (err) {
      console.error('[admin/users] erro:', err)
      return res.status(500).json({ error: 'Erro ao listar usuários' })
    }
  })

  // ==========================================================================
  // PATCH /api/admin/users/:id — admin altera usuário
  // ==========================================================================
  router.patch('/users/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = updateUserSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })

    const patch = parsed.data
    if (
      req.params.id === req.auth.userId &&
      patch.isPlatformAdmin === false
    ) {
      return res.status(400).json({
        error: 'Você não pode remover a si mesmo da lista de platform admins.',
      })
    }

    try {
      if (patch.email) {
        const taken = await pool.query<{ id: string }>(
          `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
          [patch.email, req.params.id],
        )
        if (taken.rows.length > 0) {
          return res.status(409).json({ error: 'Este e-mail já está em uso' })
        }
      }

      const sets: string[] = []
      const values: unknown[] = [req.params.id]
      let idx = 2

      if (patch.isPlatformAdmin !== undefined) {
        sets.push(`is_platform_admin = $${idx++}`)
        values.push(patch.isPlatformAdmin)
      }
      if (patch.email !== undefined) {
        sets.push(`email = $${idx++}`)
        values.push(patch.email)
        sets.push(`email_verified_at = NULL`)
      }
      if (patch.name !== undefined) {
        sets.push(`name = $${idx++}`)
        values.push(patch.name)
      }

      const { rowCount } = await pool.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $1`,
        values,
      )
      if (rowCount === 0) return res.status(404).json({ error: 'Usuário não encontrado' })
      return res.json({ ok: true })
    } catch (err) {
      console.error('[admin/users/update] erro:', err)
      return res.status(500).json({ error: 'Erro ao atualizar usuário' })
    }
  })

  // ==========================================================================
  // POST /api/admin/users/:id/send-password-reset
  // ==========================================================================
  router.post('/users/:id/send-password-reset', async (req: Request, res: Response) => {
    try {
      const exists = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE id = $1`,
        [req.params.id],
      )
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      const mailResult = await issuePasswordReset(pool, config, mail, req.params.id)
      if (isAuthMailFailure(mailResult)) {
        if (config.mail.required) {
          return respondAuthMailFailure(res, config, mailResult)
        }
        return res.json({ sent: false, reason: mailResult.reason })
      }
      return res.json({
        sent: true,
        ...(config.nodeEnv !== 'production' && mailResult.devResetUrl
          ? { devResetUrl: mailResult.devResetUrl }
          : {}),
      })
    } catch (err) {
      console.error('[admin/users/send-password-reset] erro:', err)
      return res.status(500).json({ error: 'Erro ao enviar e-mail' })
    }
  })

  // ==========================================================================
  // POST /api/admin/users/:id/send-verification
  // ==========================================================================
  router.post('/users/:id/send-verification', async (req: Request, res: Response) => {
    try {
      const exists = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE id = $1`,
        [req.params.id],
      )
      if (exists.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }

      const mailResult = await issueEmailVerification(pool, config, mail, req.params.id)
      if (mailResult.alreadyVerified) return res.json({ alreadyVerified: true })
      if (isAuthMailFailure(mailResult)) {
        if (config.mail.required) {
          return respondAuthMailFailure(res, config, mailResult)
        }
        return res.json({
          sent: false,
          reason: mailResult.reason,
          ...(config.nodeEnv !== 'production' && mailResult.devVerificationCode
            ? { devVerificationCode: mailResult.devVerificationCode }
            : {}),
        })
      }
      return res.json({
        sent: true,
        ...(config.nodeEnv !== 'production' && mailResult.devVerificationCode
          ? { devVerificationCode: mailResult.devVerificationCode }
          : {}),
      })
    } catch (err) {
      console.error('[admin/users/send-verification] erro:', err)
      return res.status(500).json({ error: 'Erro ao enviar verificação' })
    }
  })

  // ==========================================================================
  // POST /api/admin/operations/test-email — valida provedor em produção (Vercel)
  // ==========================================================================
  const testEmailSchema = z.object({
    to: z.string().trim().toLowerCase().email(),
  })

  router.post('/operations/test-email', async (req: Request, res: Response) => {
    const parsed = testEmailSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({ error: 'E-mail inválido' })
    }
    if (!isMailConfigured(config.mail)) {
      return res.status(503).json({
        sent: false,
        reason: 'email_not_configured',
        provider: config.mail.provider,
        error: 'Serviço de e-mail não configurado.',
      })
    }
    const stamp = new Date().toISOString()
    const mailResult = await sendAuthEmail(
      config,
      'admin-test-email',
      () =>
        mail.sendBusinessEmail({
          to: parsed.data.to,
          subject: `PropEZ teste de e-mail ${stamp}`,
          html: `<p>Teste de envio PropEZ em <strong>${stamp}</strong>.</p><p>Provedor: <code>${config.mail.provider}</code></p>`,
          tag: 'admin-test-email',
        }),
    )
    if (isAuthMailFailure(mailResult)) {
      return respondAuthMailFailure(res, config, mailResult)
    }
    return res.json({
      sent: true,
      to: parsed.data.to,
      provider: config.mail.provider,
    })
  })

  // ==========================================================================
  // DELETE /api/admin/users/:id
  // ==========================================================================
  router.delete('/users/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    try {
      const { rows } = await pool.query<{
        id: string
        is_platform_admin: boolean
      }>(
        `SELECT id, is_platform_admin FROM users WHERE id = $1`,
        [req.params.id],
      )
      const target = rows[0]
      if (!target) return res.status(404).json({ error: 'Usuário não encontrado' })

      const adminCountRes = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM users WHERE is_platform_admin = true`,
      )
      const platformAdminCount = Number(adminCountRes.rows[0]?.count ?? 0)

      const check = canDeleteUser({
        targetUserId: target.id,
        actingUserId: req.auth.userId,
        targetIsPlatformAdmin: target.is_platform_admin,
        platformAdminCount,
      })
      if (!check.ok) return res.status(400).json({ error: 'error' in check ? check.error : 'Não é possível excluir o usuário.' })

      await pool.query(`DELETE FROM users WHERE id = $1`, [req.params.id])
      return res.json({ ok: true })
    } catch (err) {
      console.error('[admin/users/delete] erro:', err)
      return res.status(500).json({ error: 'Erro ao excluir usuário' })
    }
  })

  // ==========================================================================
  // DELETE /api/admin/organizations/:id
  // ==========================================================================
  router.delete('/organizations/:id', async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{
        id: string
        stripe_subscription_id: string | null
      }>(
        `SELECT id, stripe_subscription_id FROM organizations WHERE id = $1`,
        [req.params.id],
      )
      const org = rows[0]
      if (!org) return res.status(404).json({ error: 'Organização não encontrada' })

      if (org.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(org.stripe_subscription_id)
        } catch (err) {
          console.error('[admin/orgs/delete] stripe cancel falhou:', err)
          return res.status(502).json({
            error: 'Não foi possível cancelar a assinatura Stripe. Tente novamente ou cancele manualmente.',
          })
        }
      }

      await pool.query(`DELETE FROM organizations WHERE id = $1`, [req.params.id])
      return res.json({ ok: true })
    } catch (err) {
      console.error('[admin/orgs/delete] erro:', err)
      return res.status(500).json({ error: 'Erro ao excluir organização' })
    }
  })

  // ==========================================================================
  // GET /api/admin/subscriptions — assinaturas (orgs com Stripe)
  // ==========================================================================
  router.get('/subscriptions', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{
        id: string
        name: string
        plan: string | null
        billing_cycle: string | null
        plan_started_at: Date | null
        plan_renews_at: Date | null
        trial_ends_at: Date | null
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        created_at: Date
      }>(
        `SELECT id, name, plan, billing_cycle, plan_started_at, plan_renews_at,
                trial_ends_at, stripe_customer_id, stripe_subscription_id, created_at
         FROM organizations
         WHERE plan <> 'free' OR stripe_subscription_id IS NOT NULL OR trial_ends_at IS NOT NULL
         ORDER BY plan_renews_at NULLS LAST, created_at DESC`,
      )
      return res.json(
        rows.map((o) => {
          const active = isOrgActive({
            plan: o.plan,
            stripe_subscription_id: o.stripe_subscription_id,
            trial_ends_at: o.trial_ends_at,
          })
          let status: 'active' | 'trial' | 'inactive' = 'inactive'
          if (active) {
            status = o.trial_ends_at && (!o.stripe_subscription_id || o.plan === 'free') ? 'trial' : 'active'
          }
          return {
            organizationId: o.id,
            organizationName: o.name,
            plan: o.plan,
            billingCycle: o.billing_cycle,
            status,
            mrr: active ? monthlyEquivalent(o.plan, o.billing_cycle) : 0,
            planStartedAt: o.plan_started_at,
            planRenewsAt: o.plan_renews_at,
            trialEndsAt: o.trial_ends_at,
            stripeCustomerId: o.stripe_customer_id,
            stripeSubscriptionId: o.stripe_subscription_id,
            createdAt: o.created_at,
          }
        }),
      )
    } catch (err) {
      console.error('[admin/subscriptions] erro:', err)
      return res.status(500).json({ error: 'Erro ao listar assinaturas' })
    }
  })

  return router
}
