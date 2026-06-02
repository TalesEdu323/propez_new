import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { hashPassword, verifyPassword } from '../auth/password.js'
import {
  createRefreshToken,
  generateEmailCode,
  hashToken,
  signAccessToken,
} from '../auth/tokens.js'
import { getPrimaryMembership, issueTokensForUser as issueSessionTokens } from '../auth/issueSession.js'
import {
  accessCookieName,
  clearAuthCookies,
  refreshCookieName,
  setAccessCookie,
  setRefreshCookie,
} from '../auth/cookies.js'
import { buildRequireAuth } from '../auth/middleware.js'
import type { MailClient } from '../mail/resend.js'
import { isAuthMailFailure, respondAuthMailFailure, sendAuthEmail } from '../mail/authMail.js'
import {
  EMAIL_CODE_TTL_MINUTES,
  issueEmailChangeRequest,
  issueEmailVerification,
  issuePasswordReset,
} from '../services/authMailService.js'
import type { SuiteLookupClient } from '../clients/suiteLookup.js'

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
  affiliateCode: z.string().trim().max(40).optional(),
  affiliateSessionId: z.string().trim().max(120).optional(),
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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
})

const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
})

const confirmEmailChangeSchema = z.object({
  code: z.string().trim().length(6),
})

export function createAuthRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
  mail: MailClient
  /**
   * Cliente da suíte Taggo: descobre se o email já tem conta no
   * ProSync/Rubrica para vincular automaticamente. Opcional — quando ausente
   * (sem TAGGO_SUITE_SECRET) o registro segue normal sem lookup.
   */
  suiteLookup?: SuiteLookupClient
}): Router {
  const { pool, config, mail, suiteLookup } = deps
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
    await issueSessionTokens({ pool, config: config.auth, ...input })
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

  async function getPrimaryMembershipForUser(userId: string): Promise<{
    organization_id: string
    role: 'owner' | 'admin' | 'member'
  } | null> {
    return getPrimaryMembership(pool, userId)
  }

  // --------------------------------------------------------------------------
  // POST /api/auth/register
  // --------------------------------------------------------------------------
  router.post('/auth/register', async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    }
    const { email, password, name, company, affiliateCode, affiliateSessionId } = parsed.data

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
      let orgId = ''
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
        orgId = orgRes.rows[0].id
        await client.query(
          `INSERT INTO memberships (user_id, organization_id, role) VALUES ($1, $2, 'owner')`,
          [userId, orgId],
        )
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

      if (affiliateCode && orgId) {
        await attributeOrganizationToAffiliate(pool, orgId, affiliateCode, affiliateSessionId);
      }

      const mailResult = await sendAuthEmail(
        config,
        'register',
        () => mail.sendVerificationEmail({ to: email, name, code }),
        `código de verificação para ${email}: ${code}`,
      )
      if (isAuthMailFailure(mailResult)) {
        if (config.mail.required) {
          return respondAuthMailFailure(res, config, mailResult)
        }
      }

      // Descoberta cross-app na suíte Taggo: pergunta ao ProSync/Rubrica se
      // este email já tem conta. Best-effort, não bloqueia o cadastro. O
      // resultado é apenas logado por agora; a Fase 1 (service-token) usa
      // essa informação para vincular contas automaticamente.
      if (suiteLookup?.isEnabled()) {
        void suiteLookup
          .lookupAll({ email, password })
          .then((results) => {
            for (const r of results) {
              if (r.ok && r.exists) {
                console.info(
                  `[auth/register] suite-lookup ${r.app}: exists=true userId=${r.userId} org=${r.organizationId} pwOk=${r.passwordMatches}`,
                )
              } else if (!r.ok) {
                console.warn(`[auth/register] suite-lookup ${r.app} indisponível:`, r.error)
              }
            }
          })
          .catch((err) => console.error('[auth/register] suite-lookup falhou:', err))
      }

      return res.status(201).json({
        userId,
        email,
        requiresVerification: true,
        emailSent: mailResult.ok,
        ...(mailResult.ok || config.nodeEnv === 'production'
          ? {}
          : { devVerificationCode: code }),
      })
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

      const membership = await getPrimaryMembershipForUser(u.id)
      if (!membership) {
        return res.status(403).json({ error: 'Conta sem organização' })
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

      const mailResult = await issueEmailVerification(pool, config, mail, u.id)
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
        password_hash: string | null
        email_verified_at: string | null
        is_platform_admin: boolean
      }>(
        `SELECT id, name, email, password_hash, email_verified_at, is_platform_admin
         FROM users WHERE LOWER(email) = LOWER($1)`,
        [email],
      )
      const u = userRes.rows[0]
      if (!u) return res.status(401).json({ error: 'Credenciais inválidas' })
      if (!u.password_hash) {
        return res.status(401).json({ error: 'Use Entrar com Google para esta conta' })
      }
      const ok = await verifyPassword(password, u.password_hash)
      if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' })
      if (!u.email_verified_at) {
        return res.status(403).json({ error: 'Email não verificado', reason: 'email_not_verified' })
      }

      const membership = await getPrimaryMembershipForUser(u.id)
      if (!membership) return res.status(403).json({ error: 'Conta sem organização' })

      await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [u.id])

      const { trackProductEvent } = await import('../services/productEvents.js')
      void trackProductEvent(pool, {
        organizationId: membership.organization_id,
        userId: u.id,
        eventName: 'login',
      })

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

      const isPlatformAdmin =
        u.is_platform_admin === true ||
        config.platformAdminEmails.includes((u.email || '').toLowerCase())

      return res.json({
        user: { id: u.id, name: u.name, email: u.email, isPlatformAdmin },
      })
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
        membership = await getPrimaryMembershipForUser(u.id)
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

      const mailResult = await issuePasswordReset(pool, config, mail, u.id)
      if (isAuthMailFailure(mailResult)) {
        if (config.mail.required) {
          return respondAuthMailFailure(res, config, mailResult)
        }
        return res.json({ sent: false, reason: mailResult.reason })
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
        is_platform_admin: boolean
        password_hash: string | null
      }>(
        `SELECT id, name, email, email_verified_at, is_platform_admin, password_hash
         FROM users WHERE id = $1`,
        [req.auth.userId],
      )
      const user = userRows[0]
      if (!user) return res.status(401).json({ error: 'Não autenticado' })
      const isPlatformAdmin =
        user.is_platform_admin === true ||
        config.platformAdminEmails.includes((user.email || '').toLowerCase())

      const { rows: orgRows } = await pool.query<{
        id: string
        name: string
        cnpj: string | null
        logo_url: string | null
        signature_url: string | null
        primary_color: string | null
        secondary_color: string | null
        whitelabel_enabled: boolean
        plan: string
        billing_cycle: string | null
        trial_ends_at: string | null
        plan_started_at: string | null
        plan_renews_at: string | null
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        onboarded: boolean
        segment: string | null
        role: 'owner' | 'admin' | 'member'
      }>(
        `SELECT o.id, o.name, o.cnpj, o.logo_url, o.signature_url,
                o.primary_color, o.secondary_color, o.whitelabel_enabled,
                o.plan, o.billing_cycle,
                o.trial_ends_at, o.plan_started_at, o.plan_renews_at,
                o.stripe_customer_id, o.stripe_subscription_id, o.onboarded, o.segment, m.role
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
          isPlatformAdmin,
          hasPassword: user.password_hash != null,
        },
        organization: {
          id: org.id,
          name: org.name,
          cnpj: org.cnpj,
          logoUrl: org.logo_url,
          signatureUrl: org.signature_url,
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
          segment: (org.segment as import('../../lib/layoutContext.js').OfferType | null) ?? null,
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

  // --------------------------------------------------------------------------
  // POST /api/auth/change-password
  // --------------------------------------------------------------------------
  router.post('/auth/change-password', requireAuth, async (req: Request, res: Response) => {
    const parsed = changePasswordSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })

    try {
      const { rows } = await pool.query<{ password_hash: string | null }>(
        `SELECT password_hash FROM users WHERE id = $1`,
        [req.auth.userId],
      )
      const u = rows[0]
      if (!u?.password_hash) {
        return res.status(400).json({
          error: 'Esta conta usa Google. Use "Enviar link por e-mail" para definir uma senha.',
          reason: 'google_only',
        })
      }

      const ok = await verifyPassword(parsed.data.currentPassword, u.password_hash)
      if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' })

      const passwordHash = await hashPassword(parsed.data.newPassword)
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
        passwordHash,
        req.auth.userId,
      ])
      return res.json({ ok: true })
    } catch (err) {
      console.error('[auth/change-password] erro:', err)
      return res.status(500).json({ error: 'Erro ao alterar senha' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/send-password-reset-self
  // --------------------------------------------------------------------------
  router.post('/auth/send-password-reset-self', requireAuth, async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    try {
      const mailResult = await issuePasswordReset(pool, config, mail, req.auth.userId)
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
      console.error('[auth/send-password-reset-self] erro:', err)
      return res.status(500).json({ error: 'Erro ao enviar e-mail' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/request-email-change
  // --------------------------------------------------------------------------
  router.post('/auth/request-email-change', requireAuth, async (req: Request, res: Response) => {
    const parsed = requestEmailChangeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })

    const { newEmail, password } = parsed.data
    if (newEmail === req.auth.email.toLowerCase()) {
      return res.status(400).json({ error: 'O novo e-mail é igual ao atual' })
    }

    try {
      const { rows } = await pool.query<{ password_hash: string | null }>(
        `SELECT password_hash FROM users WHERE id = $1`,
        [req.auth.userId],
      )
      const u = rows[0]
      if (!u?.password_hash) {
        return res.status(400).json({
          error: 'Contas Google-only não podem alterar e-mail por senha. Contacte o suporte.',
          reason: 'google_only',
        })
      }
      const ok = await verifyPassword(password, u.password_hash)
      if (!ok) return res.status(401).json({ error: 'Senha incorreta' })

      const taken = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
        [newEmail, req.auth.userId],
      )
      if (taken.rows.length > 0) {
        return res.status(409).json({ error: 'Este e-mail já está em uso' })
      }

      const mailResult = await issueEmailChangeRequest(
        pool,
        config,
        mail,
        req.auth.userId,
        newEmail,
      )
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
      console.error('[auth/request-email-change] erro:', err)
      return res.status(500).json({ error: 'Erro ao solicitar alteração de e-mail' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/confirm-email-change
  // --------------------------------------------------------------------------
  router.post('/auth/confirm-email-change', requireAuth, async (req: Request, res: Response) => {
    const parsed = confirmEmailChangeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })

    const codeHash = hashToken(parsed.data.code)
    try {
      const { rows } = await pool.query<{
        id: string
        new_email: string
        expires_at: string
      }>(
        `SELECT id, new_email, expires_at FROM email_change_requests
         WHERE user_id = $1 AND code_hash = $2 AND consumed_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [req.auth.userId, codeHash],
      )
      const r = rows[0]
      if (!r) return res.status(400).json({ error: 'Código inválido' })
      if (new Date(r.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ error: 'Código expirado' })
      }

      const taken = await pool.query<{ id: string }>(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
        [r.new_email, req.auth.userId],
      )
      if (taken.rows.length > 0) {
        return res.status(409).json({ error: 'Este e-mail já está em uso' })
      }

      await pool.query(
        `UPDATE email_change_requests SET consumed_at = NOW() WHERE id = $1`,
        [r.id],
      )
      await pool.query(
        `UPDATE users SET email = $2, email_verified_at = NOW() WHERE id = $1`,
        [req.auth.userId, r.new_email],
      )

      const refresh = req.cookies?.[refreshCookieName(config.auth)]
      const currentRefreshHash =
        refresh && typeof refresh === 'string' ? hashToken(refresh) : null
      await pool.query(
        `UPDATE sessions SET revoked_at = NOW()
         WHERE user_id = $1 AND revoked_at IS NULL
         AND ($2::text IS NULL OR refresh_token_hash <> $2)`,
        [req.auth.userId, currentRefreshHash],
      )

      const newAccess = signAccessToken(
        {
          sub: req.auth.userId,
          org: req.auth.orgId,
          role: req.auth.role,
          name: req.auth.name,
          email: r.new_email,
        },
        config.auth,
      )
      setAccessCookie(res, newAccess, config.auth)

      return res.json({ ok: true, email: r.new_email })
    } catch (err) {
      console.error('[auth/confirm-email-change] erro:', err)
      return res.status(500).json({ error: 'Erro ao confirmar e-mail' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/auth/resend-verification-self
  // --------------------------------------------------------------------------
  router.post('/auth/resend-verification-self', requireAuth, async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    try {
      const mailResult = await issueEmailVerification(pool, config, mail, req.auth.userId)
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
      console.error('[auth/resend-verification-self] erro:', err)
      return res.status(500).json({ error: 'Erro ao reenviar verificação' })
    }
  })

  return router
}

// Re-exporta para evitar import implícito em outros módulos.
export { accessCookieName }
