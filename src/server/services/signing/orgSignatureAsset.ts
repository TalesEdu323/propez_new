/**
 * Assinatura visual da organização para PDF (pdfmake: só PNG/JPEG).
 */

import { toPdfMakeImageDataUri } from './pdfImageDataUri.js';

function buildDataUri(contentType: string, base64: string): string {
  const ct = contentType.split(';')[0].trim().toLowerCase();
  if (!/^image\/(png|jpe?g)$/.test(ct)) return '';
  return `data:${ct};base64,${base64}`;
}

export async function resolveOrgSignatureDataUri(input: {
  signatureUrl?: string | null;
  orgName: string;
}): Promise<string | null> {
  const url = input.signatureUrl?.trim();
  if (!url) return null;

  if (url.startsWith('data:image/')) {
    return toPdfMakeImageDataUri(url);
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = res.headers.get('content-type') || 'image/png';
      const dataUri = buildDataUri(ct, buf.toString('base64'));
      return dataUri ? toPdfMakeImageDataUri(dataUri) : null;
    } catch {
      return null;
    }
  }

  return null;
}

/** @deprecated pdfmake não suporta SVG; use null e fallback textual no PDF. */
export function generateTypographicSignature(_orgName: string): null {
  return null;
}
