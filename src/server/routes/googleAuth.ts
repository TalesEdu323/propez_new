/**
 * Rotas OAuth Google — login social + conexão automática da agenda.
 */
import crypto from 'node:crypto'
import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import type { EnvironmentConfig } from '../env.js'
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  getGoogleAuthRedirectUri,
  loadGoogleOAuthConfig,
} from '../auth/googleOAuth.js'
import { getPrimaryMembership, issueTokensForUser } from '../auth/issueSession.js'
import { createGoogleCalendarService } from '../integrations/googleCalendar.js'

const STATE_COOKIE = 'propez_google_oauth_state'
const REDIRECT_COOKIE = 'propez_google_redirect'

function setShortCookie(res: Response, name: string, value: string): void {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  })
}

function clearShortCookies(res: Response): void {
  res.clearCookie(STATE_COOKIE, { path: '/' })
  res.clearCookie(REDIRECT_COOKIE, { path: '/' })
}

function loginErrorRedirect(config: EnvironmentConfig, error = 'oauth_failed'): string {
  const base = config.appUrl.replace(/\/$/, '')
  return `${base}/login?error=${error}`
}

export function createGoogleAuthRouter(deps: { pool: Pool; config: EnvironmentConfig }): Router {
  const router = express.Router()
  const { pool, config } = deps
  const calendar = createGoogleCalendarService(pool)

  router.get('/auth/google/status', (_req, res) => {
    res.json({ enabled: !!loadGoogleOAuthConfig() })
  })

  router.get('/auth/google', (req: Request, res: Response) => {
    const oauth = loadGoogleOAuthConfig()
    if (!oauth) {
      return res.redirect(loginErrorRedirect(config, 'oauth_not_configured'))
    }

    const state = crypto.randomBytes(24).toString('base64url')
    setShortCookie(res, STATE_COOKIE, state)

    const redirectAfter = typeof req.query.redirect === 'string' ? req.query.redirect : '/app'
    if (redirectAfter.startsWith('/')) {
      setShortCookie(res, REDIRECT_COOKIE, redirectAfter)
    }

    const url = buildGoogleAuthUrl({
      config: oauth,
      redirectUri: getGoogleAuthRedirectUri(oauth),
      state,
    })
    return res.redirect(url)
  })

  router.get('/auth/google/callback', async (req: Request, res: Response) => {
    const oauth = loadGoogleOAuthConfig()
    if (!oauth) {
      clearShortCookies(res)
      return res.redirect(loginErrorRedirect(config, 'oauth_not_configured'))
    }

    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    if (!code) {
      clearShortCookies(res)
      return res.redirect(loginErrorRedirect(config, 'oauth_failed'))
    }

    const expectedState = req.cookies?.[STATE_COOKIE]
    if (!expectedState || expectedState !== state) {
      clearShortCookies(res)
      return res.redirect(loginErrorRedirect(config, 'oauth_failed'))
    }

    try {
      const redirectUri = getGoogleAuthRedirectUri(oauth)
      const tokens = await exchangeCodeForTokens(oauth, code, redirectUri)
      const accessToken = tokens.access_token
      if (!accessToken) {
        clearShortCookies(res)
        return res.redirect(loginErrorRedirect(config, 'oauth_failed'))
      }

      const userinfo = await fetchGoogleUserInfo(accessToken)
      const sub = userinfo.sub
      const email = (userinfo.email || '').toLowerCase()
      const name = userinfo.name || email.split('@')[0] || 'Usuário'

      if (!sub || !email) {
        clearShortCookies(res)
        return res.redirect(loginErrorRedirect(config, 'oauth_failed'))
      }

      let userId: string
      let userName = name

      const byGoogle = await pool.query<{ id: string; name: string }>(
        `SELECT id, name FROM users WHERE auth_provider = 'google' AND auth_provider_id = $1 LIMIT 1`,
        [sub],
      )

      if (byGoogle.rows[0]) {
        userId = byGoogle.rows[0].id
        userName = byGoogle.rows[0].name
        await pool.query(
          `UPDATE users SET last_login_at = NOW(), name = COALESCE($2, name) WHERE id = $1`,
          [userId, name],
        )
      } else {
        const byEmail = await pool.query<{ id: string; name: string; auth_provider: string }>(
          `SELECT id, name, auth_provider FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [email],
        )

        if (byEmail.rows[0]) {
          userId = byEmail.rows[0].id
          userName = byEmail.rows[0].name
          if (byEmail.rows[0].auth_provider === 'email') {
            await pool.query(
              `UPDATE users SET auth_provider = 'google', auth_provider_id = $2,
               email_verified_at = COALESCE(email_verified_at, NOW()),
               name = COALESCE($3, name), last_login_at = NOW()
               WHERE id = $1`,
              [userId, sub, name],
            )
          } else {
            await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId])
          }
        } else {
          const client = await pool.connect()
          try {
            await client.query('BEGIN')
            const u = await client.query<{ id: string }>(
              `INSERT INTO users (email, password_hash, name, auth_provider, auth_provider_id, email_verified_at)
               VALUES ($1, NULL, $2, 'google', $3, NOW()) RETURNING id`,
              [email, name, sub],
            )
            userId = u.rows[0].id
            const o = await client.query<{ id: string }>(
              `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
              [name ? `Equipe ${name}` : `Equipe ${email}`],
            )
            await client.query(
              `INSERT INTO memberships (user_id, organization_id, role) VALUES ($1, $2, 'owner')`,
              [userId, o.rows[0].id],
            )
            await client.query('COMMIT')
          } catch (err) {
            await client.query('ROLLBACK').catch(() => {})
            throw err
          } finally {
            client.release()
          }
        }
      }

      if (tokens.refresh_token || tokens.access_token) {
        try {
          await calendar.saveGoogleCalendarConnection(userId, {
            googleSub: sub,
            googleEmail: email,
            refreshToken: tokens.refresh_token ?? null,
            accessToken: tokens.access_token ?? null,
            expiresIn: tokens.expires_in ?? null,
            scopes: tokens.scope ?? null,
            source: 'google_login',
          })
        } catch (e) {
          console.error('[google/callback] Falha ao salvar conexão Google Calendar:', e)
        }
      }

      const membership = await getPrimaryMembership(pool, userId)
      if (!membership) {
        clearShortCookies(res)
        return res.redirect(loginErrorRedirect(config, 'oauth_failed'))
      }

      await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [userId])

      await issueTokensForUser({
        pool,
        config: config.auth,
        res,
        userId,
        name: userName,
        email,
        orgId: membership.organization_id,
        role: membership.role,
        userAgent: req.headers['user-agent'] as string | undefined,
        ip: req.ip,
      })

      const dest = req.cookies?.[REDIRECT_COOKIE]
      clearShortCookies(res)

      const redirectTo =
        typeof dest === 'string' && dest.startsWith('/') ? dest : '/app'
      return res.redirect(`${config.appUrl.replace(/\/$/, '')}${redirectTo}`)
    } catch (err) {
      console.error('[google/callback] erro:', err)
      clearShortCookies(res)
      return res.redirect(loginErrorRedirect(config, 'oauth_failed'))
    }
  })

  return router
}
