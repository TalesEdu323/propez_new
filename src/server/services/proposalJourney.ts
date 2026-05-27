import crypto from 'crypto';
import type { Pool } from 'pg';
import { createRubricaClient } from '../clients/rubricaClient.js';
import type { IntegrationsConfig } from '../config.js';
import type { EnvironmentConfig } from '../env.js';
import { logIntegrationEvent, upsertMapping } from '../db/mappings.js';
import type { EnsureSuiteCredential } from '../integrations/ensureSuiteCredential.js';
import { resolveIntegrationForOrg } from '../integrations/resolveIntegrationCredential.js';
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js';
import { generateContractPdf } from './contractPdf.js';
import { flowHasStep, parseProposalFlow, getContractSignPhase } from '../../types/proposalFlow.js';
import { notifyProposalEventAsync } from './notificationService.js';
import type { MailClient } from '../mail/client.js';

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w\s-]/g, '').trim().slice(0, 80) || 'contrato';
}

async function persistRubricaFailure(
  pool: Pool,
  proposalId: string,
  organizationId: string,
  error: string,
): Promise<void> {
  await pool
    .query(
      `UPDATE propostas SET
         rubrica_status = 'failed',
         rubrica_last_sync_at = NOW()
       WHERE id::text = $1 AND organization_id = $2`,
      [proposalId, organizationId],
    )
    .catch((err) => console.error('[proposalJourney] persistRubricaFailure:', err));

  await logIntegrationEvent(pool, {
    source: 'internal',
    event: 'rubrica.send_failed',
    proposalId,
    organizationId,
    payload: { error },
  }).catch(() => {});
}

export interface SendRubricaInput {
  proposalId: string;
  organizationId: string;
  clientName: string;
  clientEmail: string;
  contractText: string;
  clientDocument?: string;
  companyName?: string;
  companyCnpj?: string;
  value?: number;
  location?: string;
  contractTitle?: string;
  prosyncLeadId?: string | null;
  publicToken?: string | null;
}

