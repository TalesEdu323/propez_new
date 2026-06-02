import crypto from 'node:crypto';
import type { Pool } from 'pg';
import type { EnvironmentConfig } from '../env.js';
import type { MailClient } from '../mail/client.js';
import { generateContractPdf } from '../contractPdf.js';
import { logIntegrationEvent } from '../../db/mappings.js';
import { notifyProposalEventAsync } from '../notificationService.js';
import { applyClientSignatureToPdf } from './applySignatureToPdf.js';
import { sha256Buffer } from './documentHash.js';
import { resolveOrgSignatureDataUri } from './orgSignatureAsset.js';
import { defaultFieldsForSigner, resolveClientSignatureField } from './signatureDefaults.js';
import { hasClientSignatureField } from './resolveSignatureConfig.js';
import { stampOrgSignatureOnPdf } from './stampOrgSignatureOnPdf.js';
import { readTemplatePdf } from '../contractTemplateStorage.js';
import {
  ensureContractStorage,
  originalPdfRelativePath,
  readPdf,
  writePdf,
} from './signatureStorage.js';
import type { ContractDocumentRow, ContractFieldRow } from './types.js';
import { buildValidityReportPayload } from './validityReportPayload.js';
import { buildFinalSignedPdf } from './validityReportAppendix.js';

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w\s-]/g, '').trim().slice(0, 80) || 'contrato';
}

