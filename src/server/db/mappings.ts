import type { Pool } from 'pg'

export interface IntegrationMapping {
  propez_proposal_id: string
  organization_id: string | null
  prosync_lead_id: string | null
  rubrica_document_id: string | null
  rubrica_signing_url: string | null
  rubrica_signed_pdf_url: string | null
  status: 'pending' | 'sent' | 'signed' | 'cancelled' | 'failed'
  webhook_secret: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export async function getMappingByProposal(
  pool: Pool,
  proposalId: string,
): Promise<IntegrationMapping | null> {
  const res = await pool.query<IntegrationMapping>(
    `SELECT * FROM integration_mappings WHERE propez_proposal_id = $1`,
    [proposalId],
  )
  return res.rows[0] || null
}

export async function getMappingByDocument(
  pool: Pool,
  documentId: string,
): Promise<IntegrationMapping | null> {
  const res = await pool.query<IntegrationMapping>(
    `SELECT * FROM integration_mappings WHERE rubrica_document_id = $1`,
    [documentId],
  )
  return res.rows[0] || null
}

export async function upsertMapping(
  pool: Pool,
  input: Partial<IntegrationMapping> & { propez_proposal_id: string },
): Promise<IntegrationMapping> {
  const cols = [
    'propez_proposal_id',
    'organization_id',
    'prosync_lead_id',
    'rubrica_document_id',
    'rubrica_signing_url',
    'rubrica_signed_pdf_url',
    'status',
    'webhook_secret',
    'last_error',
  ] as const

  const values = cols.map((c) => (c in input ? (input as any)[c] : null))

  const res = await pool.query<IntegrationMapping>(
    `INSERT INTO integration_mappings (
       propez_proposal_id, organization_id, prosync_lead_id, rubrica_document_id,
       rubrica_signing_url, rubrica_signed_pdf_url, status,
       webhook_secret, last_error
     ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'pending'), $8, $9)
     ON CONFLICT (propez_proposal_id) DO UPDATE SET
       organization_id = COALESCE(EXCLUDED.organization_id, integration_mappings.organization_id),
       prosync_lead_id = COALESCE(EXCLUDED.prosync_lead_id, integration_mappings.prosync_lead_id),
       rubrica_document_id = COALESCE(EXCLUDED.rubrica_document_id, integration_mappings.rubrica_document_id),
       rubrica_signing_url = COALESCE(EXCLUDED.rubrica_signing_url, integration_mappings.rubrica_signing_url),
       rubrica_signed_pdf_url = COALESCE(EXCLUDED.rubrica_signed_pdf_url, integration_mappings.rubrica_signed_pdf_url),
       status = COALESCE(EXCLUDED.status, integration_mappings.status),
       webhook_secret = COALESCE(EXCLUDED.webhook_secret, integration_mappings.webhook_secret),
       last_error = EXCLUDED.last_error
     RETURNING *`,
    values,
  )
  return res.rows[0]
}

export async function logIntegrationEvent(
  pool: Pool,
  input: {
    source: 'rubrica' | 'prosync' | 'internal'
    event: string
    proposalId?: string | null
    organizationId?: string | null
    payload: Record<string, unknown>
    signatureValid?: boolean | null
  },
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO integration_events
         (source, event, proposal_id, organization_id, payload, signature_valid)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        input.source,
        input.event,
        input.proposalId ?? null,
        input.organizationId ?? null,
        JSON.stringify(input.payload),
        input.signatureValid ?? null,
      ],
    )
  } catch (err) {
    console.error('[logIntegrationEvent] failed:', err)
  }
}
