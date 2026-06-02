import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { markToPdfCoords } from './pdfCoordinates.js';
import type { Marcador } from '../../../lib/documents/positioningTypes.js';
import { pctToStorage } from '../../../lib/signatureConfig.js';

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

export interface OrgFieldPlacement {
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

function marcadorToPlacement(m: Marcador, pageCount: number): OrgFieldPlacement {
  return {
    page: Math.min(Math.max(1, m.page), pageCount),
    xPct: pctToStorage(m.xPct),
    yPct: pctToStorage(m.yPct),
    widthPct: pctToStorage(m.widthPct),
    heightPct: pctToStorage(m.heightPct),
  };
}

async function drawOrgSignatureAt(
  pdfDoc: PDFDocument,
  placement: OrgFieldPlacement,
  input: { orgName: string; orgSignatureDataUri?: string | null },
) {
  const pageIndex = Math.max(0, placement.page - 1);
  if (pageIndex >= pdfDoc.getPageCount()) return;
  const page = pdfDoc.getPage(pageIndex);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const coords = markToPdfCoords(
    width,
    height,
    placement.xPct,
    placement.yPct,
    placement.widthPct,
    placement.heightPct,
  );
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
}

async function drawTextField(
  pdfDoc: PDFDocument,
  placement: OrgFieldPlacement,
  content: string,
) {
  const pageIndex = Math.max(0, placement.page - 1);
  if (pageIndex >= pdfDoc.getPageCount()) return;
  const page = pdfDoc.getPage(pageIndex);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const coords = markToPdfCoords(
    width,
    height,
    placement.xPct,
    placement.yPct,
    placement.widthPct,
    placement.heightPct,
  );
  const text = (content || '').trim().slice(0, 500);
  if (!text) return;
  page.drawText(text, {
    x: coords.x + 4,
    y: coords.y + coords.height / 2 - 4,
    size: Math.min(10, Math.max(7, coords.height * 0.35)),
    font,
    color: rgb(0.2, 0.2, 0.2),
    maxWidth: coords.width - 8,
  });
}

/** Carimba campos da org no PDF (assinatura, texto). Fallback: última página 12/88/28/8. */
export async function stampOrgSignatureOnPdf(
  pdfBuffer: Buffer,
  input: {
    orgName: string;
    orgSignatureDataUri?: string | null;
    orgFields?: Marcador[];
  },
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();
  if (pageCount === 0) return pdfBuffer;

  const signatureFields =
    input.orgFields?.filter((f) => f.type === 'signature') ?? [];
  const textFields = input.orgFields?.filter((f) => f.type === 'text') ?? [];

  if (signatureFields.length > 0 || textFields.length > 0) {
    for (const f of textFields) {
      await drawTextField(pdfDoc, marcadorToPlacement(f, pageCount), f.content || '');
    }
    for (const f of signatureFields) {
      await drawOrgSignatureAt(pdfDoc, marcadorToPlacement(f, pageCount), input);
    }
    return Buffer.from(await pdfDoc.save());
  }

  const fallback: OrgFieldPlacement = {
    page: pageCount,
    xPct: 12,
    yPct: 88,
    widthPct: 28,
    heightPct: 8,
  };
  await drawOrgSignatureAt(pdfDoc, fallback, input);
  return Buffer.from(await pdfDoc.save());
}

export function placementsFromLegacy(): OrgFieldPlacement {
  return { page: 1, xPct: 12, yPct: 88, widthPct: 28, heightPct: 8 };
}
