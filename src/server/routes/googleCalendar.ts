/**
 * Rotas Google Calendar — conectar agenda, listar eventos, desconectar.
 */
import crypto from 'node:crypto'
import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserInfo,
  getGoogleCalendarRedirectUri,
  loadGoogleOAuthConfig,
} from '../auth/googleOAuth.js'
import { createGoogleCalendarService } from '../integrations/googleCalendar.js'
import { decryptSecret } from '../lib/secretCrypto.js'

const GCAL_STATE_COOKIE = 'propez_gcal_oauth_state'

function setShortCookie(res: Response, name: string, value: string): void {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  })
}

function agendaRedirect(config: EnvironmentConfig, query = ''): string {
  const base = config.appUrl.replace(/\/$/, '')
  const qs = query ? `?route=agenda&${query}` : '?route=agenda'
  return `${base}/app${qs}`
}

export function createGoogleCalendarRouter(deps: { pool: Pool; config: EnvironmentConfig }): Router {
  const router = express.Router()
  const { pool, config } = deps
  const requireAuth = buildRequireAuth(config.auth)
  const calendar = createGoogleCalendarService(pool)

  router.get('/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const status = await calendar.getGoogleCalendarStatus(req.auth!.userId)
      return res.json(status)
    } catch (e) {
      console.error('[google-calendar/status] erro:', e)
      return res.status(500).json({ error: 'Erro ao verificar agenda' })
    }
  })

  router.get('/connect', requireAuth, (_req: Request, res: Response) => {
    const oauth = loadGoogleOAuthConfig()
    if (!oauth) {
      return res.redirect(agendaRedirect(config, 'error=oauth_not_configured'))
    }

    const state = crypto.randomBytes(24).toString('base64url')
    setShortCookie(res, GCAL_STATE_COOKIE, state)

    const url = buildGoogleAuthUrl({
      config: oauth,
      redirectUri: getGoogleCalendarRedirectUri(oauth),
      state,
    })
    return res.redirect(url)
  })

  router.get('/callback', requireAuth, async (req: Request, res: Response) => {
    const oauth = loadGoogleOAuthConfig()
    if (!oauth) {
      return res.redirect(agendaRedirect(config, 'error=oauth_not_configured'))
    }

    const error = typeof req.query.error === 'string' ? req.query.error : ''
    if (error) {
      res.clearCookie(GCAL_STATE_COOKIE, { path: '/' })
      return res.redirect(agendaRedirect(config, 'error=oauth_denied'))
    }

    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    if (!code) {
      res.clearCookie(GCAL_STATE_COOKIE, { path: '/' })
      return res.redirect(agendaRedirect(config, 'error=oauth_failed'))
    }

    const expectedState = req.cookies?.[GCAL_STATE_COOKIE]
    res.clearCookie(GCAL_STATE_COOKIE, { path: '/' })

    if (!expectedState || expectedState !== state) {
      return res.redirect(agendaRedirect(config, 'error=oauth_failed'))
    }

    try {
      const redirectUri = getGoogleCalendarRedirectUri(oauth)
      const tokens = await exchangeCodeForTokens(oauth, code, redirectUri)
      const accessToken = tokens.access_token
      if (!accessToken) {
        return res.redirect(agendaRedirect(config, 'error=oauth_failed'))
      }

      const userinfo = await fetchGoogleUserInfo(accessToken)
      const email = (userinfo.email || req.auth!.email || '').toLowerCase()
      if (!email) {
        return res.redirect(agendaRedirect(config, 'error=oauth_failed'))
      }

      await calendar.saveGoogleCalendarConnection(req.auth!.userId, {
        googleSub: userinfo.sub ?? null,
        googleEmail: email,
        refreshToken: tokens.refresh_token ?? null,
        accessToken: tokens.access_token ?? null,
        expiresIn: tokens.expires_in ?? null,
        scopes: tokens.scope ?? null,
        source: 'manual_connect',
      })

      return res.redirect(agendaRedirect(config, 'connected=1'))
    } catch (e) {
      console.error('[google-calendar/callback] erro:', e)
      return res.redirect(agendaRedirect(config, 'error=save_failed'))
    }
  })

  router.get('/events', requireAuth, async (req: Request, res: Response) => {
    const timeMin = typeof req.query.timeMin === 'string' ? req.query.timeMin : ''
    const timeMax = typeof req.query.timeMax === 'string' ? req.query.timeMax : ''

    if (!timeMin || !timeMax) {
      return res.status(400).json({ error: 'timeMin e timeMax são obrigatórios (ISO 8601)' })
    }

    try {
      const events = await calendar.listGoogleCalendarEvents(req.auth!.userId, timeMin, timeMax)
      return res.json({ events })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao buscar eventos'
      if (message.includes('não conectada')) {
        return res.status(404).json({ error: message, code: 'not_connected' })
      }
      console.error('[google-calendar/events] erro:', e)
      return res.status(500).json({ error: 'Erro ao buscar eventos da agenda' })
    }
  })

  router.delete('/disconnect', requireAuth, async (req: Request, res: Response) => {
    try {
      const row = await pool.query<{ refresh_token_encrypted: string }>(
        `SELECT refresh_token_encrypted FROM user_google_calendar_connections
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [req.auth!.userId],
      )
      if (row.rows[0]?.refresh_token_encrypted) {
        try {
          const refresh = decryptSecret(row.rows[0].refresh_token_encrypted)
          await calendar.revokeGoogleToken(refresh)
        } catch {
          // ignore
        }
      }
      await calendar.disconnectGoogleCalendar(req.auth!.userId)
      return res.json({ ok: true })
    } catch (e) {
      console.error('[google-calendar/disconnect] erro:', e)
      return res.status(500).json({ error: 'Erro ao desconectar agenda' })
    }
  })

  return router
}
