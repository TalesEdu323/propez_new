import { describe, expect, it } from 'vitest';
import { isPdfBytes } from '../pdfPreview';

describe('pdfPreview', () => {
  it('detects PDF magic bytes', () => {
    const buf = new TextEncoder().encode('%PDF-1.4').buffer;
    expect(isPdfBytes(buf)).toBe(true);
  });

  it('rejects JSON error body', () => {
    const buf = new TextEncoder().encode('{"error":"Não autenticado"}').buffer;
    expect(isPdfBytes(buf)).toBe(false);
  });
});
