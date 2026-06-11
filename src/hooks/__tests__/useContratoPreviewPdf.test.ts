import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { api, ApiError } from '../../lib/apiClient';
import { useContratoPreviewPdf } from '../useContratoPreviewPdf';

function pdfBlob(): Blob {
  return new Blob(['%PDF-1.4 test content'], { type: 'application/pdf' });
}

describe('useContratoPreviewPdf', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getBlob');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna pdfSource quando a resposta é PDF válido', async () => {
    vi.mocked(api.getBlob).mockResolvedValue(pdfBlob());
    const { result } = renderHook(() =>
      useContratoPreviewPdf('/api/contratos/abc/preview-pdf?_=1', 1),
    );

    await waitFor(() => {
      expect(result.current.pdfSource).not.toBeNull();
    });

    expect(api.getBlob).toHaveBeenCalledWith('/api/contratos/abc/preview-pdf?_=1');
    expect(result.current.pdfSource?.data).toBeInstanceOf(Uint8Array);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('define erro quando bytes não são PDF', async () => {
    vi.mocked(api.getBlob).mockResolvedValue(
      new Blob(['{"error":"fail"}'], { type: 'application/json' }),
    );
    const { result } = renderHook(() =>
      useContratoPreviewPdf('/api/contratos/abc/preview-pdf?_=1', 1),
    );

    await waitFor(() => {
      expect(result.current.error).toContain('Resposta inválida do servidor');
    });

    expect(result.current.pdfSource).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('propaga mensagem de ApiError', async () => {
    vi.mocked(api.getBlob).mockRejectedValue(new ApiError(404, 'Contrato não encontrado'));
    const { result } = renderHook(() =>
      useContratoPreviewPdf('/api/contratos/missing/preview-pdf?_=1', 1),
    );

    await waitFor(() => {
      expect(result.current.error).toBe('Contrato não encontrado');
    });

    expect(result.current.loading).toBe(false);
  });

  it('limpa estado quando previewUrl é null', async () => {
    vi.mocked(api.getBlob).mockResolvedValue(pdfBlob());
    const { result, rerender } = renderHook(
      ({ url, key }) => useContratoPreviewPdf(url, key),
      { initialProps: { url: '/api/contratos/abc/preview-pdf?_=1' as string | null, key: 1 } },
    );

    await waitFor(() => {
      expect(result.current.pdfSource).not.toBeNull();
    });

    rerender({ url: null, key: 1 });

    expect(result.current.pdfSource).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('refaz fetch quando reloadKey muda', async () => {
    vi.mocked(api.getBlob).mockResolvedValue(pdfBlob());
    const { rerender } = renderHook(
      ({ key }) => useContratoPreviewPdf('/api/contratos/abc/preview-pdf?_=1', key),
      { initialProps: { key: 1 } },
    );

    await waitFor(() => {
      expect(api.getBlob).toHaveBeenCalledTimes(1);
    });

    rerender({ key: 2 });

    await waitFor(() => {
      expect(api.getBlob).toHaveBeenCalledTimes(2);
    });
  });
});
