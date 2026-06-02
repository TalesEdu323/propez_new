import { describe, expect, it } from 'vitest'
import {
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_CALENDAR_READONLY_SCOPE,
} from '../googleCalendar.js'
import {
  loadGoogleOAuthConfig,
  buildGoogleAuthUrl,
} from '../../auth/googleOAuth.js'

describe('google OAuth', () => {
  it('includes calendar readonly scope', () => {
    expect(GOOGLE_CALENDAR_SCOPES).toContain(GOOGLE_CALENDAR_READONLY_SCOPE)
    expect(GOOGLE_CALENDAR_SCOPES).toContain('openid')
    expect(GOOGLE_CALENDAR_SCOPES).toContain('email')
  })

  it('returns null when env is missing', () => {
    const prevId = process.env.GOOGLE_CLIENT_ID
    const prevSecret = process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(loadGoogleOAuthConfig()).toBeNull()
    process.env.GOOGLE_CLIENT_ID = prevId
    process.env.GOOGLE_CLIENT_SECRET = prevSecret
  })

  it('builds auth URL with offline access', () => {
    const config = {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      appUrl: 'http://localhost:3001',
    }
    const url = buildGoogleAuthUrl({
      config,
      redirectUri: 'http://localhost:3001/api/auth/google/callback',
      state: 'abc',
    })
    expect(url).toContain('access_type=offline')
    expect(url).toContain('prompt=consent')
    expect(url).toContain('calendar.readonly')
  })
})
