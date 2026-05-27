import { createProsyncClient, ProsyncHttpError } from '../clients/prosyncClient.js'
import { createRubricaClient, RubricaHttpError } from '../clients/rubricaClient.js'
import type { SuiteApp } from '../clients/suiteLookup.js'

export function normalizeBaseUrl(url: string | undefined | null, fallback: string): string {
  const raw = (url?.trim() || fallback).replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(raw)) {
    throw new Error('URL deve começar com http:// ou https://')
  }
  return raw
}

export function validateApiKeyFormat(provider: SuiteApp, apiKey: string): string | null {
  const key = apiKey.trim()
  if (!key) return 'Chave API obrigatória'
  if (provider === 'rubrica') {
    if (!/^dm_(live|test)_[a-zA-Z0-9_-]+$/.test(key)) {
      return 'Chave Rubrica inválida (esperado dm_live_... ou dm_test_...)'
    }
  } else {
    if (!/^ps_(live|test)_[a-zA-Z0-9_-]+$/.test(key)) {
      return 'Chave ProSync inválida (esperado ps_live_... ou ps_test_...)'
    }
  }
  return null
}

export function keyPrefixFrom(apiKey: string): string {
  return apiKey.trim().slice(0, 16)
}

/** Testa credenciais contra o upstream antes de persistir. */
export async function verifyUpstreamCredential(
  provider: SuiteApp,
  apiKey: string,
  baseUrl: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (provider === 'rubrica') {
      const client = createRubricaClient({ baseUrl, apiKey })
      await client.getSignatureStatus('00000000-0000-0000-0000-000000000000')
      return { ok: true }
    }
    const client = createProsyncClient({ baseUrl, apiKey })
    await client.listLeads({ limit: 1 })
    return { ok: true }
  } catch (err) {
    if (err instanceof RubricaHttpError || err instanceof ProsyncHttpError) {
      if (err.status === 401 || err.status === 403) {
        return { ok: false, error: 'Chave API recusada pelo serviço (401/403)' }
      }
      if (err.status === 404) {
        return { ok: true }
      }
      return { ok: false, error: err.message || `Upstream ${err.status}` }
    }
    const message = err instanceof Error ? err.message : String(err)
    if (/ENOTFOUND|EAI_AGAIN|fetch failed/i.test(message)) {
      return { ok: false, error: 'Não foi possível alcançar a URL informada' }
    }
    return { ok: false, error: message || 'Falha ao verificar credencial' }
  }
}
