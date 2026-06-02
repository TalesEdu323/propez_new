import type { Pool } from 'pg';
import type { EnvironmentConfig } from '../env.js';
import type { MailClient } from '../mail/client.js';
import { logIntegrationEvent } from '../db/mappings.js';
import { flowHasStep, parseProposalFlow, getContractSignPhase } from '../../types/proposalFlow.js';
import { notifyProposalEventAsync } from './notificationService.js';
import {
  sendContractForSigning,
  completeSignature,
  readSignedPdfForProposal,
} from './signing/contractSigningService.js';
import { replaceContractString } from '../../lib/contractVariables.js';
import {
  hasSignerSignatureField,
  normalizeSignatureConfig,
  resolveSignatureConfigFromSources,
} from './signing/resolveSignatureConfig.js';

function resolveSignStatus(row: { contract_sign_status?: string | null; rubrica_status?: string | null }) {
  return row.contract_sign_status ?? row.rubrica_status ?? null;
}

export interface SendContractInput {
  proposalId: string;
  organizationId: string;
  clientName: string;
  clientEmail: string;
  contractText: string;
  clientDocument?: string;
  companyName?: string;
  companyCnpj?: string;
  companySignatureUrl?: string | null;
  value?: number;
  location?: string;
  contractTitle?: string;
  publicToken?: string | null;
  signatureConfig?: unknown;
  contractSourceType?: 'text' | 'pdf';
  templatePdfPath?: string | null;
}

export async function sendContractToNativeSigning(deps: {
  pool: Pool;
  envConfig: EnvironmentConfig;
  mail?: MailClient;
  input: SendContractInput;
}) {
  return sendContractForSigning(deps);
}

export async function triggerContractSignAfterApproval(deps: {
  pool: Pool;
  envConfig: EnvironmentConfig;
  mail?: MailClient;
  proposalId: string;
  organizationId: string;
}): Promise<{ ok: boolean; signingUrl?: string; error?: string; skipped?: string }> {
  const { rows } = await deps.pool.query<{
    contrato_texto: string | null;
    contrato_id: string | null;
    cliente_nome: string;
    cliente_email: string | null;
    cliente_documento: string | null;
    fluxo: unknown;
    public_token: string | null;
    valor_cents: number;
    desconto_cents: number;
    org_name: string;
    org_cnpj: string | null;
    org_signature_url: string | null;
    modelo_signature_config: unknown;
    contract_source_type: string | null;
    contract_template_id: string | null;
    contract_pdf_path: string | null;
    contract_has_pdf_data: boolean;
    contrato_signature_config: unknown;
    contract_template_title: string | null;
  }>(
    `SELECT p.contrato_texto, p.contrato_id, p.cliente_nome, p.cliente_email, p.cliente_documento, p.fluxo, p.public_token,
            p.valor_cents, p.desconto_cents,
            o.name AS org_name, o.cnpj AS org_cnpj, o.signature_url AS org_signature_url,
            m.signature_config AS modelo_signature_config,
            ct.source_type AS contract_source_type,
            ct.id::text AS contract_template_id,
            ct.pdf_path AS contract_pdf_path,
            (ct.pdf_data IS NOT NULL) AS contract_has_pdf_data,
            ct.signature_config AS contrato_signature_config,
            ct.titulo AS contract_template_title
     FROM propostas p
     JOIN organizations o ON o.id = p.organization_id
     LEFT JOIN modelos_propostas m ON m.id = p.modelo_id
     LEFT JOIN contratos_templates ct ON ct.id = COALESCE(p.contrato_id, m.contrato_id)
     WHERE p.id::text = $1`,
    [deps.proposalId],
  );
  const row = rows[0];
  const sourceType = row?.contract_source_type === 'pdf' ? 'pdf' : 'text';
  const hasPdfTemplate =
    sourceType === 'pdf' && (!!row?.contract_pdf_path || !!row?.contract_has_pdf_data);
  const hasText = !!row?.contrato_texto?.trim();

  if (!row || (!hasPdfTemplate && !hasText)) {
    return { ok: false, skipped: 'sem_contrato' };
  }
  const fluxo = parseProposalFlow(row.fluxo);
  if (!flowHasStep(fluxo, 'sign')) {
    return { ok: false, skipped: 'sem_passo_sign' };
  }
  const email = row.cliente_email?.trim();
  if (!email) {
    return { ok: false, skipped: 'sem_email' };
  }

  if (sourceType === 'pdf') {
    const norm = normalizeSignatureConfig(row.contrato_signature_config);
    if (!hasSignerSignatureField(norm, 'client') || !hasSignerSignatureField(norm, 'org')) {
      return {
        ok: false,
        error:
          'Configure as assinaturas do Cliente e da Empresa no template de contrato (menu Contratos) antes de enviar.',
      };
    }
  }

  const signatureField = resolveSignatureConfigFromSources(
    row.contrato_signature_config,
    row.modelo_signature_config,
  );

  const contractTitle =
    row.contract_template_title || (hasText ? undefined : `Contrato - ${row.cliente_nome || 'Cliente'}`);

  const resolvedText = hasText
    ? replaceContractString(row.contrato_texto!, {
        clienteNome: row.cliente_nome,
        clienteEmail: row.cliente_email ?? undefined,
        empresaNome: row.org_name,
        empresaCnpj: row.org_cnpj ?? undefined,
        valor: Math.max(0, Number(row.valor_cents) - Number(row.desconto_cents || 0)) / 100,
        assinaturaImagem: row.org_signature_url ?? undefined,
      })
    : '';

  const result = await sendContractForSigning({
    pool: deps.pool,
    envConfig: deps.envConfig,
    mail: deps.mail,
    input: {
      proposalId: deps.proposalId,
      organizationId: deps.organizationId,
      clientName: row.cliente_nome || 'Cliente',
      clientEmail: email,
      contractText: resolvedText,
      clientDocument: row.cliente_documento ?? undefined,
      companyName: row.org_name,
      companyCnpj: row.org_cnpj ?? undefined,
      companySignatureUrl: row.org_signature_url,
      value: Math.max(0, Number(row.valor_cents) - Number(row.desconto_cents || 0)) / 100,
      publicToken: row.public_token,
      signatureConfig:
        sourceType === 'pdf'
          ? row.contrato_signature_config
          : { clientField: signatureField },
      contractSourceType: sourceType,
      templateContratoId: row.contract_template_id,
      templatePdfPath: row.contract_pdf_path,
      contractTitle: contractTitle ?? undefined,
    },
  });

  if (result.error) return { ok: false, error: result.error };
  return { ok: true, signingUrl: result.signingUrl };
}

