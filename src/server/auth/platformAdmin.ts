import type { NextFunction, Request, Response } from 'express'
import type { Pool } from 'pg'
import type { EnvironmentConfig } from '../env.js'

/**
 * Middleware que exige que o usuário autenticado seja um platform admin.
 *
 * Deve ser usado **depois** de `requireAuth`, pois lê `req.auth.userId`.
 *
 * Critérios (OR):
 *  1. `users.is_platform_admin = TRUE`
 *  2. E-mail (lowercase) presente em `config.platformAdminEmails`
 *
 * O resultado é cacheado em memória por 30s para reduzir round-trips ao DB.
 */
export function buildRequirePlatformAdmin(deps: {
  pool: Pool
  config: EnvironmentConfig
}) {
  const { pool, config } = deps
  const cache = new Map<string, { isAdmin: boolean; expiresAt: number }>()
  const TTL_MS = 30_000

  return async function requirePlatformAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (!req.auth) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }
    const userId = req.auth.userId
    const now = Date.now()
    const cached = cache.get(userId)
    if (cached && cached.expiresAt > now) {
      if (!cached.isAdmin) {
        res.status(403).json({ error: 'Acesso negado' })
        return
      }
      next()
      return
    }

    try {
      const { rows } = await pool.query<{ is_platform_admin: boolean; email: string }>(
        `SELECT is_platform_admin, email FROM users WHERE id = $1`,
        [userId],
      )
      const row = rows[0]
      if (!row) {
        res.status(401).json({ error: 'Usuário não encontrado' })
        return
      }
      const email = (row.email || '').toLowerCase()
      const isAdmin =
        row.is_platform_admin === true ||
        config.platformAdminEmails.includes(email)
      cache.set(userId, { isAdmin, expiresAt: now + TTL_MS })
      if (!isAdmin) {
        res.status(403).json({ error: 'Acesso negado' })
        return
      }
      next()
    } catch (err) {
      console.error('[platformAdmin] erro ao validar admin:', err)
      res.status(500).json({ error: 'Erro ao validar permissão' })
    }
  }
}

/**
 * Verifica de forma síncrona (sem cache, fora de middleware) se um usuário
 * é platform admin. Útil para endpoints como `/api/auth/me` que precisam
 * devolver o flag na sessão.
 */
export async function isPlatformAdmin(
  pool: Pool,
  config: EnvironmentConfig,
  userId: string,
): Promise<boolean> {
  const { rows } = await pool.query<{ is_platform_admin: boolean; email: string }>(
    `SELECT is_platform_admin, email FROM users WHERE id = $1`,
    [userId],
  )
  const row = rows[0]
  if (!row) return false
  if (row.is_platform_admin === true) return true
  const email = (row.email || '').toLowerCase()
  return config.platformAdminEmails.includes(email)
}
