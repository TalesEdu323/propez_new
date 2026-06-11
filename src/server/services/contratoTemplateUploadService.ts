import { PDFDocument } from 'pdf-lib';
import type { Pool } from 'pg';
import { isPdfBuffer } from '../../lib/pdfPreview.js';
import {
  registerTemplatePdfBlobUrl,
  uploadPdfErrorMessage,
  writeTemplatePdf,
} from './contractTemplateStorage.js';

const CONTRATO_SELECT = `id, titulo, texto, source_type, pdf_path, pdf_file_name, page_count, signature_config, created_at`;

export type ValidatePdfResult = {
  pageCount: number;
};

export function validatePdfBuffer(buffer: Buffer): void {
  if (!buffer?.length) {
    throw new Error('Arquivo PDF vazio.');
  }
  if (!isPdfBuffer(buffer)) {
    throw new Error('O arquivo enviado não é um PDF válido.');
  }
}

export async function validatePdfBufferAsync(buffer: Buffer): Promise<ValidatePdfResult> {
  validatePdfBuffer(buffer);
  try {
    const data = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : buffer;
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    if (pageCount === 0) {
      throw new Error('PDF vazio');
    }
    return { pageCount };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/vazio|empty/i.test(msg)) throw err;
    throw new Error('PDF inválido, protegido por senha ou corrompido.');
  }
}

export function sanitizePdfFileName(fileName: string): string {
  return fileName.replace(/[^\w\s.-]/g, '').slice(0, 120) || 'contrato.pdf';
}

export type ProcessTemplatePdfUploadInput = {
  pool: Pool;
  orgId: string;
  contratoId: string;
  buffer: Buffer;
  fileName: string;
  existingPdfPath?: string | null;
  /** Quando informado, registra URL Blob existente em vez de re-upload. */
  blobUrl?: string;
};

export type ProcessTemplatePdfUploadResult = {
  row: Record<string, unknown>;
  pageCount: number;
};

async function persistUploadedPdf(
  pool: Pool,
  orgId: string,
  contratoId: string,
  safeName: string,
  pageCount: number,
  pdfPath: string,
  existingPdfPath?: string | null,
) {
  await registerTemplatePdfBlobUrl(pool, orgId, contratoId, pdfPath, existingPdfPath);
  const { rows } = await pool.query(
    `UPDATE contratos_templates SET
       source_type = 'pdf',
       pdf_path = $3,
       pdf_file_name = $4,
       page_count = $5,
       texto = '',
       pdf_data = NULL
     WHERE organization_id = $1 AND id = $2
     RETURNING ${CONTRATO_SELECT}`,
    [orgId, contratoId, pdfPath, safeName, pageCount],
  );
  if (!rows[0]) {
    throw new Error('Contrato não encontrado para salvar o PDF');
  }
  return rows[0];
}

export async function processTemplatePdfUpload(
  input: ProcessTemplatePdfUploadInput,
): Promise<ProcessTemplatePdfUploadResult> {
  const { pool, orgId, contratoId, buffer, fileName, existingPdfPath, blobUrl } = input;

  try {
    const { pageCount } = await validatePdfBufferAsync(buffer);
    const safeName = sanitizePdfFileName(fileName);

    let pdfPath: string;
    if (blobUrl) {
      pdfPath = blobUrl;
    } else {
      pdfPath = await writeTemplatePdf(pool, orgId, contratoId, buffer, existingPdfPath);
    }

    const row = await persistUploadedPdf(
      pool,
      orgId,
      contratoId,
      safeName,
      pageCount,
      pdfPath,
      existingPdfPath,
    );

    return { row, pageCount };
  } catch (err) {
    if (err instanceof Error && /pdf|vazio|inválido|corrompido|senha/i.test(err.message)) {
      throw err;
    }
    throw new Error(uploadPdfErrorMessage(err));
  }
}
