/**
 * Resolve API key + base URL por organização (ProSync / Rubrica).
 * Ordem: credencial no DB → suíte Taggo → fallback global `.env`.
 */
import type { IntegrationsConfig } from '../config.js'
import type { EnsureSuiteCredential } from './ensureSuiteCredential.js'
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js'
import type { SuiteApp } from '../clients/suiteLookup.js'

export interface ResolvedIntegration {
  apiKey: string
  baseUrl: string
  source: 'manual' | 'suite_token' | 'env_fallback'
}

function isPlaceholderKey(value: string | null | undefined): boolean {
  if (!value) return true
  return value.includes('<PREENCHER>') || value.endsWith('_PREENCHER')
}

function defaultBaseUrl(config: IntegrationsConfig, provider: SuiteApp): string {
  return provider === 'prosync' ? config.prosync.baseUrl : config.rubrica.baseUrl
}

export async function resolveIntegrationForOrg(deps: {
  provider: SuiteApp
  organizationId: string
  ownerEmail?: string
  config: IntegrationsConfig
  orgCredentialsRepo?: OrgIntegrationCredentialsRepo
  ensureSuiteCredential?: EnsureSuiteCredential
}): Promise<ResolvedIntegration | null> {
  const { provider, organizationId, ownerEmail, config, orgCredentialsRepo, ensureSuiteCredential } =
    deps

  if (orgCredentialsRepo) {
    const stored = await orgCredentialsRepo.getStoredCredential(organizationId, provider).catch(() => null)
    if (stored?.apiKey && !isPlaceholderKey(stored.apiKey)) {
      return {
        apiKey: stored.apiKey,
        baseUrl: stored.apiBaseUrl?.trim() || defaultBaseUrl(config, provider),
        source: stored.source === 'manual' || stored.source === 'suite_token' ? stored.source : 'manual',
      }
    }
  }

  if (ensureSuiteCredential && ownerEmail) {
    const result = await ensureSuiteCredential(provider, {
      organizationId,
      ownerEmail,
      createIfMissing: false,
    })
    if (result.ok && !isPlaceholderKey(result.credential.apiKey)) {
      const cred = result.credential
      return {
        apiKey: cred.apiKey,
        baseUrl: cred.apiBaseUrl?.trim() || defaultBaseUrl(config, provider),
        source: 'suite_token',
      }
    }
  }

  const fallbackKey =
    provider === 'prosync' ? config.prosync.apiKey : config.rubrica.apiKey
  if (fallbackKey && !isPlaceholderKey(fallbackKey)) {
    return {
      apiKey: fallbackKey,
      baseUrl: defaultBaseUrl(config, provider),
      source: 'env_fallback',
    }
  }

  return null
}
