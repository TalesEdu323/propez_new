import type { Pool } from 'pg';
import type { ContractDocumentRow, ContractFieldRow, SignatureLinkRow } from './types.js';
import { buildValidationCode, sha256Buffer } from './documentHash.js';
import { VALIDITY_BRANDING } from './validityBranding.js';

export interface ValidityReportPayload {
  document: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  signatures: Array<{
    signerName: string;
    signerEmail: string;
    used: boolean;
    usedAt: string | null;
    ip: string | null;
    device: string | null;
    authMethod: string | null;
    signatureImageDataUrl: string | null;
  }>;
  documentFields: Array<{
    type: string;
    signerName: string;
    page: number;
    used: boolean;
  }>;
  security: {
    documentHash: string;
    timestamp: string;
    compliance: string[];
  };
  validationCode: string;
  verificationUrl: string;
}

export function formatValidityDateTime(d: Date | string | null): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export async function buildValidityReportPayload(deps: {
  pool: Pool;
  document: ContractDocumentRow;
  appUrl: string;
  originalPdfBuffer?: Buffer;
}): Promise<ValidityReportPayload> {
  const { rows: links } = await deps.pool.query<SignatureLinkRow>(
    `SELECT * FROM signature_links WHERE document_id = $1 ORDER BY created_at ASC`,
    [deps.document.id],
  );
  const { rows: fields } = await deps.pool.query<ContractFieldRow>(
    `SELECT * FROM contract_fields WHERE document_id = $1 ORDER BY page ASC, y_pct ASC`,
    [deps.document.id],
  );

  let documentHash = deps.document.document_hash || 'N/A';
  if (deps.originalPdfBuffer && !deps.document.document_hash) {
    documentHash = sha256Buffer(deps.originalPdfBuffer);
  }

  const token = deps.document.validation_token || '';
  const verificationUrl = `${deps.appUrl.replace(/\/+$/, '')}/validar/${deps.document.id}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  const usedEmails = new Set(
    links.filter((l) => l.used).map((l) => l.signer_email.trim().toLowerCase()),
  );

  return {
    document: {
      id: deps.document.id,
      title: deps.document.title,
      status: deps.document.status,
      createdAt: deps.document.created_at.toISOString(),
      updatedAt: deps.document.updated_at.toISOString(),
    },
    signatures: links.map((link) => {
      const sig = (link.signature_data || {}) as Record<string, unknown>;
      const auth = (link.authentication_data || {}) as { completedMethods?: string[] };
      const methods = auth.completedMethods || [];
      let authMethod = 'E-mail + Confirmação de conta';
      if (methods.includes('EMAIL_OTP')) authMethod = 'E-mail OTP';
      const img = sig.signatureImage as string | undefined;
      return {
        signerName: link.signer_name,
        signerEmail: link.signer_email,
        used: link.used,
        usedAt: link.used_at ? new Date(link.used_at).toISOString() : null,
        ip: link.used ? ((sig.ip as string) ?? null) : null,
        device: link.used ? ((sig.userAgent as string) ?? null) : null,
        authMethod: link.used ? authMethod : null,
        signatureImageDataUrl:
          img && typeof img === 'string'
            ? img.startsWith('data:')
              ? img
              : `data:image/png;base64,${img}`
            : null,
      };
    }),
    documentFields: fields.map((f) => ({
      type: f.field_type,
      signerName: f.signer_name,
      page: f.page,
      used: usedEmails.has(f.signer_email.trim().toLowerCase()),
    })),
    security: {
      documentHash,
      timestamp: new Date().toISOString(),
      compliance: ['MP 2.200-2/2001', 'Lei 14.063/2020', 'LGPD'],
    },
    validationCode: buildValidationCode(deps.document.id, links.length),
    verificationUrl,
  };
}

export type { ValidityReportPayload as ValidityPayload };
