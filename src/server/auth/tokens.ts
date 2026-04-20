import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { AuthConfig } from '../env.js'

export interface AccessTokenPayload {
  /** user id */
  sub: string
  /** organization id (tenant atual) */
  org: string
  /** role do utilizador na org (owner | admin | member) */
  role: 'owner' | 'admin' | 'member'
  /** nome do utilizador (para logs/UI sem fetch) */
  name: string
  email: string
}

export function signAccessToken(
  payload: AccessTokenPayload,
  config: AuthConfig,
): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.accessTtlSeconds,
  })
}

export function verifyAccessToken(
  token: string,
  config: AuthConfig,
): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AccessTokenPayload & {
      iat: number
      exp: number
    }
    if (!decoded?.sub || !decoded?.org) return null
    return {
      sub: decoded.sub,
      org: decoded.org,
      role: decoded.role,
      name: decoded.name,
      email: decoded.email,
    }
  } catch {
    return null
  }
}

/** Refresh token: 32 bytes aleatórios em base64url. */
export function createRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url')
  const hash = hashToken(token)
  return { token, hash }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/** Gera um código numérico de 6 dígitos para verificação de email. */
export function generateEmailCode(): string {
  const n = crypto.randomInt(0, 1_000_000)
  return n.toString().padStart(6, '0')
}

/** Token opaco url-safe (para public_token de proposta, reset password, etc.). */
export function createOpaqueToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url')
}
