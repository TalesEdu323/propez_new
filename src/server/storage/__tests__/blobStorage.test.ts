import { describe, expect, it } from 'vitest';
import { isAllowedBlobUrl, isBlobUrl } from '../../../lib/blobUrl.js';
import { buildPdfViewUrl, contratoHasRemotePdf } from '../../../lib/pdfViewUrl.js';

describe('pdfViewUrl', () => {
  it('retorna URL Blob sem alterar', () => {
    const url = 'https://abc.public.blob.vercel-storage.com/contract-templates/x.pdf';
    expect(buildPdfViewUrl(url)).toBe(url);
    expect(contratoHasRemotePdf(url)).toBe(true);
  });

  it('prefixa path local com origin', () => {
    expect(buildPdfViewUrl('uploads/foo.pdf', 'https://app.test')).toBe(
      'https://app.test/uploads/foo.pdf',
    );
  });
});

describe('blobStorage helpers', () => {
  it('detecta URLs Blob permitidas', () => {
    expect(isBlobUrl('https://x.public.blob.vercel-storage.com/a.pdf')).toBe(true);
    expect(isAllowedBlobUrl('https://x.public.blob.vercel-storage.com/a.pdf')).toBe(true);
    expect(isAllowedBlobUrl('https://evil.example/a.pdf')).toBe(false);
  });
});
