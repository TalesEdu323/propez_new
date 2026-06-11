import { describe, expect, it } from 'vitest';
import { getContratoPreviewPdfUrl } from '../contratoPreviewUrl.js';

describe('getContratoPreviewPdfUrl', () => {
  it('gera path da API com cache bust', () => {
    expect(getContratoPreviewPdfUrl('abc-123', 999)).toBe(
      '/api/contratos/abc-123/preview-pdf?_=999',
    );
  });
});
