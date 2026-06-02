import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { VALIDITY_BRANDING } from './validityBranding.js';
import { addPdfUriLink, baselineToLinkRect } from './pdfLinkAnnotation.js';

const LAYOUT = {
  MARGIN_X: 50,
  FOOTER_Y: 18,
  FOOTER_RESERVED_HEIGHT: 64,
  FOOTER_LEGAL_FONT_SIZE: 6,
  FOOTER_DETAIL_FONT_SIZE: 5,
  QR_SIZE: 36,
} as const;

function sanitizeWinAnsiText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, '');
}

export async function applyPropEzPageFooters(input: {
  pdfBuffer: Buffer;
  documentHash: string;
  verificationUrl: string;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(input.pdfBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const hashOriginal = input.documentHash;
  const linkValidacao = input.verificationUrl;
  const footerLegalText =
    'Documento assinado eletronicamente via PropEZ (Lei 14.063/2020 | MP 2.200-2/2001)';

  let qrImage: Awaited<ReturnType<PDFDocument['embedPng']>> | null = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(linkValidacao, { margin: 1, width: 120 });
    const qrBuf = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    qrImage = await pdfDoc.embedPng(qrBuf);
  } catch {
    /* optional */
  }

  const gray = rgb(0.25, 0.25, 0.25);
  const linkBlue = rgb(0, 101 / 255, 1);
  const pageCount = pdfDoc.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i);
    const pageWidth = page.getWidth();
    const footerY = LAYOUT.FOOTER_Y;
    const centerX = pageWidth * 0.28;
    const qrSize = LAYOUT.QR_SIZE;
    const qrX = pageWidth - LAYOUT.MARGIN_X - qrSize;

    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: LAYOUT.FOOTER_RESERVED_HEIGHT,
      color: rgb(0.975, 0.98, 0.995),
    });

    page.drawText(sanitizeWinAnsiText(footerLegalText), {
      x: centerX,
      y: footerY + 24,
      size: LAYOUT.FOOTER_LEGAL_FONT_SIZE,
      font,
      color: gray,
    });
    page.drawText(sanitizeWinAnsiText(`Hash SHA256 do original: ${hashOriginal}`), {
      x: centerX,
      y: footerY + 14,
      size: LAYOUT.FOOTER_DETAIL_FONT_SIZE,
      font,
      color: gray,
    });

    const linkLabelY = footerY + 4;
    const linkPrefix = 'Link de validação: ';
    const linkPrefixSafe = sanitizeWinAnsiText(linkPrefix);
    const linkUrlSafe = sanitizeWinAnsiText(linkValidacao);
    const linkFontSize = LAYOUT.FOOTER_DETAIL_FONT_SIZE;

    page.drawText(linkPrefixSafe, {
      x: centerX,
      y: linkLabelY,
      size: linkFontSize,
      font,
      color: linkBlue,
    });
    const linkPrefixWidth = font.widthOfTextAtSize(linkPrefixSafe, linkFontSize);
    page.drawText(linkUrlSafe, {
      x: centerX + linkPrefixWidth,
      y: linkLabelY,
      size: linkFontSize,
      font,
      color: linkBlue,
    });
    addPdfUriLink(
      pdfDoc,
      page,
      baselineToLinkRect(centerX + linkPrefixWidth, linkLabelY, font.widthOfTextAtSize(linkUrlSafe, linkFontSize), linkFontSize),
      linkValidacao,
    );

    const sensitiveY = Math.max(6, footerY - 4);
    const sensitiveText = sanitizeWinAnsiText('Para dados sensíveis e evidências, clique aqui.');
    page.drawText(sensitiveText, { x: centerX, y: sensitiveY, size: linkFontSize, font, color: linkBlue });
    addPdfUriLink(
      pdfDoc,
      page,
      baselineToLinkRect(centerX, sensitiveY, font.widthOfTextAtSize(sensitiveText, linkFontSize), linkFontSize),
      linkValidacao,
    );

    if (qrImage) {
      page.drawImage(qrImage, { x: qrX, y: footerY, width: qrSize, height: qrSize });
      addPdfUriLink(pdfDoc, page, { x: qrX, y: footerY, width: qrSize, height: qrSize }, linkValidacao);
    }

    page.drawText(sanitizeWinAnsiText(VALIDITY_BRANDING.signerBadge), {
      x: LAYOUT.MARGIN_X,
      y: footerY + 8,
      size: 5,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  return Buffer.from(await pdfDoc.save());
}
