import type { Response } from 'express'
import type { AuthConfig } from '../env.js'

export const ACCESS_COOKIE_SUFFIX = ''
export const REFRESH_COOKIE_SUFFIX = '_rt'

export function accessCookieName(config: AuthConfig): string {
  return config.sessionCookieName + ACCESS_COOKIE_SUFFIX
}
export function refreshCookieName(config: AuthConfig): string {
  return config.sessionCookieName + REFRESH_COOKIE_SUFFIX
}

export function setAccessCookie(res: Response, token: string, config: AuthConfig): void {
  res.cookie(accessCookieName(config), token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: config.accessTtlSeconds * 1000,
  })
}

export function setRefreshCookie(res: Response, token: string, config: AuthConfig): void {
  res.cookie(refreshCookieName(config), token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: config.refreshTtlSeconds * 1000,
  })
}

export function clearAuthCookies(res: Response, config: AuthConfig): void {
  res.clearCookie(accessCookieName(config), { path: '/' })
  res.clearCookie(refreshCookieName(config), { path: '/api/auth' })
}
