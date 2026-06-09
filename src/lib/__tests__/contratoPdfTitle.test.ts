import { describe, expect, it } from 'vitest';
import { titleFromPdfFilename } from '../contratoPdfTitle';

describe('titleFromPdfFilename', () => {
  it('remove extensão .pdf', () => {
    expect(titleFromPdfFilename('Contrato.pdf')).toBe('Contrato');
  });

  it('remove só a última extensão', () => {
    expect(titleFromPdfFilename('meu.doc.pdf')).toBe('meu.doc');
  });

  it('usa fallback quando nome fica vazio', () => {
    expect(titleFromPdfFilename('.pdf')).toBe('Contrato PDF');
    expect(titleFromPdfFilename('')).toBe('Contrato PDF');
  });
});