function createSignToken(): string {
  return `sign_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

function createValidationToken(): string {
  return crypto.randomBytes(16).toString('hex');
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

async function persistFailure(pool: Pool, proposalId: string, organizationId: string, error: string) {
  await pool
    .query(
      `UPDATE propostas SET
         contract_sign_status = 'failed',
         contract_sign_last_sync_at = NOW()
       WHERE id::text = $1 AND organization_id = $2`,
      [proposalId, organizationId],
    )
    .catch(() => {});
  await logIntegrationEvent(pool, {
    source: 'internal',
    event: 'contract_sign.send_failed',
    proposalId,
    organizationId,
    payload: { error },
  }).catch(() => {});
}

export async function sendContractForSigning(deps: {
  pool: Pool;
  envConfig: EnvironmentConfig;
  mail?: MailClient;
  input: SendContractInput;
}): Promise<{ documentId?: string; signingUrl?: string; signToken?: string; error?: string }> {
  const { pool, envConfig, mail, input } = deps;
  const title = (input.contractTitle || `Contrato - ${input.clientName}`).slice(0, 200);
  const sourceType = input.contractSourceType ?? 'text';

  try {
    if (sourceType === 'pdf' && !hasClientSignatureField(input.signatureConfig)) {
      throw new Error(
        'Configure a posição da assinatura do cliente no template de contrato (menu Contratos) antes de enviar para assinatura.',
      );
    }

    await ensureContractStorage();
    const orgSignatureDataUri = await resolveOrgSignatureDataUri({
      signatureUrl: input.companySignatureUrl,
      orgName: input.companyName || 'Organização',
    });

    let pdf: Buffer;
    if (sourceType === 'pdf' && input.templatePdfPath) {
      const templateBuffer = await readTemplatePdf(input.templatePdfPath);
      pdf = await stampOrgSignatureOnPdf(templateBuffer, {
        orgName: input.companyName || 'Organização',
        orgSignatureDataUri,
      });
    } else {
      if (!input.contractText?.trim()) {
        throw new Error('Contrato sem conteúdo para gerar PDF');
      }
      pdf = await generateContractPdf({
        title,
        body: input.contractText,
        clientName: input.clientName,
        clientDocument: input.clientDocument,
        companyName: input.companyName,
        companyCnpj: input.companyCnpj,
        value: input.value,
        location: input.location,
        orgSignatureDataUri,
      });
    }

    const documentHash = sha256Buffer(pdf);
    const validationToken = createValidationToken();
    const fileName = `${sanitizeFileName(title)}.pdf`;

    const { rows: docRows } = await pool.query<ContractDocumentRow>(
      `INSERT INTO contract_documents (
         organization_id, proposta_id, title, file_name, status,
         document_hash, validation_token
       ) VALUES ($1, $2, $3, $4, 'WAITING_SIGNATURES', $5, $6)
       RETURNING *`,
      [input.organizationId, input.proposalId, title, fileName, documentHash, validationToken],
    );
    const document = docRows[0];
    if (!document) throw new Error('Falha ao criar documento');

    const originalPath = originalPdfRelativePath(document.id);
    await writePdf(originalPath, pdf, { pool });
    await pool.query(
      `UPDATE contract_documents SET original_pdf_path = $2 WHERE id = $1`,
      [document.id, originalPath],
    );

    const signerTempId = `signer_${Date.now()}`;
    const { rows: signerRows } = await pool.query<{ id: string }>(
      `INSERT INTO contract_signers (document_id, temp_id, name, email, signer_order, status)
       VALUES ($1, $2, $3, $4, 0, 'PENDING') RETURNING id`,
      [document.id, signerTempId, input.clientName, input.clientEmail.trim().toLowerCase()],
    );
    const signerId = signerRows[0]?.id;

    const fieldConfig = resolveClientSignatureField(input.signatureConfig);
    const fields = defaultFieldsForSigner({
      tempId: signerTempId,
      name: input.clientName,
      email: input.clientEmail.trim().toLowerCase(),
      field: fieldConfig,
    });

    for (const f of fields) {
      await pool.query(
        `INSERT INTO contract_fields (
           document_id, signer_temp_id, signer_name, signer_email, field_type,
           page, x_pct, y_pct, width_pct, height_pct, required
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)`,
        [
          document.id,
          f.signerTempId,
          f.signerName,
          f.signerEmail,
          f.fieldType,
          f.page,
          f.xPct,
          f.yPct,
          f.widthPct,
          f.heightPct,
        ],
      );
    }

    const token = createSignToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO signature_links (
         document_id, signer_id, token, signer_email, signer_name, expires_at,
         authentication_data
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        document.id,
        signerId ?? null,
        token,
        input.clientEmail.trim().toLowerCase(),
        input.clientName,
        expiresAt,
        JSON.stringify({ authOptions: { email: true }, signatureType: 'padrao' }),
      ],
    );

    const baseUrl = envConfig.appUrl.replace(/\/+$/, '');
    const signingUrl = input.publicToken
      ? `${baseUrl}/p/${input.publicToken}/assinar/${token}`
      : `${baseUrl}/assinar/${token}`;

    await pool.query(
      `UPDATE propostas SET
         cliente_email = COALESCE(NULLIF($5, ''), cliente_email),
         cliente_nome = COALESCE(NULLIF($6, ''), cliente_nome),
         contract_sign_document_id = $3,
         contract_signing_url = $4,
         contract_sign_status = 'sent',
         contract_sign_last_sync_at = NOW()
       WHERE id::text = $1 AND organization_id = $2`,
      [
        input.proposalId,
        input.organizationId,
        document.id,
        signingUrl,
        input.clientEmail,
        input.clientName,
      ],
    );

    await pool.query(
      `INSERT INTO usage_counters (organization_id, month_key, contract_signatures, rubrica_assinaturas)
       VALUES ($1, to_char(NOW(), 'YYYY-MM'), 1, 1)
       ON CONFLICT (organization_id, month_key)
       DO UPDATE SET
         contract_signatures = usage_counters.contract_signatures + 1,
         rubrica_assinaturas = usage_counters.rubrica_assinaturas + 1,
         updated_at = NOW()`,
      [input.organizationId],
    );

    await logIntegrationEvent(pool, {
      source: 'internal',
      event: 'contract_sign.sent',
      proposalId: input.proposalId,
      organizationId: input.organizationId,
      payload: { documentId: document.id, signingUrl },
    });

    if (mail) {
      notifyProposalEventAsync({
        pool,
        mail,
        config: envConfig,
        proposalId: input.proposalId,
        type: 'contract_sent',
        metadata: { documentId: document.id, signingUrl, partialPdfPath: originalPath },
      });
    }

    return { documentId: document.id, signingUrl, signToken: token };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao enviar contrato';
    await persistFailure(pool, input.proposalId, input.organizationId, message);
    return { error: message };
  }
}

export async function completeSignature(deps: {
  pool: Pool;
  envConfig: EnvironmentConfig;
  mail?: MailClient;
  token: string;
  signatureImage: string;
  clientIp?: string;
  userAgent?: string;
}): Promise<{ ok: boolean; error?: string; status?: number; alreadyUsed?: boolean }> {
  const { rows: linkRows } = await deps.pool.query<{
    id: string;
    document_id: string;
    signer_email: string;
    signer_name: string;
    expires_at: Date;
    used: boolean;
    used_at: Date | null;
  }>(`SELECT * FROM signature_links WHERE token = $1`, [deps.token]);
  const link = linkRows[0];
  if (!link) return { ok: false, error: 'Link inválido', status: 404 };
  if (link.used) return { ok: true, alreadyUsed: true };
  if (new Date(link.expires_at) < new Date()) {
    return { ok: false, error: 'Link expirado', status: 410 };
  }

  const { rows: docRows } = await deps.pool.query<ContractDocumentRow>(
    `SELECT * FROM contract_documents WHERE id = $1`,
    [link.document_id],
  );
  const document = docRows[0];
  if (!document?.original_pdf_path) {
    return { ok: false, error: 'Documento não encontrado', status: 404 };
  }

  const signatureData = {
    signatureImage: deps.signatureImage,
    ip: deps.clientIp ?? null,
    userAgent: deps.userAgent ?? null,
    signedAt: new Date().toISOString(),
  };

  const usedAt = new Date();
  await deps.pool.query(
    `UPDATE signature_links SET
       used = TRUE, used_at = $2, signature_data = $3::jsonb,
       authentication_data = COALESCE(authentication_data, '{}'::jsonb) ||
         '{"completedMethods":["EMAIL_CONFIRM"]}'::jsonb
     WHERE id = $1`,
    [link.id, usedAt, JSON.stringify(signatureData)],
  );

  const { rows: fieldRows } = await deps.pool.query<ContractFieldRow>(
    `SELECT * FROM contract_fields WHERE document_id = $1`,
    [document.id],
  );

  const { relativePath, buffer: signedPartial } = await applyClientSignatureToPdf({
    pool: deps.pool,
    documentId: document.id,
    originalRelativePath: document.original_pdf_path,
    existingSignedRelativePath: document.signed_pdf_path,
    fields: fieldRows,
    signerEmail: link.signer_email,
    signatureImageDataUrl: deps.signatureImage,
    signedAt: usedAt,
  });

  const payload = await buildValidityReportPayload({
    pool: deps.pool,
    document: { ...document, status: 'SIGNED', updated_at: usedAt },
    appUrl: deps.envConfig.appUrl,
    originalPdfBuffer: await readPdf(document.original_pdf_path, { pool: deps.pool }),
  });

  const finalBuffer = await buildFinalSignedPdf({ signedPdfBuffer: signedPartial, payload });
  const finalPath = relativePath.replace('_signed.pdf', '_final.pdf');
  await writePdf(finalPath, finalBuffer, { pool: deps.pool });

  await deps.pool.query(
    `UPDATE contract_documents SET
       status = 'SIGNED', signed_pdf_path = $2, updated_at = NOW()
     WHERE id = $1`,
    [document.id, finalPath],
  );

  await deps.pool.query(
    `UPDATE contract_signers SET status = 'SIGNED' WHERE document_id = $1`,
    [document.id],
  );

  if (document.proposta_id) {
    const signedUrl = `${deps.envConfig.appUrl.replace(/\/+$/, '')}/api/public/propostas/contract-signed/by-document/${document.id}.pdf`;
    await deps.pool.query(
      `UPDATE propostas SET
         contract_sign_status = 'signed',
         contract_signed_pdf_path = $2,
         contract_sign_last_sync_at = NOW()
       WHERE id = $1`,
      [document.proposta_id, finalPath],
    );

    if (deps.mail) {
      notifyProposalEventAsync({
        pool: deps.pool,
        mail: deps.mail,
        config: deps.envConfig,
        proposalId: String(document.proposta_id),
        type: 'contract_signed',
        metadata: { documentId: document.id, signedPdfPath: finalPath, signedPdfUrl: signedUrl },
      });
    }
  }

  await logIntegrationEvent(deps.pool, {
    source: 'public',
    event: 'contract_sign.completed',
    proposalId: document.proposta_id ? String(document.proposta_id) : undefined,
    organizationId: document.organization_id,
    payload: { documentId: document.id, token: deps.token },
  });

  return { ok: true };
}

export async function getSignatureLinkPublic(deps: {
  pool: Pool;
  token: string;
}): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
  data?: {
    documentId: string;
    title: string;
    signerName: string;
    signerEmail: string;
    used: boolean;
    expiresAt: string;
    previewUrl: string;
  };
}> {
  const { rows } = await deps.pool.query<{
    token: string;
    signer_email: string;
    signer_name: string;
    expires_at: Date;
    used: boolean;
    document_id: string;
    title: string;
  }>(
    `SELECT sl.*, cd.title
     FROM signature_links sl
     JOIN contract_documents cd ON cd.id = sl.document_id
     WHERE sl.token = $1`,
    [deps.token],
  );
  const row = rows[0];
  if (!row) return { ok: false, error: 'Link não encontrado', status: 404 };
  if (new Date(row.expires_at) < new Date()) return { ok: false, error: 'Link expirado', status: 410 };

  return {
    ok: true,
    data: {
      documentId: row.document_id,
      title: row.title,
      signerName: row.signer_name,
      signerEmail: row.signer_email,
      used: row.used,
      expiresAt: row.expires_at.toISOString(),
      previewUrl: `/api/public/sign/${encodeURIComponent(deps.token)}/preview.pdf`,
    },
  };
}

export async function readSignedPdfForDocument(pool: Pool, documentId: string): Promise<Buffer | null> {
  const { rows } = await pool.query<{ signed_pdf_path: string | null; original_pdf_path: string | null }>(
    `SELECT signed_pdf_path, original_pdf_path FROM contract_documents WHERE id = $1`,
    [documentId],
  );
  const path = rows[0]?.signed_pdf_path || rows[0]?.original_pdf_path;
  if (!path) return null;
  return readPdf(path, { pool });
}

export async function readSignedPdfForProposal(pool: Pool, proposalId: string): Promise<Buffer | null> {
  const { rows } = await pool.query<{ contract_sign_document_id: string | null; contract_signed_pdf_path: string | null }>(
    `SELECT contract_sign_document_id, contract_signed_pdf_path FROM propostas WHERE id::text = $1 OR id = $1::uuid`,
    [proposalId],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.contract_signed_pdf_path) {
    try {
      return await readPdf(row.contract_signed_pdf_path, { pool });
    } catch {
      /* fall through */
    }
  }
  if (row.contract_sign_document_id) {
    return readSignedPdfForDocument(pool, row.contract_sign_document_id);
  }
  return null;
}

export async function readPartialPdfForProposal(pool: Pool, proposalId: string): Promise<Buffer | null> {
  const { rows } = await pool.query<{ contract_sign_document_id: string | null }>(
    `SELECT contract_sign_document_id FROM propostas WHERE id::text = $1 OR id = $1::uuid`,
    [proposalId],
  );
  const docId = rows[0]?.contract_sign_document_id;
  if (!docId) return null;
  const { rows: docRows } = await pool.query<{ original_pdf_path: string | null }>(
    `SELECT original_pdf_path FROM contract_documents WHERE id = $1`,
    [docId],
  );
  const p = docRows[0]?.original_pdf_path;
  if (!p) return null;
  return readPdf(p, { pool });
}
