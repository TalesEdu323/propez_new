import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/apiClient';
import { blobToPdfPreviewSource, type PdfPreviewSource } from '../lib/pdfPreview';

const INVALID_PDF_MESSAGE =
  'Resposta inválida do servidor. O conteúdo não é um PDF válido.';
const GENERIC_ERROR_MESSAGE = 'Não foi possível carregar o preview do PDF.';

export function useContratoPreviewPdf(previewUrl: string | null, reloadKey: number) {
  const [pdfSource, setPdfSource] = useState<PdfPreviewSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (url: string, signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    setPdfSource(null);
    try {
      const blob = await api.getBlob(url);
      if (signal.aborted) return;
      const source = await blobToPdfPreviewSource(blob);
      if (signal.aborted) return;
      if (!source) {
        setError(INVALID_PDF_MESSAGE);
        return;
      }
      setPdfSource(source);
    } catch (err) {
      if (signal.aborted) return;
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!previewUrl) {
      setPdfSource(null);
      setLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    void load(previewUrl, controller.signal);
    return () => controller.abort();
  }, [previewUrl, reloadKey, load]);

  const refetch = useCallback(() => {
    if (!previewUrl) return;
    const controller = new AbortController();
    void load(previewUrl, controller.signal);
  }, [previewUrl, load]);

  return { pdfSource, loading, error, refetch };
}
