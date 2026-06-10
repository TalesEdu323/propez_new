import { isBlobUrl } from './blobUrl.js';

/** Espelha Rubrica `buildPdfViewUrl` — URL pública do Blob ou path local. */
export function buildPdfViewUrl(pdfPath: string, origin?: string): string {
  if (isBlobUrl(pdfPath)) return pdfPath;
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  if (pdfPath.startsWith('/')) return `${base}${pdfPath}`;
  return `${base}/${pdfPath.startsWith('uploads/') ? pdfPath : `uploads/${pdfPath}`}`;
}

export function contratoHasRemotePdf(pdfPath?: string | null): boolean {
  return Boolean(pdfPath && isBlobUrl(pdfPath));
}
