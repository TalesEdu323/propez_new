import { describe, expect, it } from 'vitest';
import { isAllowedBlobUrl } from '../../storage/blobStorage.js';

describe('upload-finalize blob URL validation', () => {
  it('aceita URL do Vercel Blob', () => {
    expect(isAllowedBlobUrl('https://abc.public.blob.vercel-storage.com/contract-templates/x.pdf')).toBe(
      true,
    );
  });

  it('rejeita URL externa (upload-finalize retornaria 400)', () => {
    expect(isAllowedBlobUrl('https://evil.example.com/fake.pdf')).toBe(false);
    expect(isAllowedBlobUrl('http://localhost/uploads/x.pdf')).toBe(false);
  });
});