export async function confirmClientReceipt(deps: {
  pool: Pool;
  token: string;
  envConfig?: EnvironmentConfig;
  mail?: MailClient;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const { rows } = await deps.pool.query<{
    id: string;
    contract_sign_status: string | null;
    rubrica_status: string | null;
    cliente_contrato_recebido_at: string | null;
    organization_id: string;
  }>(
    `SELECT id, contract_sign_status, rubrica_status, cliente_contrato_recebido_at, organization_id
     FROM propostas WHERE public_token = $1`,
    [deps.token],
  );
  const row = rows[0];
  if (!row) return { ok: false, error: 'Proposta não encontrada', status: 404 };
  if (resolveSignStatus(row) !== 'signed') {
    return { ok: false, error: 'Aguarde a assinatura do contrato antes de confirmar o recebimento', status: 409 };
  }
  if (row.cliente_contrato_recebido_at) return { ok: true };

  await deps.pool.query(
    `UPDATE propostas SET cliente_contrato_recebido_at = NOW() WHERE public_token = $1`,
    [deps.token],
  );

  await logIntegrationEvent(deps.pool, {
    source: 'public',
    event: 'contract.client_receipt_confirmed',
    proposalId: String(row.id),
    organizationId: row.organization_id,
    payload: {},
  });

  return { ok: true };
}

export async function acceptContractByOrg(deps: {
  pool: Pool;
  proposalId: string;
  organizationId: string;
  envConfig?: EnvironmentConfig;
  mail?: MailClient;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const { rows } = await deps.pool.query<{
    contract_sign_status: string | null;
    rubrica_status: string | null;
    cliente_contrato_recebido_at: string | null;
    org_contrato_aceito_at: string | null;
    contrato_concluido_at: string | null;
  }>(
    `SELECT contract_sign_status, rubrica_status, cliente_contrato_recebido_at, org_contrato_aceito_at, contrato_concluido_at
     FROM propostas WHERE id = $1 AND organization_id = $2`,
    [deps.proposalId, deps.organizationId],
  );
  const row = rows[0];
  if (!row) return { ok: false, error: 'Proposta não encontrada', status: 404 };
  if (row.contrato_concluido_at || row.org_contrato_aceito_at) return { ok: true };
  if (resolveSignStatus(row) !== 'signed') {
    return { ok: false, error: 'Contrato ainda não assinado pelo cliente', status: 409 };
  }
  if (!row.cliente_contrato_recebido_at) {
    return { ok: false, error: 'Aguarde o cliente confirmar o recebimento do contrato', status: 409 };
  }

  await deps.pool.query(
    `UPDATE propostas SET org_contrato_aceito_at = NOW(), contrato_concluido_at = NOW()
     WHERE id = $1 AND organization_id = $2`,
    [deps.proposalId, deps.organizationId],
  );

  await logIntegrationEvent(deps.pool, {
    source: 'internal',
    event: 'contract.org_accepted',
    proposalId: deps.proposalId,
    organizationId: deps.organizationId,
    payload: {},
  });

  if (deps.mail && deps.envConfig) {
    notifyProposalEventAsync({
      pool: deps.pool,
      mail: deps.mail,
      config: deps.envConfig,
      proposalId: deps.proposalId,
      type: 'contract_signed',
    });
  }

  return { ok: true };
}

export function buildJourneyPayload(proposta: Record<string, unknown>) {
  const fluxo = parseProposalFlow(proposta.fluxo);
  const phase = getContractSignPhase({
    contractSignStatus: (proposta.contract_sign_status ?? proposta.contractSignStatus ?? proposta.rubrica_status ?? proposta.rubricaStatus) as string | null,
    contractSignDocumentId: (proposta.contract_sign_document_id ?? proposta.contractSignDocumentId ?? proposta.rubrica_document_id ?? proposta.rubricaDocumentId) as string | null,
    clienteContratoRecebidoAt: (proposta.cliente_contrato_recebido_at ?? proposta.clienteContratoRecebidoAt) as string | null,
    orgContratoAceitoAt: (proposta.org_contrato_aceito_at ?? proposta.orgContratoAceitoAt) as string | null,
    contratoConcluidoAt: (proposta.contrato_concluido_at ?? proposta.contratoConcluidoAt) as string | null,
  });
  return {
    fluxo,
    contractPhase: phase,
    canPay: !flowHasStep(fluxo, 'sign') || !!(proposta.contrato_concluido_at ?? proposta.org_contrato_aceito_at),
  };
}

export { completeSignature, readSignedPdfForProposal };
