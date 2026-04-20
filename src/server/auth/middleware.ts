import type { NextFunction, Request, Response } from 'express'
import type { AuthConfig } from '../env.js'
import { verifyAccessToken } from './tokens.js'
import { accessCookieName } from './cookies.js'

export interface AuthContext {
  userId: string
  orgId: string
  role: 'owner' | 'admin' | 'member'
  name: string
  email: string
}

declare module 'express-serve-static-core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Request {
    auth?: AuthContext
  }
}

function extractToken(req: Request, cookieName: string): string | null {
  const fromCookie = req.cookies?.[cookieName]
  if (fromCookie && typeof fromCookie === 'string') return fromCookie
  const authz = req.headers.authorization
  if (authz && authz.startsWith('Bearer ')) return authz.slice('Bearer '.length).trim()
  return null
}

export function buildRequireAuth(authConfig: AuthConfig) {
  const cookieName = accessCookieName(authConfig)
  return function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = extractToken(req, cookieName)
    if (!token) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }
    const payload = verifyAccessToken(token, authConfig)
    if (!payload) {
      res.status(401).json({ error: 'Sessão expirada' })
      return
    }
    req.auth = {
      userId: payload.sub,
      orgId: payload.org,
      role: payload.role,
      name: payload.name,
      email: payload.email,
    }
    next()
  }
}

export function requireOrgRole(...allowed: Array<AuthContext['role']>) {
  return function roleGuard(req: Request, res: Response, next: NextFunction): void {
    if (!req.auth) {
      res.status(401).json({ error: 'Não autenticado' })
      return
    }
    if (!allowed.includes(req.auth.role)) {
      res.status(403).json({ error: 'Permissão insuficiente' })
      return
    }
    next()
  }
}
