/**
 * Rotas SSO Taggo no Propez:
 *
 *   GET /api/sso/start     — inicia o fluxo OIDC (state + PKCE em cookies)
 *   GET /api/sso/callback  — recebe o `code`, troca por tokens, abre sessão
 *   GET /api/sso/status    — devolve `{ enabled }` para a UI decidir mostrar
 *
 * Quando o IdP devolve o `id_token`, validamos a assinatura via JWKS público
 * e vinculamos a identidade Taggo (sub) ao usuário local do Propez. Se o
 * email já existir no banco, fazemos o link transparente; senão, criamos uma
 * conta + organização inicial.
 */
import crypto from 'node:crypto'
import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import type { EnvironmentConfig } from '../env.js'
import {
  buildAuthorizeUrl,
  base64UrlSha256,
  exchangeCodeForTokens,
  generateCodeVerifier,
  loadSsoConfig,
  verifyIdToken,
} from '../auth/taggoSso.js'
import {
  createRefreshToken,
  signAccessToken,
} from '../auth/tokens.js'
import {
  setAccessCookie,
  setRefreshCookie,
} from '../auth/cookies.js'
import { hashPassword } from '../auth/password.js'

const STATE_COOKIE = 'propez_sso_state'
const VERIFIER_COOKIE = 'propez_sso_pkce'
const POST_LOGIN_COOKIE = 'propez_sso_redirect'

function setShortCookie(res: Response, name: string, value: string): void {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000, // 5 minutos — só o tempo do round-trip OIDC
    path: '/',
  })
}

function clearShortCookies(res: Response): void {
  res.clearCookie(STATE_COOKIE, { path: '/' })
  res.clearCookie(VERIFIER_COOKIE, { path: '/' })
  res.clearCookie(POST_LOGIN_COOKIE, { path: '/' })
}

