import type { Pool } from 'pg'

export type ProposalNotificationType =
  | 'proposal_created'
  | 'proposal_viewed'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'contract_sent'
  | 'contract_signed'
  | 'proposal_paid'

export interface ProposalNotificationContext {
  proposalId: string
  organizationId: string
  orgName: string
  orgCnpj: string | null
  clienteNome: string
  clienteEmail: string | null
  clienteEmailFromCliente: string | null
  status: string
  valorCents: number
  descontoCents: number
  valorLiquidoCents: number
  publicToken: string | null
  rubricaStatus: string | null
  rubricaSigningUrl: string | null
  rubricaSignedPdfUrl: string | null
  contratoTitulo: string | null
  dataValidade: string | null
  pago: boolean
  internalUrl: string
  publicUrl: string | null
}

export function buildProposalUrls(appUrl: string, proposalId: string, publicToken: string | null): {
  internalUrl: string
  publicUrl: string | null
} {
  const base = appUrl.replace(/\/+$/, '')
  return {
    internalUrl: `${base}/?route=visualizar-proposta&id=${proposalId}`,
    publicUrl: publicToken ? `${base}/p/${publicToken}` : null,
  }
}

export async function loadProposalNotificationContext(
  pool: Pool,
  proposalId: string,
  appUrl: string,
): Promise<ProposalNotificationContext | null> {
  const { rows } = await pool.query<{
    id: string
    organization_id: string
    org_name: string
    org_cnpj: string | null
    cliente_nome: string
    cliente_email: string
    cliente_email_join: string | null
    status: string
    valor_cents: string | number
    desconto_cents: string | number
    public_token: string | null
    rubrica_status: string | null
    rubrica_signing_url: string | null
    rubrica_signed_pdf_url: string | null
    contrato_titulo: string | null
    data_validade: string | null
    pago: boolean
  }>(
    `SELECT p.id, p.organization_id,
            o.name AS org_name, o.cnpj AS org_cnpj,
            p.cliente_nome, COALESCE(NULLIF(TRIM(p.cliente_email), ''), '') AS cliente_email,
            c.email AS cliente_email_join,
            p.status, p.valor_cents, p.desconto_cents,
            p.public_token, p.rubrica_status, p.rubrica_signing_url, p.rubrica_signed_pdf_url,
            ct.titulo AS contrato_titulo, p.data_validade, p.pago
     FROM propostas p
     JOIN organizations o ON o.id = p.organization_id
     LEFT JOIN clientes c ON c.id = p.cliente_id
     LEFT JOIN contratos_templates ct ON ct.id = p.contrato_id
     WHERE p.id::text = $1 OR p.id = $1::uuid
     LIMIT 1`,
    [proposalId],
  )

  const r = rows[0]
  if (!r) return null

  const valorCents = Number(r.valor_cents ?? 0)
  const descontoCents = Number(r.desconto_cents ?? 0)
  const urls = buildProposalUrls(appUrl, String(r.id), r.public_token)

  const emailFromProposta = r.cliente_email?.trim() || null
  const emailFromCliente = r.cliente_email_join?.trim() || null

  return {
    proposalId: String(r.id),
    organizationId: r.organization_id,
    orgName: r.org_name,
    orgCnpj: r.org_cnpj,
    clienteNome: r.cliente_nome || 'Cliente',
    clienteEmail: emailFromProposta || emailFromCliente,
    clienteEmailFromCliente: emailFromCliente,
    status: r.status,
    valorCents,
    descontoCents,
    valorLiquidoCents: Math.max(0, valorCents - descontoCents),
    publicToken: r.public_token,
    rubricaStatus: r.rubrica_status,
    rubricaSigningUrl: r.rubrica_signing_url,
    rubricaSignedPdfUrl: r.rubrica_signed_pdf_url,
    contratoTitulo: r.contrato_titulo,
    dataValidade: r.data_validade,
    pago: !!r.pago,
    internalUrl: urls.internalUrl,
    publicUrl: urls.publicUrl,
  }
}

export function resolveClientEmail(ctx: ProposalNotificationContext): string | null {
  return ctx.clienteEmail?.trim() || null
}
