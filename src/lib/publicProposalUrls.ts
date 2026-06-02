/** URL relativa do PDF assinado (proxy público PropEZ). */
export function buildPublicSignedContractPdfUrl(publicToken: string): string {
  return `/api/public/propostas/${encodeURIComponent(publicToken)}/contract-signed.pdf`;
}

/** Normaliza contractSigningUrl para path SPA. */
export function resolveSigningPath(signingUrl: string | null | undefined, publicToken: string): string | null {
  const url = signingUrl;
  if (!url) return null;
  try {
    if (url.startsWith('http')) {
      const u = new URL(url);
      return u.pathname + u.search;
    }
  } catch {
    /* relative */
  }
  if (url.startsWith('/')) return url;
  return `/p/${publicToken}/assinar/${url}`;
}
