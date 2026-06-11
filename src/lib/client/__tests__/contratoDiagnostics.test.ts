import { describe, expect, it } from 'vitest';
import { resumirPdfPath } from '../contratoDiagnostics';

describe('resumirPdfPath', () => {
  it('resume URL Blob sem expor path completo', () => {
    const res = resumirPdfPath(
      'https://abc.public.blob.vercel-storage.com/contract-templates/id/arquivo.pdf',
    );
    expect(res).toContain('blob.vercel-storage.com');
    expect(res).toContain('arquivo.pdf');
  });

  it('mantém path local', () => {
    expect(resumirPdfPath('uploads/foo.pdf')).toBe('uploads/foo.pdf');
  });
});
