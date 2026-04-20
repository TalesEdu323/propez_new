import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth, requireOrgRole } from '../auth/middleware.js'

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  cnpj: z.string().trim().max(32).optional().nullable(),
  logoUrl: z.string().max(500_000).optional().nullable(),
  signatureUrl: z.string().max(500_000).optional().nullable(),
  onboarded: z.boolean().optional(),
})

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
})

const roleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
})

export function createOrganizationsRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  const requireAuth = buildRequireAuth(config.auth)

  router.use(requireAuth)

  router.get('/current', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    try {
      const { rows } = await pool.query(
        `SELECT o.id, o.name, o.cnpj, o.logo_url, o.signature_url, o.plan, o.billing_cycle,
                o.trial_ends_at, o.plan_started_at, o.plan_renews_at,
                o.stripe_customer_id, o.stripe_subscription_id, o.onboarded, m.role
         FROM organizations o
         JOIN memberships m ON m.organization_id = o.id AND m.user_id = $1
         WHERE o.id = $2`,
        [req.auth.userId, req.auth.orgId],
      )
      const org = rows[0]
      if (!org) return res.status(404).json({ error: 'Organização não encontrada' })
      return res.json({
        id: org.id,
        name: org.name,
        cnpj: org.cnpj,
        logoUrl: org.logo_url,
        signatureUrl: org.signature_url,
        plan: org.plan,
        billingCycle: org.billing_cycle,
        trialEndsAt: org.trial_ends_at,
        planStartedAt: org.plan_started_at,
        planRenewsAt: org.plan_renews_at,
        stripeCustomerId: org.stripe_customer_id,
        stripeSubscriptionId: org.stripe_subscription_id,
        onboarded: org.onboarded,
        role: org.role,
      })
    } catch (err) {
      console.error('[orgs/current] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar organização' })
    }
  })

  router.patch('/current', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    if (req.auth.role === 'member') return res.status(403).json({ error: 'Permissão insuficiente' })

    const patch = parsed.data
    try {
      const { rows } = await pool.query(
        `UPDATE organizations SET
           name = COALESCE($2, name),
           cnpj = CASE WHEN $3::boolean THEN $4 ELSE cnpj END,
           logo_url = CASE WHEN $5::boolean THEN $6 ELSE logo_url END,
           signature_url = CASE WHEN $7::boolean THEN $8 ELSE signature_url END,
           onboarded = COALESCE($9, onboarded)
         WHERE id = $1
         RETURNING id, name, cnpj, logo_url, signature_url, plan, billing_cycle,
                   trial_ends_at, plan_started_at, plan_renews_at,
                   stripe_customer_id, stripe_subscription_id, onboarded`,
        [
          req.auth.orgId,
          patch.name ?? null,
          'cnpj' in patch,
          patch.cnpj ?? null,
          'logoUrl' in patch,
          patch.logoUrl ?? null,
          'signatureUrl' in patch,
          patch.signatureUrl ?? null,
          patch.onboarded ?? null,
        ],
      )
      const o = rows[0]
      return res.json({
        id: o.id,
        name: o.name,
        cnpj: o.cnpj,
        logoUrl: o.logo_url,
        signatureUrl: o.signature_url,
        plan: o.plan,
        billingCycle: o.billing_cycle,
        trialEndsAt: o.trial_ends_at,
        planStartedAt: o.plan_started_at,
        planRenewsAt: o.plan_renews_at,
        stripeCustomerId: o.stripe_customer_id,
        stripeSubscriptionId: o.stripe_subscription_id,
        onboarded: o.onboarded,
      })
    } catch (err) {
      console.error('[orgs/update] erro:', err)
      return res.status(500).json({ error: 'Erro ao atualizar organização' })
    }
  })

  router.get('/current/members', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    try {
      const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.email_verified_at, m.role, m.created_at
         FROM memberships m JOIN users u ON u.id = m.user_id
         WHERE m.organization_id = $1
         ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name ASC`,
        [req.auth.orgId],
      )
      return res.json(rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        emailVerifiedAt: r.email_verified_at,
        role: r.role,
        joinedAt: r.created_at,
      })))
    } catch (err) {
      console.error('[orgs/members] erro:', err)
      return res.status(500).json({ error: 'Erro ao listar membros' })
    }
  })

  router.post('/current/members', requireOrgRole('owner', 'admin'), async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = inviteSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const { email, role } = parsed.data
    try {
      const { rows } = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`,
        [email],
      )
      const target = rows[0]
      if (!target) {
        return res.status(404).json({ error: 'Usuário não encontrado. Peça para criar uma conta primeiro.' })
      }
      await pool.query(
        `INSERT INTO memberships (user_id, organization_id, role) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role`,
        [target.id, req.auth.orgId, role],
      )
      return res.status(201).json({ ok: true })
    } catch (err) {
      console.error('[orgs/invite] erro:', err)
      return res.status(500).json({ error: 'Erro ao adicionar membro' })
    }
  })

  router.patch('/current/members/:userId', requireOrgRole('owner', 'admin'), async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = roleSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    if (parsed.data.role === 'owner' && req.auth.role !== 'owner') {
      return res.status(403).json({ error: 'Só owner pode promover owner' })
    }
    try {
      await pool.query(
        `UPDATE memberships SET role = $3 WHERE organization_id = $1 AND user_id = $2`,
        [req.auth.orgId, req.params.userId, parsed.data.role],
      )
      return res.json({ ok: true })
    } catch (err) {
      console.error('[orgs/member/update] erro:', err)
      return res.status(500).json({ error: 'Erro ao atualizar membro' })
    }
  })

  router.delete('/current/members/:userId', requireOrgRole('owner', 'admin'), async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    try {
      await pool.query(
        `DELETE FROM memberships WHERE organization_id = $1 AND user_id = $2 AND role <> 'owner'`,
        [req.auth.orgId, req.params.userId],
      )
      return res.json({ ok: true })
    } catch (err) {
      console.error('[orgs/member/remove] erro:', err)
      return res.status(500).json({ error: 'Erro ao remover membro' })
    }
  })

  return router
}
