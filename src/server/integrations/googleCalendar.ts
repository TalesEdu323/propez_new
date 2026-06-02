/**
 * Google Calendar — persistência de tokens, refresh e listagem de eventos.
 */
import type { Pool } from 'pg'
import { decryptSecret, encryptSecret } from '../lib/secretCrypto.js'

export const GOOGLE_CALENDAR_READONLY_SCOPE =
  'https://www.googleapis.com/auth/calendar.readonly'

export const GOOGLE_CALENDAR_SCOPES = [
  'openid',
  'email',
  'profile',
  GOOGLE_CALENDAR_READONLY_SCOPE,
].join(' ')

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars'

export type GoogleCalendarConnectionSource = 'google_login' | 'manual_connect'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string | null
  location?: string | null
  start: string
  end: string
  allDay: boolean
  htmlLink?: string | null
}

interface ConnectionRow {
  id: string
  user_id: string
  google_sub: string | null
  google_email: string
  refresh_token_encrypted: string
  access_token_encrypted: string | null
  token_expires_at: Date | null
  calendar_id: string
  scopes: string | null
  source: string
  connected_at: Date
  revoked_at: Date | null
}

export interface SaveGoogleCalendarInput {
  googleSub?: string | null
  googleEmail: string
  refreshToken?: string | null
  accessToken?: string | null
  expiresIn?: number | null
  scopes?: string | null
  source?: GoogleCalendarConnectionSource
}

function getOAuthCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET não configurados')
  }
  return { clientId, clientSecret }
}

function expiresAtFromSeconds(expiresIn?: number | null): Date | null {
  if (!expiresIn || expiresIn <= 0) return null
  return new Date(Date.now() + expiresIn * 1000)
}

