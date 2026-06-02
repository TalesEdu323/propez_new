import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { markToPdfCoords } from './pdfCoordinates.js';
import type { ContractFieldRow } from './types.js';
import { readPdf, signedPdfRelativePath, writePdf } from './signatureStorage.js';

async function embedImageFromDataUrl(pdfDoc: PDFDocument, dataUrl: string) {
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|svg\+xml);base64,(.+)$/i);
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (m[1].toLowerCase() === 'png') {
    try {
      return await pdfDoc.embedPng(buf);
    } catch {
      return null;
    }
  }
  if (m[1].toLowerCase() === 'svg+xml') {
    return null;
  }
  try {
    return await pdfDoc.embedJpg(buf);
  } catch {
    return null;
  }
}

export async function applyClientSignatureToPdf(input: {
  documentId: string;
  originalRelativePath: string;
  existingSignedRelativePath?: string | null;
  fields: ContractFieldRow[];
  signerEmail: string;
  signatureImageDataUrl: string;
  signedAt: Date;
}): Promise<{ relativePath: string; buffer: Buffer }> {
  const sourcePath = input.existingSignedRelativePath || input.originalRelativePath;
  const pdfBytes = await readPdf(sourcePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const image = await embedImageFromDataUrl(pdfDoc, input.signatureImageDataUrl);
  const emailNorm = input.signerEmail.trim().toLowerCase();
  const signerFields = input.fields.filter(
    (f) => f.field_type === 'SIGNATURE' && f.signer_email.trim().toLowerCase() === emailNorm,
  );
  const fieldsToUse =
    signerFields.length > 0
      ? signerFields
      : [
          {
            page: 1,
            x_pct: 35,
            y_pct: 82,
            width_pct: 30,
            height_pct: 10,
          } as Pick<ContractFieldRow, 'page' | 'x_pct' | 'y_pct' | 'width_pct' | 'height_pct'>,
        ];

  for (const field of fieldsToUse) {
    const pageIndex = Math.max(0, (field.page || 1) - 1);
    if (pageIndex >= pdfDoc.getPageCount()) continue;
    const page = pdfDoc.getPage(pageIndex);
    const { width, height } = page.getSize();
    const coords = markToPdfCoords(width, height, field.x_pct, field.y_pct, field.width_pct, field.height_pct);

    if (image) {
      page.drawImage(image, {
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height,
      });
    } else {
      page.drawRectangle({
        x: coords.x,
        y: coords.y,
        width: coords.width,
        height: coords.height,
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 1,
      });
      page.drawText('Assinado digitalmente', {
        x: coords.x + 4,
        y: coords.y + coords.height / 2,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    page.drawText(
      `Assinado em ${input.signedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
      {
        x: coords.x,
        y: Math.max(8, coords.y - 10),
        size: 6,
        font,
        color: rgb(0.45, 0.45, 0.45),
      },
    );
  }

  const out = Buffer.from(await pdfDoc.save());
  const relativePath = signedPdfRelativePath(input.documentId);
  await writePdf(relativePath, out);
  return { relativePath, buffer: out };
}
