import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import QRCode from 'qrcode';
import type { ValidityReportPayload } from './validityReportPayload.js';
import { formatValidityDateTime } from './validityReportPayload.js';
import { VALIDITY_BRANDING } from './validityBranding.js';

const PAGE = { width: 595, height: 842, margin: 40, bottom: 52 };

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const tryLine = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(tryLine, size) <= maxW) line = tryLine;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export async function appendValidityReportAppendix(
  pdfDoc: PDFDocument,
  payload: ValidityReportPayload,
): Promise<number> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdfDoc.embedFont(StandardFonts.Courier);

  let page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  let y = PAGE.height - PAGE.margin;
  let pagesAdded = 1;

  const ensureSpace = (need: number) => {
    if (y - need < PAGE.bottom) {
      page = pdfDoc.addPage([PAGE.width, PAGE.height]);
      y = PAGE.height - PAGE.margin;
      pagesAdded += 1;
    }
  };

  const draw = (text: string, size: number, f = font, color = rgb(0.15, 0.15, 0.15)) => {
    ensureSpace(size + 8);
    page.drawText(text, { x: PAGE.margin, y, size, font: f, color });
    y -= size + 6;
  };

  draw('Relatório de Validade Jurídica', 16, bold);
  draw('PropEZ · Assinado com Rubrica · Powered by Taggo', 9, font, rgb(0.45, 0.45, 0.45));
  y -= 8;
  draw(`Documento: ${payload.document.title}`, 11, bold);
  draw(`ID: ${payload.document.id}`, 9, mono);
  draw(`Status: ${payload.document.status}`, 9);
  draw(`Código de validação: ${payload.validationCode}`, 10, bold);
  draw(`Hash SHA-256: ${payload.security.documentHash}`, 8, mono);
  y -= 10;

  draw('Signatários', 13, bold);
  for (const sig of payload.signatures) {
    ensureSpace(60);
    draw(`${sig.signerName} <${sig.signerEmail}>`, 10, bold);
    draw(
      sig.used
        ? `Assinado em ${formatValidityDateTime(sig.usedAt)} · ${VALIDITY_BRANDING.signerBadge}`
        : 'Aguardando assinatura',
      9,
    );
    if (sig.ip) draw(`IP: ${sig.ip}`, 8, mono, rgb(0.4, 0.4, 0.4));
    if (sig.device) draw(`Dispositivo: ${sig.device.slice(0, 80)}`, 8, mono, rgb(0.4, 0.4, 0.4));
    y -= 6;
  }

  y -= 8;
  draw('Campos do documento', 13, bold);
  for (const f of payload.documentFields) {
    draw(`${f.type} — ${f.signerName} (pág. ${f.page}) — ${f.used ? 'Preenchido' : 'Pendente'}`, 9);
  }

  y -= 10;
  draw('Linha do tempo', 13, bold);
  draw(`Criado: ${formatValidityDateTime(payload.document.createdAt)}`, 9);
  draw(`Atualizado: ${formatValidityDateTime(payload.document.updatedAt)}`, 9);
  for (const sig of payload.signatures.filter((s) => s.used && s.usedAt)) {
    draw(`Assinatura ${sig.signerName}: ${formatValidityDateTime(sig.usedAt)}`, 9);
  }

  y -= 10;
  draw('Conformidade legal', 13, bold);
  for (const c of payload.security.compliance) {
    draw(`• ${c}`, 9);
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(payload.verificationUrl, { margin: 1, width: 120 });
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrImg = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'));
    ensureSpace(130);
    page.drawImage(qrImg, { x: PAGE.margin, y: y - 120, width: 100, height: 100 });
    draw('Verificar autenticidade:', 9, bold);
    const urlLines = wrapText(payload.verificationUrl, mono, 8, PAGE.width - PAGE.margin * 2);
    for (const ln of urlLines) {
      ensureSpace(12);
      page.drawText(ln, { x: PAGE.margin, y, size: 8, font: mono, color: rgb(0, 0.4, 0.8) });
      y -= 10;
    }
  } catch {
    draw(`Verificação: ${payload.verificationUrl}`, 8, mono);
  }

  y -= 10;
  ensureSpace(40);
  const footer = VALIDITY_BRANDING.legalFooter(payload.document.id);
  for (const ln of wrapText(footer, font, 8, PAGE.width - PAGE.margin * 2)) {
    ensureSpace(12);
    page.drawText(ln, { x: PAGE.margin, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
    y -= 10;
  }
  page.drawText(VALIDITY_BRANDING.confidentialWatermark, {
    x: PAGE.margin,
    y: PAGE.bottom - 8,
    size: 7,
    font,
    color: rgb(0.65, 0.65, 0.65),
  });

  return pagesAdded;
}

export async function buildFinalSignedPdf(input: {
  signedPdfBuffer: Buffer;
  payload: ValidityReportPayload;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(input.signedPdfBuffer);
  await appendValidityReportAppendix(pdfDoc, input.payload);
  return Buffer.from(await pdfDoc.save());
}
