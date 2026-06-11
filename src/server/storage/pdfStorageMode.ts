import { usesDbPdfStorage } from '../services/pdfStorageEnv.js';

export type PdfStorageMode = 'blob' | 'bytea' | 'disk';

function hasBlobReadWriteToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Modo de armazenamento de PDF de contrato (Blob CDN, BYTEA ou disco local). */
export function getPdfStorageInfo(): { hasBlobToken: boolean; pdfMode: PdfStorageMode } {
  const hasBlobToken = hasBlobReadWriteToken();
  const serverless = usesDbPdfStorage();
  const isProd = process.env.NODE_ENV === 'production';

  if (hasBlobToken && (serverless || isProd)) {
    return { hasBlobToken, pdfMode: 'blob' };
  }
  if (serverless) {
    return { hasBlobToken, pdfMode: 'bytea' };
  }
  return { hasBlobToken, pdfMode: 'disk' };
}

export function shouldUseVercelBlob(): boolean {
  return getPdfStorageInfo().pdfMode === 'blob';
}
