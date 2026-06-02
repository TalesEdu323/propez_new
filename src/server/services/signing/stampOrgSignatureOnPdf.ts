import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { markToPdfCoords } from './pdfCoordinates.js';

async function embedImageFromDataUrl(pdfDoc: PDFDocument, dataUrl: string) {
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (m[1].toLowerCase() === 'png') {
    try {
      return await pdfDoc.embedPng(buf);
    } catch {
      return null;
    }
  }
  try {
    return await pdfDoc.embedJpg(buf);
  } catch {
    return null;
  }
}

/** Carimba assinatura visual da org no rodapé esquerdo da última página. */
export async function stampOrgSignatureOnPdf(
  pdfBuffer: Buffer,
  input: { orgName: string; orgSignatureDataUri?: string | null },
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();
  if (pageCount === 0) return pdfBuffer;

  const page = pdfDoc.getPage(pageCount - 1);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const coords = markToPdfCoords(width, height, 12, 88, 28, 8);
  const image = input.orgSignatureDataUri
    ? await embedImageFromDataUrl(pdfDoc, input.orgSignatureDataUri)
    : null;

  if (image) {
    page.drawImage(image, {
      x: coords.x,
      y: coords.y,
      width: coords.width,
      height: coords.height,
    });
  } else {
    page.drawText(input.orgName.slice(0, 48), {
      x: coords.x,
      y: coords.y + coords.height / 2,
      size: 10,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });
  }

  page.drawLine({
    start: { x: coords.x, y: coords.y - 4 },
    end: { x: coords.x + coords.width, y: coords.y - 4 },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });
  page.drawText('Contratada', {
    x: coords.x,
    y: coords.y - 14,
    size: 7,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  return Buffer.from(await pdfDoc.save());
}
