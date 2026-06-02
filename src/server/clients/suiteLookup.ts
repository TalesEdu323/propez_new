/**
 * Cliente de descoberta cross-app da suíte Taggo.
 *
 * Quando um cliente cria conta no Propez, este módulo pergunta aos outros
 * apps da suíte (ProSync, Rubrica) se aquele email já existe (e opcionalmente
 * se a senha confere). Habilita o fluxo "Taggo Workspace": ao se cadastrar
 * em qualquer app, o sistema vincula automaticamente as contas existentes
 * nos outros — sem o usuário gerar API Key nenhuma.
 *
 * Autenticação: HMAC-SHA256 sobre `<timestamp>.<rawBody>` com o segredo
 * compartilhado `TAGGO_SUITE_SECRET`. Janela anti-replay: 5 minutos.
 *
 * Toda chamada é server-side. Nunca expor `TAGGO_SUITE_SECRET` no bundle do
 * cliente.
 */

import crypto from 'node:crypto'
import type { IntegrationsConfig } from '../config'

export type SuiteApp = 'prosync'

export interface SuiteLookupRequest {
  email: string
  /** Se fornecido, o app remoto valida a senha e devolve `passwordMatches`. */
  password?: string
}

export interface SuiteLookupResult {
  app: SuiteApp
  /** Houve resposta válida? Se `false`, ver `error`/`status`. */
  ok: boolean
  exists: boolean
  passwordMatches?: boolean
  userId: string | null
  organizationId: string | null
  emailVerified?: boolean | null
  plan: string | null
  hasApiKey: boolean
  /** Status HTTP da resposta (útil para debug). `0` quando rede falhou. */
  status: number
  /** Mensagem de erro do app remoto, se houver. */
  error?: string
}

const TIMEOUT_MS = 8_000
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

async function callLookup(
  app: SuiteApp,
  baseUrl: string,
  secret: string,
  payload: SuiteLookupRequest,
): Promise<SuiteLookupResult> {
  const rawBody = JSON.stringify(payload)
  const timestamp = Date.now().toString()
  const signature = signBody(secret, timestamp, rawBody)

  const url = `${baseUrl.replace(/\/+$/, '')}/api/identity/lookup`

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
        app,
        ok: false,
        exists: false,
        userId: null,
        organizationId: null,
        plan: null,
        hasApiKey: false,
        status: res.status,
        error:
          (body && typeof body === 'object' && 'error' in body
            ? String((body as Record<string, unknown>).error)
            : undefined) || `lookup falhou (${res.status})`,
      }
    }

    return {
      app,
      ok: true,
      exists: Boolean(body?.exists),
      passwordMatches:
        typeof body?.passwordMatches === 'boolean' ? body.passwordMatches : undefined,
      userId: body?.userId ?? null,
      organizationId: body?.organizationId ?? null,
      emailVerified:
        typeof body?.emailVerified === 'boolean' ? body.emailVerified : null,
      plan: body?.plan ?? null,
      hasApiKey: Boolean(body?.hasApiKey),
      status: res.status,
    }
  } catch (err: any) {
    return {
      app,
      ok: false,
      exists: false,
      userId: null,
      organizationId: null,
      plan: null,
      hasApiKey: false,
      status: 0,
      error: err?.name === 'AbortError' ? 'timeout' : err?.message || 'rede',
    }
  } finally {
    clearTimeout(timer)
  }
}

export function createSuiteLookup(config: IntegrationsConfig) {
  const secret = config.suiteSecret
  const prosyncBase = config.prosync.baseUrl

  function isEnabled(): boolean {
    return Boolean(secret && secret.length >= 32)
  }

  const disabledResult = (): SuiteLookupResult => ({
    app: 'prosync',
    ok: false,
    exists: false,
    userId: null,
    organizationId: null,
    plan: null,
    hasApiKey: false,
    status: 0,
    error: 'TAGGO_SUITE_SECRET ausente',
  })

  async function lookupApp(
    _app: SuiteApp,
    payload: SuiteLookupRequest,
  ): Promise<SuiteLookupResult> {
    if (!isEnabled()) return disabledResult()
    return callLookup('prosync', prosyncBase, secret as string, payload)
  }

  return {
    isEnabled,
    lookupApp,
    async lookupAll(payload: SuiteLookupRequest): Promise<SuiteLookupResult[]> {
      if (!isEnabled()) return [disabledResult()]
      const prosync = await callLookup('prosync', prosyncBase, secret as string, payload)
      return [prosync]
    },
  }
}

export type SuiteLookupClient = ReturnType<typeof createSuiteLookup>
