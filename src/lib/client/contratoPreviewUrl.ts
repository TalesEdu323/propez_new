/** URL autenticada para preview PDF do contrato (mesma rota da assinatura pública). */
export function getContratoPreviewPdfUrl(contratoId: string, cacheBust: number = Date.now()): string {
  return `/api/contratos/${contratoId}/preview-pdf?_=${cacheBust}`;
}
