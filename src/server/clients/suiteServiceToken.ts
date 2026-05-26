/**
 * Cliente HTTP para provisionar service tokens da suíte Taggo via
 * `/api/partner/service-token` em ProSync e Rubrica.
 *
 * Autenticação: HMAC-SHA256 sobre `<timestamp>.<rawBody>` com
 * `TAGGO_SUITE_SECRET`. Mesmo formato do `suiteLookup`.
 */
import crypto from 'node:crypto'
import type { IntegrationsConfig } from '../config.js'
import type { SuiteApp } from './suiteLookup.js'

export interface ServiceTokenRequest {
  email: string
  scopes?: string[]
  name?: string
  /** Cria conta inativa no app alvo se o email não existir. */
  createIfMissing?: boolean
  /** Nome da org a criar (somente quando createIfMissing=true; só usado em ProSync). */
  company?: string
}

export interface ServiceTokenResult {
  ok: true
  app: SuiteApp
  apiKey: string
  keyId: string
  keyPrefix: string | null
  userId: string | null
  organizationId: string | null
  scopes: string[]
  created: boolean
}

export interface ServiceTokenError {
  ok: false
  app: SuiteApp
  status: number
  error: string
}

const TIMEOUT_MS = 12_000
const ORIGIN_APP = 'propez'

function signBody(secret: string, timestamp: string, rawBody: string): string {
  return (
    'sha256=' +
    crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex')
  )
}

async function call(
  app: SuiteApp,
  baseUrl: string,
  secret: string,
  payload: ServiceTokenRequest,
): Promise<ServiceTokenResult | ServiceTokenError> {
  const rawBody = JSON.stringify({
    email: payload.email,
    partner_app: ORIGIN_APP,
    scopes: payload.scopes,
    name: payload.name,
    create_if_missing: payload.createIfMissing ?? false,
    company: payload.company,
  })
  const timestamp = Date.now().toString()
  const signature = signBody(secret, timestamp, rawBody)
  const url = `${baseUrl.replace(/\/+$/, '')}/api/partner/service-token`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-taggo-suite-signature': signature,
        'x-taggo-suite-app': ORIGIN_APP,
        'x-taggo-suite-timestamp': timestamp,
      },
      body: rawBody,
      signal: controller.signal,
    })

    const text = await res.text()
    let body: any = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }

    if (!res.ok) {
      return {
        ok: false,
        app,
        status: res.status,
        error:
          (body && typeof body === 'object' && 'error' in body
            ? String((body as Record<string, unknown>).error)
            : undefined) || `service-token falhou (${res.status})`,
      }
    }

    if (!body || typeof body !== 'object' || !body.apiKey) {
      return { ok: false, app, status: res.status, error: 'resposta sem apiKey' }
    }

    return {
      ok: true,
      app,
      apiKey: String(body.apiKey),
      keyId: String(body.keyId || ''),
      keyPrefix: body.keyPrefix ?? null,
      userId: body.userId ?? null,
      organizationId: body.organizationId ?? null,
      scopes: Array.isArray(body.scopes) ? body.scopes : [],
      created: Boolean(body.created),
    }
  } catch (err: any) {
    return {
      ok: false,
      app,
      status: 0,
      error: err?.name === 'AbortError' ? 'timeout' : err?.message || 'rede',
    }
  } finally {
    clearTimeout(timer)
  }
}

export function createSuiteServiceTokenClient(config: IntegrationsConfig) {
  const secret = config.suiteSecret
  const prosyncBase = config.prosync.baseUrl
  const rubricaBase = config.rubrica.baseUrl

  function isEnabled(): boolean {
    return Boolean(secret && secret.length >= 32)
  }

  async function request(
    app: SuiteApp,
    payload: ServiceTokenRequest,
  ): Promise<ServiceTokenResult | ServiceTokenError> {
    if (!isEnabled()) {
      return { ok: false, app, status: 0, error: 'TAGGO_SUITE_SECRET ausente' }
    }
    const baseUrl = app === 'prosync' ? prosyncBase : rubricaBase
    return call(app, baseUrl, secret as string, payload)
  }

  return { isEnabled, request }
}

export type SuiteServiceTokenClient = ReturnType<typeof createSuiteServiceTokenClient>
