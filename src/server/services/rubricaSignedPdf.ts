import type { Pool } from 'pg'
import { createRubricaClient } from '../clients/rubricaClient.js'
import type { IntegrationsConfig } from '../config.js'
import { getMappingByProposal } from '../db/mappings.js'
import { resolveIntegrationForOrg } from '../integrations/resolveIntegrationCredential.js'
import type { EnsureSuiteCredential } from '../integrations/ensureSuiteCredential.js'
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js'

export function buildPublicSignedContractPdfUrl(appUrl: string, publicToken: string): string {
  const base = appUrl.replace(/\/+$/, '')
  return `${base}/api/public/propostas/${encodeURIComponent(publicToken)}/contract-signed.pdf`
}

/** URL de download para e-mails: preferir endpoint público do Propez quando houver token. */
export function resolveSignedPdfUrlForNotification(
  appUrl: string,
  publicToken: string | null,
  rubricaStatus: string | null,
  storedUrl: string | null,
): string | null {
  if (publicToken && rubricaStatus === 'signed') {
    return buildPublicSignedContractPdfUrl(appUrl, publicToken)
  }
  return storedUrl
}

export interface StreamSignedPdfDeps {
  pool: Pool
  integrationsConfig: IntegrationsConfig
  orgCredentialsRepo?: OrgIntegrationCredentialsRepo
  ensureSuiteCredential?: EnsureSuiteCredential
}

export type StreamSignedPdfResult =
  | { ok: true; buffer: Buffer; contentType: string; fileName: string }
  | { ok: false; status: number; error: string }

export async function streamSignedContractByPublicToken(
  deps: StreamSignedPdfDeps,
  publicToken: string,
): Promise<StreamSignedPdfResult> {
  const { rows } = await deps.pool.query<{
    id: string
    organization_id: string
    rubrica_status: string | null
    rubrica_document_id: string | null
    cliente_nome: string | null
  }>(
    `SELECT id, organization_id, rubrica_status, rubrica_document_id, cliente_nome
     FROM propostas WHERE public_token = $1`,
    [publicToken],
  )
  const row = rows[0]
  if (!row) return { ok: false, status: 404, error: 'Proposta não encontrada' }
  if (row.rubrica_status !== 'signed') {
    return { ok: false, status: 409, error: 'Contrato ainda não assinado' }
  }

  let documentId = row.rubrica_document_id
  if (!documentId) {
    const mapping = await getMappingByProposal(deps.pool, String(row.id))
    documentId = mapping?.rubrica_document_id ?? null
  }
  if (!documentId) {
    return { ok: false, status: 404, error: 'Documento Rubrica não encontrado' }
  }

  const resolved = await resolveIntegrationForOrg({
    provider: 'rubrica',
    organizationId: row.organization_id,
    config: deps.integrationsConfig,
    orgCredentialsRepo: deps.orgCredentialsRepo,
    ensureSuiteCredential: deps.ensureSuiteCredential,
  })
  if (!resolved) {
    return { ok: false, status: 503, error: 'Integração Rubrica não configurada' }
  }

  try {
    const client = createRubricaClient({
      baseUrl: resolved.baseUrl,
      apiKey: resolved.apiKey,
    })
    const dl = await client.downloadDocument(documentId, { type: 'signed' })
    const safeName = sanitizeFileName(row.cliente_nome || 'contrato')
    return {
      ok: true,
      buffer: dl.buffer,
      contentType: dl.contentType,
      fileName: dl.fileName || `contrato-assinado-${safeName}.pdf`,
    }
  } catch (err) {
    console.error('[rubricaSignedPdf] download failed:', err)
    return { ok: false, status: 502, error: 'Falha ao obter PDF assinado' }
  }
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\-_. ]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 60) || 'contrato'
}
