/**
 * Destino ProSync por organização do Propez (SaaS multi-tenant).
 * Usado por proposal-events e outros endpoints partner da suíte.
 */
import type { IntegrationsConfig } from '../config.js'
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js'
import { resolveIntegrationForOrg } from './resolveIntegrationCredential.js'

export interface SuiteProsyncTarget {
  baseUrl: string
  /** ID da organização no ProSync (tenant CRM). */
  externalOrgId: string | null
  source: 'manual' | 'suite_token' | 'env_fallback'
}

export async function resolveSuiteProsyncTarget(deps: {
  propezOrganizationId: string
  config: IntegrationsConfig
  orgCredentialsRepo?: OrgIntegrationCredentialsRepo
  ownerEmail?: string
}): Promise<SuiteProsyncTarget | null> {
  const resolved = await resolveIntegrationForOrg({
    provider: 'prosync',
    organizationId: deps.propezOrganizationId,
    ownerEmail: deps.ownerEmail,
    config: deps.config,
    orgCredentialsRepo: deps.orgCredentialsRepo,
  })
  if (!resolved) return null

  const stored = deps.orgCredentialsRepo
    ? await deps.orgCredentialsRepo
        .getStoredCredential(deps.propezOrganizationId, 'prosync')
        .catch(() => null)
    : null

  return {
    baseUrl: resolved.baseUrl,
    externalOrgId: stored?.externalOrgId ?? null,
    source: resolved.source,
  }
}
