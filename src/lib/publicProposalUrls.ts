/** URL relativa do PDF assinado (proxy público Propez → Rubrica). */
export function buildPublicSignedContractPdfUrl(publicToken: string): string {
  return `/api/public/propostas/${encodeURIComponent(publicToken)}/contract-signed.pdf`;
}