export function createSsoRouter(deps: { pool: Pool; config: EnvironmentConfig }): Router {
  const router = express.Router()
  const { pool, config } = deps

  router.get('/sso/status', (_req, res) => {
    const cfg = loadSsoConfig()
    res.json({ enabled: !!cfg })
  })

  router.get('/sso/start', (req: Request, res: Response) => {
    const cfg = loadSsoConfig()
    if (!cfg) {
      return res.status(503).json({ error: 'SSO Taggo não configurado' })
    }
    const state = crypto.randomBytes(24).toString('base64url')
    const verifier = generateCodeVerifier()
    const challenge = base64UrlSha256(verifier)

    setShortCookie(res, STATE_COOKIE, state)
    setShortCookie(res, VERIFIER_COOKIE, verifier)

    const redirectAfter = typeof req.query.redirect === 'string' ? req.query.redirect : '/app'
    if (redirectAfter.startsWith('/')) {
      setShortCookie(res, POST_LOGIN_COOKIE, redirectAfter)
    }

    const url = buildAuthorizeUrl(cfg, { state, codeChallenge: challenge })
    res.redirect(url)
  })

  router.get('/sso/callback', async (req: Request, res: Response) => {
    const cfg = loadSsoConfig()
    if (!cfg) {
      return res.status(503).json({ error: 'SSO Taggo não configurado' })
    }

    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    if (!code || !state) {
      clearShortCookies(res)
      return res.status(400).send('Parâmetros SSO ausentes')
    }

    const expectedState = req.cookies?.[STATE_COOKIE]
    const verifier = req.cookies?.[VERIFIER_COOKIE]
    if (!expectedState || expectedState !== state) {
      clearShortCookies(res)
      return res.status(400).send('SSO state inválido')
    }
    if (!verifier) {
      clearShortCookies(res)
      return res.status(400).send('SSO verifier ausente')
    }

    try {
      const tokens = await exchangeCodeForTokens(cfg, code, verifier)
      const claims = await verifyIdToken(cfg, tokens.id_token)

      const sub = String(claims.sub || '')
      const email = String(claims.email || '').toLowerCase()
      const name = String(claims.name || email || 'Usuário Taggo')

      if (!sub || !email) {
        clearShortCookies(res)
        return res.status(400).send('id_token sem sub/email')
      }

      // Vincula identidade Taggo → user local.
      const link = await pool.query<{ user_id: string }>(
        `SELECT user_id FROM taggo_identity_links WHERE identity_sub = $1 LIMIT 1`,
        [sub],
      ).catch(() => ({ rows: [] as { user_id: string }[] }))

      let userId: string
      let orgId: string
      let role: 'owner' | 'admin' | 'member'
      let userName = name

      if (link.rows[0]?.user_id) {
        userId = link.rows[0].user_id
        const m = await pool.query<{
          name: string
          email: string
          organization_id: string
          role: 'owner' | 'admin' | 'member'
        }>(
          `SELECT u.name, u.email,
                  COALESCE(
                    (SELECT m.organization_id FROM memberships m WHERE m.user_id = u.id
                     ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, m.created_at ASC LIMIT 1),
                    ''
                  ) AS organization_id,
                  COALESCE(
                    (SELECT m.role FROM memberships m WHERE m.user_id = u.id
                     ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, m.created_at ASC LIMIT 1),
                    'member'
                  ) AS role
           FROM users u WHERE u.id = $1`,
          [userId],
        )
        if (!m.rows[0]) {
          clearShortCookies(res)
          return res.status(500).send('Vínculo SSO encontrou usuário inexistente')
        }
        userName = m.rows[0].name
        orgId = m.rows[0].organization_id
        role = m.rows[0].role
      } else {
        // Tenta vincular por email; se não, cria usuário + org inicial.
        const existing = await pool.query<{ id: string; name: string }>(
          `SELECT id, name FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [email],
        )

        if (existing.rows[0]) {
          userId = existing.rows[0].id
          userName = existing.rows[0].name
          const m = await pool.query<{ organization_id: string; role: 'owner' | 'admin' | 'member' }>(
            `SELECT organization_id, role FROM memberships WHERE user_id = $1
             ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, created_at ASC LIMIT 1`,
            [userId],
          )
          if (!m.rows[0]) {
            clearShortCookies(res)
            return res.status(500).send('Usuário sem organização')
          }
          orgId = m.rows[0].organization_id
          role = m.rows[0].role
        } else {
          // Cria usuário inativo (senha aleatória — login via SSO).
          const rndPwd = crypto.randomBytes(32).toString('hex')
          const pwdHash = await hashPassword(rndPwd)
          const client = await pool.connect()
          try {
            await client.query('BEGIN')
            const u = await client.query<{ id: string }>(
              `INSERT INTO users (email, password_hash, name, email_verified_at)
               VALUES ($1, $2, $3, NOW()) RETURNING id`,
              [email, pwdHash, name],
            )
            userId = u.rows[0].id
            const o = await client.query<{ id: string }>(
              `INSERT INTO organizations (name) VALUES ($1) RETURNING id`,
              [`Equipe ${name}`],
            )
            orgId = o.rows[0].id
            await client.query(
              `INSERT INTO memberships (user_id, organization_id, role) VALUES ($1, $2, 'owner')`,
              [userId, orgId],
            )
            await client.query('COMMIT')
            role = 'owner'
          } catch (err) {
            await client.query('ROLLBACK').catch(() => {})
            throw err
          } finally {
            client.release()
          }
        }

        // Grava o vínculo (se a tabela existir; se não, segue sem ele).
        await pool
          .query(
            `INSERT INTO taggo_identity_links (identity_sub, user_id, identity_email)
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [sub, userId, email],
          )
          .catch((err) => console.warn('[sso/callback] taggo_identity_links insert falhou:', err))
      }

      // Abre sessão local (mesmo padrão do login normal).
      const access = signAccessToken(
        { sub: userId, org: orgId, role, name: userName, email },
        config.auth,
      )
      const { token: refresh, hash: refreshHash } = createRefreshToken()
      const expiresAt = new Date(Date.now() + config.auth.refreshTtlSeconds * 1000)
      await pool.query(
        `INSERT INTO sessions (user_id, current_org_id, refresh_token_hash, user_agent, ip, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          orgId,
          refreshHash,
          req.headers['user-agent'] as string | undefined ?? null,
          req.ip ?? null,
          expiresAt,
        ],
      )
      setAccessCookie(res, access, config.auth)
      setRefreshCookie(res, refresh, config.auth)

      const dest = req.cookies?.[POST_LOGIN_COOKIE]
      clearShortCookies(res)

      const redirectTo =
        typeof dest === 'string' && dest.startsWith('/') ? dest : '/app'
      return res.redirect(redirectTo)
    } catch (err) {
      console.error('[sso/callback] erro:', err)
      clearShortCookies(res)
      return res.status(500).send('Falha no SSO Taggo')
    }
  })

  return router
}
