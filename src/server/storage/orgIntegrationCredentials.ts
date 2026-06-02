/**
 * Repositório das credenciais de integração por organização.
 *
 * Cada linha em `org_integration_credentials` guarda a API key cifrada que o
 * Propez usa para conversar com ProSync/Rubrica em nome de uma organização
 * específica.
 */
import type { Pool } from 'pg'
import type { IntegrationsConfig } from '../config.js'
import { decryptSecret, encryptSecret, isSecretCryptoAvailable } from '../lib/secretCrypto.js'
import type { SuiteApp } from '../clients/suiteLookup.js'

export type CredentialSource = 'suite_token' | 'env_fallback' | 'manual'

export interface OrgIntegrationCredential {
  organizationId: string
  provider: SuiteApp
  apiKey: string
  apiBaseUrl: string | null
  keyPrefix: string | null
  externalUserId: string | null
  externalOrgId: string | null
  scopes: string[]
  source: CredentialSource
  lastVerifiedAt: Date | null
}

export interface SaveCredentialInput {
  organizationId: string
  provider: SuiteApp
  apiKey: string
  apiBaseUrl?: string | null
  keyPrefix?: string | null
  externalUserId?: string | null
  externalOrgId?: string | null
  scopes?: string[]
  source?: CredentialSource
}

interface Row {
  organization_id: string
  provider: string
  encrypted_api_key: string
  api_base_url: string | null
  key_prefix: string | null
  external_user_id: string | null
  external_org_id: string | null
  scopes: string[] | null
  source: string
  last_verified_at: string | null
}

const SELECT_COLS = `organization_id, provider, encrypted_api_key, api_base_url, key_prefix,
  external_user_id, external_org_id, scopes, source, last_verified_at`

function rowToCredential(row: Row): OrgIntegrationCredential {
  return {
    organizationId: row.organization_id,
    provider: row.provider as SuiteApp,
    apiKey: decryptSecret(row.encrypted_api_key),
    apiBaseUrl: row.api_base_url,
    keyPrefix: row.key_prefix,
    externalUserId: row.external_user_id,
    externalOrgId: row.external_org_id,
    scopes: row.scopes ?? [],
    source: (row.source as CredentialSource) ?? 'suite_token',
    lastVerifiedAt: row.last_verified_at ? new Date(row.last_verified_at) : null,
  }
}

function isPlaceholderKey(value: string): boolean {
  return value.includes('<PREENCHER>') || value.endsWith('_PREENCHER')
}

export function createOrgIntegrationCredentialsRepo(
  pool: Pool,
  integrations: IntegrationsConfig,
) {
  /** Apenas credencial persistida no banco (sem fallback `.env`). */
  async function getStoredCredential(
    organizationId: string,
    provider: SuiteApp,
  ): Promise<OrgIntegrationCredential | null> {
    if (!isSecretCryptoAvailable()) return null
    const { rows } = await pool.query<Row>(
      `SELECT ${SELECT_COLS}
       FROM org_integration_credentials
       WHERE organization_id = $1 AND provider = $2
       LIMIT 1`,
      [organizationId, provider],
    )
    if (!rows[0]) return null
    try {
      return rowToCredential(rows[0])
    } catch (err) {
      console.error(
        `[org-credentials] falha ao decifrar credential ${provider} org=${organizationId}:`,
        err,
      )
      return null
    }
  }

  async function getCredential(
    organizationId: string,
    provider: SuiteApp,
  ): Promise<OrgIntegrationCredential | null> {
    const stored = await getStoredCredential(organizationId, provider)
    if (stored) return stored

    const fallback =
      integrations.prosync.apiKey
    if (fallback && !isPlaceholderKey(fallback)) {
      return {
        organizationId,
        provider,
        apiKey: fallback,
        apiBaseUrl: null,
        keyPrefix: null,
        externalUserId: null,
        externalOrgId: null,
        scopes: [],
        source: 'env_fallback',
        lastVerifiedAt: null,
      }
    }
    return null
  }

  async function saveCredential(input: SaveCredentialInput): Promise<void> {
    if (!isSecretCryptoAvailable()) {
      throw new Error(
        'Não é possível persistir credencial: defina CREDENTIALS_KEY, TAGGO_SUITE_SECRET ou JWT_SECRET.',
      )
    }
    const encrypted = encryptSecret(input.apiKey)
    await pool.query(
      `INSERT INTO org_integration_credentials
         (organization_id, provider, encrypted_api_key, api_base_url, key_prefix,
          external_user_id, external_org_id, scopes, source,
          last_verified_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
       ON CONFLICT (organization_id, provider) DO UPDATE
         SET encrypted_api_key = EXCLUDED.encrypted_api_key,
             api_base_url      = EXCLUDED.api_base_url,
             key_prefix          = EXCLUDED.key_prefix,
             external_user_id    = EXCLUDED.external_user_id,
             external_org_id     = EXCLUDED.external_org_id,
             scopes              = EXCLUDED.scopes,
             source              = EXCLUDED.source,
             last_verified_at    = NOW(),
             updated_at          = NOW()`,
      [
        input.organizationId,
        input.provider,
        encrypted,
        input.apiBaseUrl ?? null,
        input.keyPrefix ?? null,
        input.externalUserId ?? null,
        input.externalOrgId ?? null,
        input.scopes ?? [],
        input.source ?? 'suite_token',
      ],
    )
  }

  async function deleteCredential(
    organizationId: string,
    provider: SuiteApp,
  ): Promise<void> {
    await pool.query(
      `DELETE FROM org_integration_credentials WHERE organization_id = $1 AND provider = $2`,
      [organizationId, provider],
    )
  }

  async function listForProvider(provider: SuiteApp): Promise<OrgIntegrationCredential[]> {
    if (!isSecretCryptoAvailable()) return []
    const { rows } = await pool.query<Row>(
      `SELECT ${SELECT_COLS}
       FROM org_integration_credentials
       WHERE provider = $1
       ORDER BY created_at DESC`,
      [provider],
    )
    const out: OrgIntegrationCredential[] = []
    for (const r of rows) {
      try {
        out.push(rowToCredential(r))
      } catch (err) {
        console.error(
          `[org-credentials] falha ao decifrar credential ${provider} org=${r.organization_id}:`,
          err,
        )
      }
    }
    return out
  }

  return {
    getCredential,
    getStoredCredential,
    saveCredential,
    deleteCredential,
    listForProvider,
  }
}

export type OrgIntegrationCredentialsRepo = ReturnType<
  typeof createOrgIntegrationCredentialsRepo
>
