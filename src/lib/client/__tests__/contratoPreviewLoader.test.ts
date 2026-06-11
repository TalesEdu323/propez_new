import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldLoadPreviewFromBlob, loadContratoPreviewPdf } from '../contratoPreviewLoader.js';
import { mapBlobTokenError } from '../contratoBlobUpload.js';

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const BLOB_PDF = 'https://abc.public.blob.vercel-storage.com/x.pdf';

function mockPdfBlob(): Blob {
  const data = PDF_BYTES;
  return {
    size: data.length,
    arrayBuffer: () =>
      Promise.resolve(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)),
  } as Blob;
}

vi.mock('../../apiClient.js', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../apiClient.js';

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

describe('loadContratoPreviewPdf preferApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(),
    );
  });

  it('tenta API antes do CDN quando preferApi=true', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(mockPdfBlob()),
    } as Response);

    const result = await loadContratoPreviewPdf({
      contratoId: 'c1',
      pdfPath: BLOB_PDF,
      sourceType: 'pdf',
      preferApi: true,
    });

    expect(result.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retorna mensagem de aguarde quando preferApi e CDN/API falham', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);

    const result = await loadContratoPreviewPdf({
      contratoId: 'c1',
      pdfPath: BLOB_PDF,
      sourceType: 'pdf',
      preferApi: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Aguarde alguns segundos/i);
    }
  });

  it('faz fallback CDN→API quando preferApi=false', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('rede'));
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(mockPdfBlob()),
    } as Response);

    const result = await loadContratoPreviewPdf({
      contratoId: 'c1',
      pdfPath: BLOB_PDF,
      sourceType: 'pdf',
      preferApi: false,
    });

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalled();
    expect(apiFetch).toHaveBeenCalled();
  });
});
