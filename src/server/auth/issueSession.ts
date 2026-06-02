import type { Response } from 'express'
import type { Pool } from 'pg'
import type { AuthConfig } from '../env.js'
import { createRefreshToken, signAccessToken } from './tokens.js'
import { setAccessCookie, setRefreshCookie } from './cookies.js'

export async function getPrimaryMembership(
  pool: Pool,
  userId: string,
): Promise<{ organization_id: string; role: 'owner' | 'admin' | 'member' } | null> {
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

export async function issueTokensForUser(input: {
  pool: Pool
  config: AuthConfig
  res: Response
  userId: string
  name: string
  email: string
  orgId: string
  role: 'owner' | 'admin' | 'member'
  userAgent: string | undefined
  ip: string | undefined
}): Promise<void> {
  const { pool, config, res, userId, orgId, role, name, email, userAgent, ip } = input
  const access = signAccessToken({ sub: userId, org: orgId, role, name, email }, config)
  const { token: refresh, hash: refreshHash } = createRefreshToken()
  const expiresAt = new Date(Date.now() + config.refreshTtlSeconds * 1000)
  await pool.query(
    `INSERT INTO sessions (user_id, current_org_id, refresh_token_hash, user_agent, ip, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, orgId, refreshHash, userAgent ?? null, ip ?? null, expiresAt],
  )
  setAccessCookie(res, access, config)
  setRefreshCookie(res, refresh, config)
}
