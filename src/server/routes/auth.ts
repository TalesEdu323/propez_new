import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import {
  createOpaqueToken,
  createRefreshToken,
  generateEmailCode,
  hashToken,
  signAccessToken,
} from '../auth/tokens.js'
import {
  accessCookieName,
  clearAuthCookies,
  refreshCookieName,
  setAccessCookie,
  setRefreshCookie,
} from '../auth/cookies.js'
import { buildRequireAuth } from '../auth/middleware.js'
import type { MailClient } from '../mail/resend.js'
import { seedOrgDefaults } from '../db/seedDefaults.js'

const EMAIL_CODE_TTL_MINUTES = 15
const RESET_TOKEN_TTL_MINUTES = 30

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6),
})

const resendSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(200),
})

const switchOrgSchema = z.object({
  organizationId: z.string().uuid(),
})

export function createAuthRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
  mail: MailClient
}): Router {
  const { pool, config, mail } = deps
  const router = express.Router()
  const requireAuth = buildRequireAuth(config.auth)

  async function issueTokensForUser(input: {
    res: Response
    userId: string
    name: string
    email: string
    orgId: string
    role: 'owner' | 'admin' | 'member'
    userAgent: string | undefined
    ip: string | undefined
  }): Promise<void> {
    const { res, userId, orgId, role, name, email, userAgent, ip } = input
    const access = signAccessToken(
      { sub: userId, org: orgId, role, name, email },
      config.auth,
    )
    const { token: refresh, hash: refreshHash } = createRefreshToken()
    const expiresAt = new Date(Date.now() + config.auth.refreshTtlSeconds * 1000)
    await pool.query(
      `INSERT INTO sessions (user_id, current_org_id, refresh_token_hash, user_agent, ip, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, orgId, refreshHash, userAgent ?? null, ip ?? null, expiresAt],
    )
    setAccessCookie(res, access, config.auth)
    setRefreshCookie(res, refresh, config.auth)
  }

  async function getActiveMembership(
    userId: string,
    orgId: string,
  ): Promise<{ organization_id: string; role: 'owner' | 'admin' | 'member' } | null> {
    const { rows } = await pool.query<{
      organization_id: string
      role: 'owner' | 'admin' | 'member'
    }>(
      `SELECT organization_id, role FROM memberships WHERE user_id = $1 AND organization_id = $2`,
      [userId, orgId],
    )
    return rows[0] ?? null
  }

  async function getPrimaryMembership(userId: string): Promise<{
    organization_id: string
    role: 'owner' | 'admin' | 'member'
  } | null> {
    const { rows } = await pool.query<{
      organization_id: string
      role: 'owner' | 'admin' | 'member'
    }>(
      `SELECT organization_id, role FROM memberships
       WHERE user_id = $1
       ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, created_at ASC
       LIMIT 1`,
      [userId],
    )
    return rows[0] ?? null
  }

  // --------------------------------------------------------------------------
  // POST /api/auth/register
  // --------------------------------------------------------------------------
  router.post('/auth/register', async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    }
    const { email, password, name, company } = parsed.data

    try {
      const existing = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [email],
      )
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email já cadastrado' })
      }

      const passwordHash = await hashPassword(password)
      const code = generateEmailCode()
      const codeHash = hashToken(code)
      const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60_000)

      const client = await pool.connect()
      let userId = ''
      try {
        await client.query('BEGIN')
        const userRes = await client.query<{ id: string }>(
          `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id`,
          [email, passwordHash, name],
        )
        userId = userRes.rows[0].id
        const orgRes = await client.query<{ id: string }>(
          `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
          [company],
        )
        const orgId = orgRes.rows[0].id
        await client.query(
          `INSERT INTO memberships (user_id, organization_id, role) VALUES ($1, $2, 'owner')`,
          [userId, orgId],
        )
        await seedOrgDefaults(client, orgId)
        await client.query(
          `INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
          [userId, codeHash, expiresAt],
        )
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
      } finally {
        client.release()
      }

      try {
        await mail.sendVerificationEmail({ to: email, name, code })
      } catch (err) {
        console.error('[auth/register] send verification email failed:', err)
      }

      return res.status(201).json({ userId, email, requiresVerification: true })
    } catch (err) {
      console.error('[auth/register] erro:', err)
      return res.status(500).json({ error: 'Erro ao criar conta' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/verify-email
  // --------------------------------------------------------------------------
  router.post('/auth/verify-email', async (req: Request, res: Response) => {
    const parsed = verifyEmailSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    }
    const { email, code } = parsed.data
    const codeHash = hashToken(code)

    try {
      const user = await pool.query<{ id: string; name: string; email: string; email_verified_at: string | null }>(
        `SELECT id, name, email, email_verified_at FROM users WHERE LOWER(email) = LOWER($1)`,
        [email],
      )
      const u = user.rows[0]
      if (!u) return res.status(404).json({ error: 'Email não encontrado' })
      if (u.email_verified_at) return res.status(200).json({ alreadyVerified: true })

      const verification = await pool.query<{ id: string; expires_at: string; attempts: number }>(
        `SELECT id, expires_at, attempts FROM email_verifications
         WHERE user_id = $1 AND code_hash = $2 AND consumed_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [u.id, codeHash],
      )
      const v = verification.rows[0]
      if (!v) {
        await pool.query(
          `UPDATE email_verifications SET attempts = attempts + 1
           WHERE user_id = $1 AND consumed_at IS NULL`,
          [u.id],
        )
        return res.status(400).json({ error: 'Código inválido' })
      }
      if (new Date(v.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Código expirado' })
      }

      await pool.query(
        `UPDATE email_verifications SET consumed_at = NOW() WHERE id = $1`,
        [v.id],
      )
      await pool.query(
        `UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
        [u.id],
      )

      const membership = await getPrimaryMembership(u.id)
      if (!membership) {
        return res.status(500).json({ error: 'Conta sem organização' })
      }

      await issueTokensForUser({
        res,
        userId: u.id,
        name: u.name,
        email: u.email,
        orgId: membership.organization_id,
        role: membership.role,
        userAgent: req.headers['user-agent'] as string | undefined,
        ip: req.ip,
      })

      return res.json({ verified: true })
    } catch (err) {
      console.error('[auth/verify-email] erro:', err)
      return res.status(500).json({ error: 'Erro ao verificar email' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/resend-verification
  // --------------------------------------------------------------------------
  router.post('/auth/resend-verification', async (req: Request, res: Response) => {
    const parsed = resendSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Email inválido' })
    const { email } = parsed.data
    try {
      const user = await pool.query<{ id: string; name: string; email: string; email_verified_at: string | null }>(
        `SELECT id, name, email, email_verified_at FROM users WHERE LOWER(email) = LOWER($1)`,
        [email],
      )
      const u = user.rows[0]
      if (!u) return res.json({ sent: true })
      if (u.email_verified_at) return res.json({ alreadyVerified: true })

      const code = generateEmailCode()
      const codeHash = hashToken(code)
      const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60_000)
      await pool.query(
        `INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
        [u.id, codeHash, expiresAt],
      )
      try {
        await mail.sendVerificationEmail({ to: u.email, name: u.name, code })
      } catch (err) {
        console.error('[auth/resend-verification] email falhou:', err)
      }
      return res.json({ sent: true })
    } catch (err) {
      console.error('[auth/resend-verification] erro:', err)
      return res.status(500).json({ error: 'Erro ao reenviar código' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/login
  // --------------------------------------------------------------------------
  router.post('/auth/login', async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const { email, password } = parsed.data

    try {
      const userRes = await pool.query<{
        id: string
        name: string
        email: string
        password_hash: string
        email_verified_at: string | null
      }>(
        `SELECT id, name, email, password_hash, email_verified_at
         FROM users WHERE LOWER(email) = LOWER($1)`,
        [email],
      )
      const u = userRes.rows[0]
      if (!u) return res.status(401).json({ error: 'Credenciais inválidas' })
      const ok = await verifyPassword(password, u.password_hash)
      if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' })
      if (!u.email_verified_at) {
        return res.status(403).json({ error: 'Email não verificado', reason: 'email_not_verified' })
      }

      const membership = await getPrimaryMembership(u.id)
      if (!membership) return res.status(500).json({ error: 'Conta sem organização' })

      await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [u.id])

      await issueTokensForUser({
        res,
        userId: u.id,
        name: u.name,
        email: u.email,
        orgId: membership.organization_id,
        role: membership.role,
        userAgent: req.headers['user-agent'] as string | undefined,
        ip: req.ip,
      })

      return res.json({ user: { id: u.id, name: u.name, email: u.email } })
    } catch (err) {
      console.error('[auth/login] erro:', err)
      return res.status(500).json({ error: 'Erro ao entrar' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/logout
  // --------------------------------------------------------------------------
  router.post('/auth/logout', async (req: Request, res: Response) => {
    const refresh = req.cookies?.[refreshCookieName(config.auth)]
    if (refresh && typeof refresh === 'string') {
      const h = hashToken(refresh)
      await pool
        .query(
          `UPDATE sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
          [h],
        )
        .catch((err) => console.error('[auth/logout] revoke failed:', err))
    }
    clearAuthCookies(res, config.auth)
    return res.json({ ok: true })
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/refresh
  // --------------------------------------------------------------------------
  router.post('/auth/refresh', async (req: Request, res: Response) => {
    const refresh = req.cookies?.[refreshCookieName(config.auth)]
    if (!refresh || typeof refresh !== 'string') {
      return res.status(401).json({ error: 'Sem sessão' })
    }
    const h = hashToken(refresh)
    try {
      const { rows } = await pool.query<{
        id: string
        user_id: string
        current_org_id: string | null
        expires_at: string
      }>(
        `SELECT id, user_id, current_org_id, expires_at FROM sessions
         WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
        [h],
      )
      const s = rows[0]
      if (!s) {
        clearAuthCookies(res, config.auth)
        return res.status(401).json({ error: 'Sessão inválida' })
      }
      if (new Date(s.expires_at).getTime() < Date.now()) {
        await pool.query(`UPDATE sessions SET revoked_at = NOW() WHERE id = $1`, [s.id])
        clearAuthCookies(res, config.auth)
        return res.status(401).json({ error: 'Sessão expirada' })
      }

      const uRes = await pool.query<{ id: string; name: string; email: string }>(
        `SELECT id, name, email FROM users WHERE id = $1`,
        [s.user_id],
      )
      const u = uRes.rows[0]
      if (!u) {
        clearAuthCookies(res, config.auth)
        return res.status(401).json({ error: 'Utilizador não encontrado' })
      }

      let membership: { organization_id: string; role: 'owner' | 'admin' | 'member' } | null = null
      if (s.current_org_id) {
        membership = await getActiveMembership(u.id, s.current_org_id)
      }
      if (!membership) {
        membership = await getPrimaryMembership(u.id)
      }
      if (!membership) {
        clearAuthCookies(res, config.auth)
        return res.status(401).json({ error: 'Sem membership' })
      }

      const newAccess = signAccessToken(
        { sub: u.id, org: membership.organization_id, role: membership.role, name: u.name, email: u.email },
        config.auth,
      )
      setAccessCookie(res, newAccess, config.auth)
      await pool.query(
        `UPDATE sessions SET last_used_at = NOW(), current_org_id = $2 WHERE id = $1`,
        [s.id, membership.organization_id],
      )
      return res.json({ ok: true, organizationId: membership.organization_id })
    } catch (err) {
      console.error('[auth/refresh] erro:', err)
      return res.status(500).json({ error: 'Erro ao renovar sessão' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/forgot-password
  // --------------------------------------------------------------------------
  router.post('/auth/forgot-password', async (req: Request, res: Response) => {
    const parsed = forgotSchema.safeParse(req.body)
    if (!parsed.success) return res.json({ sent: true })
    const { email } = parsed.data
    try {
      const userRes = await pool.query<{ id: string; name: string; email: string }>(
        `SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)`,
        [email],
      )
      const u = userRes.rows[0]
      if (!u) return res.json({ sent: true })

      const token = createOpaqueToken(24)
      const tokenHash = hashToken(token)
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000)
      await pool.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [u.id, tokenHash, expiresAt],
      )

      const resetUrl = `${config.appUrl.replace(/\/+$/, '')}/?route=reset-password&token=${encodeURIComponent(token)}`
      try {
        await mail.sendPasswordResetEmail({ to: u.email, name: u.name, resetUrl })
      } catch (err) {
        console.error('[auth/forgot-password] email falhou:', err)
      }
      return res.json({ sent: true })
    } catch (err) {
      console.error('[auth/forgot-password] erro:', err)
      return res.json({ sent: true })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/reset-password
  // --------------------------------------------------------------------------
  router.post('/auth/reset-password', async (req: Request, res: Response) => {
    const parsed = resetSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const { token, password } = parsed.data
    const tokenHash = hashToken(token)

    try {
      const resetRes = await pool.query<{ id: string; user_id: string; expires_at: string; consumed_at: string | null }>(
        `SELECT id, user_id, expires_at, consumed_at FROM password_resets WHERE token_hash = $1`,
        [tokenHash],
      )
      const r = resetRes.rows[0]
      if (!r || r.consumed_at) return res.status(400).json({ error: 'Token inválido' })
      if (new Date(r.expires_at).getTime() < Date.now()) return res.status(400).json({ error: 'Token expirado' })

      const passwordHash = await hashPassword(password)
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, r.user_id])
      await pool.query(`UPDATE password_resets SET consumed_at = NOW() WHERE id = $1`, [r.id])
      await pool.query(`UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, [r.user_id])

      return res.json({ ok: true })
    } catch (err) {
      console.error('[auth/reset-password] erro:', err)
      return res.status(500).json({ error: 'Erro ao redefinir senha' })
    }
  })

  // --------------------------------------------------------------------------
  // GET /api/auth/me
  // --------------------------------------------------------------------------
  router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    try {
      const { rows: userRows } = await pool.query<{
        id: string
        name: string
        email: string
        email_verified_at: string | null
      }>(`SELECT id, name, email, email_verified_at FROM users WHERE id = $1`, [req.auth.userId])
      const user = userRows[0]
      if (!user) return res.status(401).json({ error: 'Não autenticado' })

      const { rows: orgRows } = await pool.query<{
        id: string
        name: string
        cnpj: string | null
        logo_url: string | null
        signature_url: string | null
        plan: string
        billing_cycle: string | null
        trial_ends_at: string | null
        plan_started_at: string | null
        plan_renews_at: string | null
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        onboarded: boolean
        role: 'owner' | 'admin' | 'member'
      }>(
        `SELECT o.id, o.name, o.cnpj, o.logo_url, o.signature_url, o.plan, o.billing_cycle,
                o.trial_ends_at, o.plan_started_at, o.plan_renews_at,
                o.stripe_customer_id, o.stripe_subscription_id, o.onboarded, m.role
         FROM organizations o
         JOIN memberships m ON m.organization_id = o.id AND m.user_id = $1
         WHERE o.id = $2`,
        [user.id, req.auth.orgId],
      )
      const org = orgRows[0]
      if (!org) return res.status(401).json({ error: 'Sem acesso à organização' })

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerifiedAt: user.email_verified_at,
        },
        organization: {
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
        },
      })
    } catch (err) {
      console.error('[auth/me] erro:', err)
      return res.status(500).json({ error: 'Erro ao carregar perfil' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/switch-org
  // --------------------------------------------------------------------------
  router.post('/auth/switch-org', requireAuth, async (req: Request, res: Response) => {
    const parsed = switchOrgSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    const membership = await getActiveMembership(req.auth.userId, parsed.data.organizationId)
    if (!membership) return res.status(403).json({ error: 'Sem acesso' })

    const refresh = req.cookies?.[refreshCookieName(config.auth)]
    if (refresh && typeof refresh === 'string') {
      await pool.query(
        `UPDATE sessions SET current_org_id = $2, last_used_at = NOW()
         WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
        [hashToken(refresh), membership.organization_id],
      )
    }
    const newAccess = signAccessToken(
      {
        sub: req.auth.userId,
        org: membership.organization_id,
        role: membership.role,
        name: req.auth.name,
        email: req.auth.email,
      },
      config.auth,
    )
    setAccessCookie(res, newAccess, config.auth)
    return res.json({ organizationId: membership.organization_id, role: membership.role })
  })

  return router
}

// Re-exporta para evitar import implícito em outros módulos.
export { accessCookieName }
