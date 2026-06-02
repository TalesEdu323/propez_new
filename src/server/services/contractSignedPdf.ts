import type { Pool } from 'pg';
import { flowHasStep, parseProposalFlow } from '../../types/proposalFlow.js';

export function resolveSignedPdfUrlForNotification(
  appUrl: string,
  publicToken: string | null,
  signStatus: string | null,
  _legacyPath?: string | null,
): string | null {
  if (signStatus !== 'signed' || !publicToken) return null;
  const base = appUrl.replace(/\/+$/, '');
  return `${base}/api/public/propostas/${encodeURIComponent(publicToken)}/contract-signed.pdf`;
}

export async function loadPdfAttachmentForProposal(
  pool: Pool,
  proposalId: string,
  variant: 'partial' | 'signed',
): Promise<{ filename: string; content: Buffer } | null> {
  const { readSignedPdfForProposal, readPartialPdfForProposal } = await import('./signing/contractSigningService.js');
  const { rows } = await pool.query<{ cliente_nome: string; contract_sign_status: string | null; rubrica_status: string | null }>(
    `SELECT cliente_nome, contract_sign_status, rubrica_status FROM propostas WHERE id::text = $1 OR id = $1::uuid`,
    [proposalId],
  );
  const row = rows[0];
  if (!row) return null;
  const status = row.contract_sign_status ?? row.rubrica_status;
  const safeName = (row.cliente_nome || 'cliente').replace(/[^\w\s-]/g, '').trim().slice(0, 40) || 'cliente';

  if (variant === 'signed' && status === 'signed') {
    const buf = await readSignedPdfForProposal(pool, proposalId);
    if (!buf) return null;
    return { filename: `Contrato-${safeName}-assinado.pdf`, content: buf };
  }

  if (variant === 'partial') {
    const buf = await readPartialPdfForProposal(pool, proposalId);
    if (!buf) return null;
    return { filename: `Contrato-${safeName}.pdf`, content: buf };
  }

  return null;
}

export async function resolveProposalEmailAttachment(
  pool: Pool,
  proposalId: string,
): Promise<{ filename: string; content: Buffer } | null> {
  const { rows } = await pool.query<{
    contrato_texto: string | null;
    contrato_id: string | null;
    fluxo: unknown;
    contract_sign_status: string | null;
    rubrica_status: string | null;
    cliente_nome: string;
    contract_source_type: string | null;
    contract_pdf_path: string | null;
  }>(
    `SELECT p.contrato_texto, p.contrato_id, p.fluxo, p.contract_sign_status, p.rubrica_status, p.cliente_nome,
            ct.source_type AS contract_source_type, ct.pdf_path AS contract_pdf_path
     FROM propostas p
     LEFT JOIN contratos_templates ct ON ct.id = p.contrato_id
     WHERE p.id::text = $1 OR p.id = $1::uuid`,
    [proposalId],
  );
  const row = rows[0];
  const hasPdf = row?.contract_source_type === 'pdf' && !!row?.contract_pdf_path;
  if (!row || (!row.contrato_texto?.trim() && !hasPdf)) return null;
  const fluxo = parseProposalFlow(row.fluxo);
  if (!flowHasStep(fluxo, 'sign')) return null;

  const status = row.contract_sign_status ?? row.rubrica_status;
  if (status === 'signed') {
    return loadPdfAttachmentForProposal(pool, proposalId, 'signed');
  }
  return loadPdfAttachmentForProposal(pool, proposalId, 'partial');
}
