import { describe, expect, it } from 'vitest';
import { shouldLoadPreviewFromBlob } from '../contratoPreviewLoader.js';
import { mapBlobTokenError } from '../contratoBlobUpload.js';

describe('shouldLoadPreviewFromBlob', () => {
  it('retorna true para URL Blob', () => {
    expect(
      shouldLoadPreviewFromBlob('https://abc.public.blob.vercel-storage.com/x.pdf'),
    ).toBe(true);
  });

  it('retorna false para path local', () => {
    expect(shouldLoadPreviewFromBlob('uploads/foo.pdf')).toBe(false);
    expect(shouldLoadPreviewFromBlob(null)).toBe(false);
  });
});

describe('mapBlobTokenError', () => {
  it('mapeia 401 para sessão expirada', () => {
    expect(mapBlobTokenError(401, null)).toMatch(/Sessão expirada/i);
  });

  it('mapeia 503 com mensagem Blob', () => {
    expect(
      mapBlobTokenError(503, { error: 'Armazenamento Blob não configurado (BLOB_READ_WRITE_TOKEN).' }),
    ).toMatch(/Armazenamento de PDF não configurado/i);
  });

  it('mapeia 413 para tamanho', () => {
    expect(mapBlobTokenError(413, null)).toMatch(/10 MB/i);
  });

  it('usa mensagem do servidor quando disponível', () => {
    expect(mapBlobTokenError(400, { error: 'Contrato não encontrado' })).toBe('Contrato não encontrado');
  });
});
