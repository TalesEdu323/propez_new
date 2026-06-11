import { describe, expect, it } from 'vitest';
import { blobToPdfPreviewSource, isPdfBytes } from '../pdfPreview';

describe('pdfPreview', () => {
  it('detects PDF magic bytes', () => {
    const buf = new TextEncoder().encode('%PDF-1.4').buffer;
    expect(isPdfBytes(buf)).toBe(true);
  });

  it('rejects JSON error body', () => {
    const buf = new TextEncoder().encode('{"error":"Não autenticado"}').buffer;
    expect(isPdfBytes(buf)).toBe(false);
  });

  it('converte Blob PDF em PdfPreviewSource', async () => {
    const blob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const source = await blobToPdfPreviewSource(blob);
    expect(source?.data).toBeInstanceOf(Uint8Array);
  });
});