export async function sendContractToRubrica(deps: {
  pool: Pool;
  integrationsConfig: IntegrationsConfig;
  envConfig: EnvironmentConfig;
  orgCredentialsRepo?: OrgIntegrationCredentialsRepo;
  ensureSuiteCredential?: EnsureSuiteCredential;
  ownerEmail?: string;
  mail?: MailClient;
  input: SendRubricaInput;
}): Promise<{ documentId?: string; signingUrl?: string; error?: string }> {
  const {
    pool,
    integrationsConfig,
    envConfig,
    orgCredentialsRepo,
    ensureSuiteCredential,
    ownerEmail,
    mail,
    input,
  } = deps;
  const resolved = await resolveIntegrationForOrg({
    provider: 'rubrica',
    organizationId: input.organizationId,
    ownerEmail,
    config: integrationsConfig,
    orgCredentialsRepo,
    ensureSuiteCredential,
  });
  if (!resolved) {
    const error = 'Integração Rubrica não configurada para esta organização';
    await persistRubricaFailure(pool, input.proposalId, input.organizationId, error);
    return { error };
  }

  const rb = createRubricaClient({
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
  });

  const title = (input.contractTitle || `Contrato - ${input.proposalId}`).slice(0, 200);

  try {
    const pdf = await generateContractPdf({
      title,
      body: input.contractText,
      clientName: input.clientName,
      clientDocument: input.clientDocument,
      companyName: input.companyName,
      companyCnpj: input.companyCnpj,
      value: input.value,
      location: input.location,
    });

    const secret = crypto.randomBytes(12).toString('hex');
    await upsertMapping(pool, {
      propez_proposal_id: input.proposalId,
      organization_id: input.organizationId,
      prosync_lead_id: input.prosyncLeadId ?? null,
      webhook_secret: secret,
      status: 'pending',
    });

    const uploadRes = await rb.uploadDocument({
      fileBuffer: pdf,
      fileName: `${sanitizeFileName(title)}.pdf`,
      title,
    });
    const documentId = uploadRes.document.id;

    const baseUrl = envConfig.appUrl.replace(/\/+$/, '');
    const webhookUrl = `${baseUrl}/api/webhooks/rubrica?secret=${encodeURIComponent(secret)}`;
    const redirectUrl = input.publicToken
      ? `${baseUrl}/p/${input.publicToken}?step=sign&rubrica=done`
      : undefined;

    const sendRes = await rb.sendForSignature({
      documentId,
      signers: [
        {
          name: input.clientName,
          email: input.clientEmail,
          signatureType: 'padrao',
          authOptions: { email: true },
        },
      ],
      webhookUrl,
      externalId: input.proposalId,
      sendingMethod: 'email',
      redirectUrl,
    });

    const signingUrl = sendRes.signatureLinks?.[0]?.link ?? null;

    await upsertMapping(pool, {
      propez_proposal_id: input.proposalId,
      organization_id: input.organizationId,
      rubrica_document_id: documentId,
      rubrica_signing_url: signingUrl,
      status: 'sent',
    });

    await pool.query(
      `UPDATE propostas SET
         cliente_email = COALESCE(NULLIF($5, ''), cliente_email),
         cliente_nome = COALESCE(NULLIF($6, ''), cliente_nome),
         rubrica_document_id = $3,
         rubrica_signing_url = $4,
         rubrica_status = 'sent',
         rubrica_last_sync_at = NOW()
       WHERE id::text = $1 AND organization_id = $2`,
      [
        input.proposalId,
        input.organizationId,
        documentId,
        signingUrl,
        input.clientEmail,
        input.clientName,
      ],
    );

    await logIntegrationEvent(pool, {
      source: 'internal',
      event: 'rubrica.sent',
      proposalId: input.proposalId,
      organizationId: input.organizationId,
      payload: { documentId, signingUrl, redirectUrl },
    });

    if (mail) {
      notifyProposalEventAsync({
        pool,
        mail,
        config: envConfig,
        proposalId: input.proposalId,
        type: 'contract_sent',
        metadata: { documentId, signingUrl },
      });
    }

    return { documentId, signingUrl: signingUrl ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao enviar contrato';
    await upsertMapping(pool, {
      propez_proposal_id: input.proposalId,
      organization_id: input.organizationId,
      status: 'failed',
      last_error: message,
    }).catch(() => {});
    await persistRubricaFailure(pool, input.proposalId, input.organizationId, message);
    return { error: message };
  }
}

export async function triggerRubricaAfterApproval(deps: {
  pool: Pool;
  integrationsConfig: IntegrationsConfig;
  envConfig: EnvironmentConfig;
  orgCredentialsRepo?: OrgIntegrationCredentialsRepo;
  ensureSuiteCredential?: EnsureSuiteCredential;
  mail?: MailClient;
  proposalId: string;
  organizationId: string;
}): Promise<void> {
  const { rows } = await deps.pool.query<{
    contrato_texto: string | null;
    cliente_nome: string;
    cliente_email: string | null;
    fluxo: unknown;
    public_token: string | null;
    valor_cents: number;
    desconto_cents: number;
    prosync_lead_id: string | null;
    org_name: string;
    org_cnpj: string | null;
    owner_email: string | null;
  }>(
    `SELECT p.contrato_texto, p.cliente_nome, p.cliente_email, p.fluxo, p.public_token,
            p.valor_cents, p.desconto_cents, p.prosync_lead_id,
            o.name AS org_name, o.cnpj AS org_cnpj,
            (
              SELECT u.email FROM memberships m
              JOIN users u ON u.id = m.user_id
              WHERE m.organization_id = p.organization_id AND m.role = 'owner'
              ORDER BY m.created_at ASC
              LIMIT 1
            ) AS owner_email
     FROM propostas p
     JOIN organizations o ON o.id = p.organization_id
     WHERE p.id::text = $1`,
    [deps.proposalId],
  );
  const row = rows[0];
  if (!row?.contrato_texto?.trim()) {
    console.info('[proposalJourney] Rubrica skip: proposta sem contrato_texto', deps.proposalId);
    return;
  }
  const fluxo = parseProposalFlow(row.fluxo);
  if (!flowHasStep(fluxo, 'sign')) {
    console.info('[proposalJourney] Rubrica skip: fluxo sem passo sign', deps.proposalId);
    return;
  }

  const email = row.cliente_email?.trim();
  if (!email) {
    console.info('[proposalJourney] Rubrica skip: cliente sem e-mail', deps.proposalId);
    return;
  }

  const result = await sendContractToRubrica({
    ...deps,
    ownerEmail: row.owner_email ?? undefined,
    input: {
      proposalId: deps.proposalId,
      organizationId: deps.organizationId,
      clientName: row.cliente_nome || 'Cliente',
      clientEmail: email,
      contractText: row.contrato_texto,
      companyName: row.org_name,
      companyCnpj: row.org_cnpj ?? undefined,
      value: Math.max(0, Number(row.valor_cents) - Number(row.desconto_cents || 0)) / 100,
      prosyncLeadId: row.prosync_lead_id,
      publicToken: row.public_token,
    },
  });

  if (result.error) {
    console.error('[proposalJourney] Rubrica send failed:', deps.proposalId, result.error);
  }
}

export async function confirmClientReceipt(deps: {
  pool: Pool;
  token: string;
  envConfig?: EnvironmentConfig;
  mail?: MailClient;
}): Promise<{ ok: boolean; error?: string; status?: number }> {
  const { rows } = await deps.pool.query<{
    id: string;
    rubrica_status: string | null;
    cliente_contrato_recebido_at: string | null;
    organization_id: string;
  }>(
    `SELECT id, rubrica_status, cliente_contrato_recebido_at, organization_id
     FROM propostas WHERE public_token = $1`,
    [deps.token],
  );
  const row = rows[0];
  if (!row) return { ok: false, error: 'Proposta não encontrada', status: 404 };
  if (row.rubrica_status !== 'signed') {
    return { ok: false, error: 'Aguarde a assinatura do contrato antes de confirmar o recebimento', status: 409 };
  }
  if (row.cliente_contrato_recebido_at) {
    return { ok: true };
  }

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

  if (deps.mail && deps.envConfig) {
    notifyProposalEventAsync({
      pool: deps.pool,
      mail: deps.mail,
      config: deps.envConfig,
      proposalId: String(row.id),
      type: 'contract_signed',
    });
  }

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
    rubrica_status: string | null;
    cliente_contrato_recebido_at: string | null;
    org_contrato_aceito_at: string | null;
    contrato_concluido_at: string | null;
  }>(
    `SELECT rubrica_status, cliente_contrato_recebido_at, org_contrato_aceito_at, contrato_concluido_at
     FROM propostas WHERE id = $1 AND organization_id = $2`,
    [deps.proposalId, deps.organizationId],
  );
  const row = rows[0];
  if (!row) return { ok: false, error: 'Proposta não encontrada', status: 404 };
  if (row.contrato_concluido_at || row.org_contrato_aceito_at) return { ok: true };
  if (row.rubrica_status !== 'signed') {
    return { ok: false, error: 'Contrato ainda não assinado pelo cliente', status: 409 };
  }
  if (!row.cliente_contrato_recebido_at) {
    return { ok: false, error: 'Aguarde o cliente confirmar o recebimento do contrato', status: 409 };
  }

  await deps.pool.query(
    `UPDATE propostas SET
       org_contrato_aceito_at = NOW(),
       contrato_concluido_at = NOW()
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
    rubricaStatus: proposta.rubrica_status as string | null,
    clienteContratoRecebidoAt: proposta.cliente_contrato_recebido_at as string | null,
    orgContratoAceitoAt: proposta.org_contrato_aceito_at as string | null,
    contratoConcluidoAt: proposta.contrato_concluido_at as string | null,
  });
  return {
    fluxo,
    contractPhase: phase,
    canPay: !flowHasStep(fluxo, 'sign') || !!(proposta.contrato_concluido_at ?? proposta.org_contrato_aceito_at),
  };
}
