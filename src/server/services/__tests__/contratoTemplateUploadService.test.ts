import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  sanitizePdfFileName,
  validatePdfBuffer,
  validatePdfBufferAsync,
} from '../contratoTemplateUploadService.js';

describe('validatePdfBuffer', () => {
  it('rejeita buffer vazio', () => {
    expect(() => validatePdfBuffer(Buffer.alloc(0))).toThrow(/vazio/i);
  });

  it('rejeita buffer que não é PDF', () => {
    expect(() => validatePdfBuffer(Buffer.from('not a pdf'))).toThrow(/não é um PDF válido/i);
  });

  it('aceita magic bytes de PDF', () => {
    expect(() => validatePdfBuffer(Buffer.from('%PDF-1.4\n'))).not.toThrow();
  });
});

describe('validatePdfBufferAsync', () => {
  it('retorna contagem de páginas para PDF válido', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.addPage();
    const bytes = await doc.save();

    const result = await validatePdfBufferAsync(Buffer.from(bytes));
    expect(result.pageCount).toBe(2);
  });

  it('rejeita PDF corrompido', async () => {
    await expect(
      validatePdfBufferAsync(Buffer.from('%PDF-1.4\ncorrupted')),
    ).rejects.toThrow(/inválido|corrompido|senha/i);
  });
});

describe('sanitizePdfFileName', () => {
  it('remove caracteres inválidos e limita tamanho', () => {
    const long = `${'a'.repeat(100)}.pdf`;
    const result = sanitizePdfFileName(long);
    expect(result.length).toBeLessThanOrEqual(120);
    expect(result.endsWith('.pdf')).toBe(true);
  });

  it('usa fallback quando nome fica vazio', () => {
    expect(sanitizePdfFileName('***')).toBe('contrato.pdf');
  });
});
