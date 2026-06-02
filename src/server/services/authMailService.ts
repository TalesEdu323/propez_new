import type { Pool } from 'pg'
import type { EnvironmentConfig } from '../env.js'
import {
  createOpaqueToken,
  generateEmailCode,
  hashToken,
} from '../auth/tokens.js'
import type { MailClient } from '../mail/client.js'
import { sendAuthEmail, type AuthMailResult } from '../mail/authMail.js'

export const EMAIL_CODE_TTL_MINUTES = 15
export const RESET_TOKEN_TTL_MINUTES = 30
export const EMAIL_CHANGE_TTL_MINUTES = 15

export type IssueMailResult = AuthMailResult & {
  devVerificationCode?: string
  devResetUrl?: string
}

export interface AuthUserRow {
  id: string
  name: string
  email: string
  email_verified_at: string | null
}

export async function getUserById(pool: Pool, userId: string): Promise<AuthUserRow | null> {
  const { rows } = await pool.query<AuthUserRow>(
    `SELECT id, name, email, email_verified_at FROM users WHERE id = $1`,
    [userId],
  )
  return rows[0] ?? null
}

export async function getUserByEmail(pool: Pool, email: string): Promise<AuthUserRow | null> {
  const { rows } = await pool.query<AuthUserRow>(
    `SELECT id, name, email, email_verified_at FROM users WHERE LOWER(email) = LOWER($1)`,
    [email],
  )
  return rows[0] ?? null
}

export async function issuePasswordReset(
  pool: Pool,
  config: EnvironmentConfig,
  mail: MailClient,
  userId: string,
): Promise<IssueMailResult> {
  const u = await getUserById(pool, userId)
  if (!u) return { ok: false, reason: 'send_failed' }

  const token = createOpaqueToken(24)
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000)
  await pool.query(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [u.id, tokenHash, expiresAt],
  )

  const resetUrl = `${config.appUrl.replace(/\/+$/, '')}/login?token=${encodeURIComponent(token)}`
  const mailResult = await sendAuthEmail(
    config,
    'forgot-password',
    () => mail.sendPasswordResetEmail({ to: u.email, name: u.name, resetUrl }),
    config.nodeEnv !== 'production' ? `link de reset: ${resetUrl}` : undefined,
  )
  if (mailResult.ok && config.nodeEnv !== 'production') {
    return { ...mailResult, devResetUrl: resetUrl }
  }
  return mailResult
}

export async function issueEmailVerification(
  pool: Pool,
  config: EnvironmentConfig,
  mail: MailClient,
  userId: string,
): Promise<IssueMailResult & { alreadyVerified?: boolean }> {
  const u = await getUserById(pool, userId)
  if (!u) return { ok: false, reason: 'send_failed' }
  if (u.email_verified_at) return { ok: true, alreadyVerified: true }

  const code = generateEmailCode()
  const codeHash = hashToken(code)
  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60_000)
  await pool.query(
    `INSERT INTO email_verifications (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
    [u.id, codeHash, expiresAt],
  )

  const mailResult = await sendAuthEmail(
    config,
    'resend-verification',
    () => mail.sendVerificationEmail({ to: u.email, name: u.name, code }),
    `código de verificação para ${u.email}: ${code}`,
  )
  if (mailResult.ok || config.nodeEnv === 'production') {
    return mailResult
  }
  return { ...mailResult, devVerificationCode: code }
}

export async function issueEmailChangeRequest(
  pool: Pool,
  config: EnvironmentConfig,
  mail: MailClient,
  userId: string,
  newEmail: string,
): Promise<IssueMailResult> {
  const u = await getUserById(pool, userId)
  if (!u) return { ok: false, reason: 'send_failed' }

  const normalized = newEmail.trim().toLowerCase()
  const existing = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
    [normalized, userId],
  )
  if (existing.rows.length > 0) {
    return { ok: false, reason: 'send_failed' }
  }

  const code = generateEmailCode()
  const codeHash = hashToken(code)
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_MINUTES * 60_000)

  await pool.query(
    `UPDATE email_change_requests SET consumed_at = NOW()
     WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId],
  )
  await pool.query(
    `INSERT INTO email_change_requests (user_id, new_email, code_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, normalized, codeHash, expiresAt],
  )

  const mailResult = await sendAuthEmail(
    config,
    'email-change',
    () =>
      mail.sendEmailChangeCodeEmail({
        to: normalized,
        name: u.name,
        code,
        newEmail: normalized,
      }),
    `código de troca de e-mail para ${normalized}: ${code}`,
  )
  if (mailResult.ok || config.nodeEnv === 'production') {
    return mailResult
  }
  return { ...mailResult, devVerificationCode: code }
}
