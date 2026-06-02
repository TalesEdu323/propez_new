/**
 * OAuth 2.0 Google — helpers compartilhados (login + Google Agenda).
 * Sem SDK googleapis; fluxo manual via fetch como no Prosync.
 */
import { GOOGLE_CALENDAR_SCOPES } from '../integrations/googleCalendar.js'

export { GOOGLE_CALENDAR_SCOPES }

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  appUrl: string
}

export interface GoogleTokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  id_token?: string
}

export interface GoogleUserInfo {
  sub: string
  email?: string
  name?: string
  picture?: string
}

export function loadGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = (process.env.APP_URL || 'http://localhost:3001').replace(/\/$/, '')
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, appUrl }
}

export function getGoogleAuthRedirectUri(config: GoogleOAuthConfig): string {
  return `${config.appUrl}/api/auth/google/callback`
}

export function getGoogleCalendarRedirectUri(config: GoogleOAuthConfig): string {
  return `${config.appUrl}/api/integrations/google-calendar/callback`
}

export function buildGoogleAuthUrl(input: {
  config: GoogleOAuthConfig
  redirectUri: string
  state: string
  scopes?: string
}): string {
  const params = new URLSearchParams({
    client_id: input.config.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: input.scopes ?? GOOGLE_CALENDAR_SCOPES,
    state: input.state,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(
  config: GoogleOAuthConfig,
  code: string,
  redirectUri: string,
): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google token exchange failed: ${res.status} ${err}`)
  }
  return res.json() as Promise<GoogleTokenResponse>
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`Google userinfo failed: ${res.status}`)
  }
  return res.json() as Promise<GoogleUserInfo>
}
