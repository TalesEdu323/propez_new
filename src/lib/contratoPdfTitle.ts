/** Deriva título legível a partir do nome do arquivo PDF (sem extensão). */
export function titleFromPdfFilename(name: string): string {
  return name.replace(/\.[^/.]+$/, '').trim() || 'Contrato PDF';
}
