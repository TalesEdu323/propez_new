import { PDFDocument, PDFPage, PDFString } from 'pdf-lib';

export type PdfLinkRect = { x: number; y: number; width: number; height: number };

export function baselineToLinkRect(
  x: number,
  baselineY: number,
  width: number,
  fontSize: number,
  padding = 2,
): PdfLinkRect {
  return {
    x,
    y: Math.max(0, baselineY - padding),
    width: Math.max(1, width),
    height: fontSize + padding * 2,
  };
}

export function addPdfUriLink(pdfDoc: PDFDocument, page: PDFPage, rect: PdfLinkRect, uri: string): void {
  try {
    const normalized = String(uri || '').trim();
    if (!normalized.startsWith('http')) return;
    const ctx = pdfDoc.context;
    const linkDict = ctx.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
      Border: [0, 0, 0],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(normalized),
      },
    });
    const linkRef = ctx.register(linkDict);
    page.node.addAnnot(linkRef);
  } catch (e: unknown) {
    console.warn('[pdf-link] Falha ao adicionar link:', e instanceof Error ? e.message : e);
  }
}
