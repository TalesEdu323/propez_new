/**
 * Orquestrador: garante que a organização atual tem uma credencial válida para
 * um provider da suíte (ProSync).
 *
 * Fluxo:
 *   1. Tenta carregar credencial cifrada da `org_integration_credentials`.
 *   2. Se não houver e o suite secret estiver configurado, dispara um
 *      provisionamento em `/api/partner/service-token` do app alvo.
 *   3. Salva a nova chave cifrada e devolve.
 *   4. Se o suite secret não estiver configurado, faz fallback para a chave
 *      global do `.env` (compatibilidade com o setup atual).
 *
 * Idempotente: chamadas concorrentes para a mesma org/provider podem disparar
 * múltiplos provisionamentos; a chave anterior é revogada do lado do app
 * alvo, então a última-emitida prevalece.
 */
import type { Pool } from 'pg'
import type { IntegrationsConfig } from '../config.js'
import type { OrgIntegrationCredential, OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js'
import type { SuiteServiceTokenClient } from '../clients/suiteServiceToken.js'
import type { SuiteApp } from '../clients/suiteLookup.js'

export interface EnsureCredentialInput {
  organizationId: string
  /** Email do owner (usado para vincular ou criar a conta no app alvo). */
  ownerEmail: string
  /** Nome amigável para a chave system-managed. */
  keyName?: string
  /** Cria conta inativa no app alvo se o email ainda não existir lá. */
  createIfMissing?: boolean
  /** Nome da org quando for criação (ProSync). */
  company?: string
  /** Força reprovisionamento mesmo se já existir credential. */
  force?: boolean
}

export type EnsureCredentialResult =
  | { ok: true; credential: OrgIntegrationCredential; provisioned: boolean }
  | { ok: false; reason: string; status?: number }

export interface EnsureCredentialDeps {
  pool: Pool
  config: IntegrationsConfig
  repo: OrgIntegrationCredentialsRepo
  serviceToken: SuiteServiceTokenClient
}

export function createEnsureSuiteCredential(deps: EnsureCredentialDeps) {
  const { repo, serviceToken } = deps

  return async function ensureSuiteCredential(
    provider: SuiteApp,
    input: EnsureCredentialInput,
  ): Promise<EnsureCredentialResult> {
    if (!input.force) {
      const existing = await repo.getCredential(input.organizationId, provider).catch(() => null)
      if (existing) return { ok: true, credential: existing, provisioned: false }
    }

    if (!serviceToken.isEnabled()) {
      return {
        ok: false,
        reason:
          'TAGGO_SUITE_SECRET não configurado; não é possível provisionar credencial automaticamente.',
      }
    }

    const result = await serviceToken.request(provider, {
      email: input.ownerEmail,
      name: input.keyName,
      createIfMissing: input.createIfMissing ?? false,
      company: input.company,
    })

    if (result.ok !== true) {
      return { ok: false, reason: result.error, status: result.status }
    }

    await repo.saveCredential({
      organizationId: input.organizationId,
      provider,
      apiKey: result.apiKey,
      keyPrefix: result.keyPrefix,
      externalUserId: result.userId,
      externalOrgId: result.organizationId,
      scopes: result.scopes,
      source: 'suite_token',
    })

    const stored = await repo.getCredential(input.organizationId, provider)
    if (!stored) {
      // Defensivo: acabou de salvar; deve existir.
      return {
        ok: false,
        reason: 'Falha ao reler credencial após provisionamento',
      }
    }
    return { ok: true, credential: stored, provisioned: true }
  }
}

export type EnsureSuiteCredential = ReturnType<typeof createEnsureSuiteCredential>