export function createGoogleCalendarService(pool: Pool) {
  async function saveGoogleCalendarConnection(
    userId: string,
    input: SaveGoogleCalendarInput,
  ): Promise<void> {
    const existing = await pool.query<ConnectionRow>(
      `SELECT * FROM user_google_calendar_connections
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    )

    const row = existing.rows[0]
    const refreshToken =
      input.refreshToken ||
      (row ? decryptSecret(row.refresh_token_encrypted) : null)

    if (!refreshToken) {
      if (!input.accessToken) return
    }

    if (!refreshToken) {
      throw new Error('refresh_token obrigatório para nova conexão de agenda')
    }

    const accessEncrypted = input.accessToken
      ? encryptSecret(input.accessToken)
      : (row?.access_token_encrypted ?? null)
    const expiresAt = input.expiresIn
      ? expiresAtFromSeconds(input.expiresIn)
      : (row?.token_expires_at ?? null)

    await pool.query(
      `INSERT INTO user_google_calendar_connections (
        user_id, google_sub, google_email, refresh_token_encrypted,
        access_token_encrypted, token_expires_at, scopes, source, connected_at, updated_at, revoked_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NULL)
      ON CONFLICT (user_id) DO UPDATE SET
        google_sub = COALESCE(EXCLUDED.google_sub, user_google_calendar_connections.google_sub),
        google_email = EXCLUDED.google_email,
        refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
        access_token_encrypted = COALESCE(EXCLUDED.access_token_encrypted, user_google_calendar_connections.access_token_encrypted),
        token_expires_at = COALESCE(EXCLUDED.token_expires_at, user_google_calendar_connections.token_expires_at),
        scopes = COALESCE(EXCLUDED.scopes, user_google_calendar_connections.scopes),
        source = EXCLUDED.source,
        updated_at = NOW(),
        revoked_at = NULL`,
      [
        userId,
        input.googleSub ?? row?.google_sub ?? null,
        input.googleEmail.toLowerCase(),
        encryptSecret(refreshToken),
        accessEncrypted,
        expiresAt,
        input.scopes ?? row?.scopes ?? GOOGLE_CALENDAR_SCOPES,
        input.source ?? row?.source ?? 'google_login',
      ],
    )
  }

  async function getGoogleCalendarStatus(userId: string): Promise<{
    connected: boolean
    googleEmail: string | null
    source: GoogleCalendarConnectionSource | null
    connectedAt: string | null
  }> {
    const result = await pool.query<ConnectionRow>(
      `SELECT google_email, source, connected_at FROM user_google_calendar_connections
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    )
    const row = result.rows[0]
    if (!row) {
      return { connected: false, googleEmail: null, source: null, connectedAt: null }
    }
    return {
      connected: true,
      googleEmail: row.google_email,
      source: (row.source as GoogleCalendarConnectionSource) || 'google_login',
      connectedAt: row.connected_at?.toISOString?.() ?? String(row.connected_at),
    }
  }

  async function disconnectGoogleCalendar(userId: string): Promise<void> {
    await pool.query(
      `UPDATE user_google_calendar_connections
       SET revoked_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    )
  }

  async function refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    expires_in: number
  }> {
    const { clientId, clientSecret } = getOAuthCredentials()
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Falha ao renovar token Google Calendar: ${res.status} ${err}`)
    }
    return res.json() as Promise<{ access_token: string; expires_in: number }>
  }

  async function getValidAccessToken(userId: string): Promise<string> {
    const result = await pool.query<ConnectionRow>(
      `SELECT * FROM user_google_calendar_connections
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    )
    const row = result.rows[0]
    if (!row) {
      throw new Error('Agenda Google não conectada')
    }

    const refreshToken = decryptSecret(row.refresh_token_encrypted)
    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0
    const stillValid = row.access_token_encrypted && expiresAt > Date.now() + 60_000

    if (stillValid && row.access_token_encrypted) {
      return decryptSecret(row.access_token_encrypted)
    }

    const tokens = await refreshAccessToken(refreshToken)
    const newExpires = expiresAtFromSeconds(tokens.expires_in)

    await pool.query(
      `UPDATE user_google_calendar_connections
       SET access_token_encrypted = $2, token_expires_at = $3, updated_at = NOW()
       WHERE id = $1`,
      [row.id, encryptSecret(tokens.access_token), newExpires],
    )

    return tokens.access_token
  }

  function parseEventDate(
    value?: { dateTime?: string; date?: string } | null,
  ): { iso: string; allDay: boolean } | null {
    if (!value) return null
    if (value.dateTime) return { iso: value.dateTime, allDay: false }
    if (value.date) return { iso: `${value.date}T00:00:00.000Z`, allDay: true }
    return null
  }

  async function listGoogleCalendarEvents(
    userId: string,
    timeMin: string,
    timeMax: string,
  ): Promise<GoogleCalendarEvent[]> {
    const accessToken = await getValidAccessToken(userId)
    const conn = await pool.query<{ calendar_id: string }>(
      `SELECT calendar_id FROM user_google_calendar_connections
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    )
    const calendarId = encodeURIComponent(conn.rows[0]?.calendar_id || 'primary')

    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    })

    const res = await fetch(
      `${CALENDAR_EVENTS_URL}/${calendarId}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Google Calendar API error: ${res.status} ${err}`)
    }

    const data = (await res.json()) as {
      items?: Array<{
        id?: string
        summary?: string
        description?: string
        location?: string
        htmlLink?: string
        start?: { dateTime?: string; date?: string }
        end?: { dateTime?: string; date?: string }
      }>
    }

    const events: GoogleCalendarEvent[] = []
    for (const item of data.items || []) {
      if (!item.id) continue
      const start = parseEventDate(item.start)
      const end = parseEventDate(item.end)
      if (!start) continue
      events.push({
        id: item.id,
        summary: item.summary || '(Sem título)',
        description: item.description ?? null,
        location: item.location ?? null,
        start: start.iso,
        end: end?.iso ?? start.iso,
        allDay: start.allDay,
        htmlLink: item.htmlLink ?? null,
      })
    }
    return events
  }

  async function revokeGoogleToken(token: string): Promise<void> {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    } catch {
      // Revogação best-effort
    }
  }

  return {
    saveGoogleCalendarConnection,
    getGoogleCalendarStatus,
    disconnectGoogleCalendar,
    getValidAccessToken,
    listGoogleCalendarEvents,
    revokeGoogleToken,
  }
}

export type GoogleCalendarService = ReturnType<typeof createGoogleCalendarService>
