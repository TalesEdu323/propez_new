import { useCallback, useState } from 'react';
import type { ContratoTemplate } from '../lib/store';
import { store } from '../lib/store';
import { titleFromPdfFilename } from '../lib/contratoPdfTitle';
import {
  ensureContratoDraft,
  formatContratoUploadError,
  removeContratoTemplatePdf,
  uploadContratoTemplatePdf,
} from '../lib/client/contratoUploadService';
import {
  extrairErro,
  logContratoErro,
  logContratoInfo,
  resumirPdfPath,
} from '../lib/client/contratoDiagnostics';

export type UseContratoPdfUploadOptions = {
  currentContrato: Partial<ContratoTemplate> | null;
  setCurrentContrato: React.Dispatch<React.SetStateAction<Partial<ContratoTemplate> | null>>;
  contratos: (ContratoTemplate | undefined)[];
  sourceType: 'text' | 'pdf';
  setSourceType: (type: 'text' | 'pdf') => void;
  onUploadSuccess?: (contrato: ContratoTemplate) => void | Promise<void>;
  onError?: (message: string) => void;
};

export function useContratoPdfUpload({
  currentContrato,
  setCurrentContrato,
  contratos,
  sourceType,
  setSourceType,
  onUploadSuccess,
  onError,
}: UseContratoPdfUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFileSize, setPendingFileSize] = useState<number | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);

  const reportError = useCallback(
    (msg: string) => {
      setUploadError(msg);
      onError?.(msg);
    },
    [onError],
  );

  const clearError = useCallback(() => {
    setUploadError(null);
  }, []);

  const uploadPdf = useCallback(
    async (file: File) => {
      const inferred = titleFromPdfFilename(file.name);
      const titulo = currentContrato?.titulo?.trim() || inferred;

      if (!currentContrato?.titulo?.trim()) {
        setCurrentContrato((prev) => ({ ...prev, titulo }));
      }

      setUploadError(null);
      setUploadProgress(0);
      setPendingFileSize(file.size);
      setPendingFileName(file.name);
      setUploading(true);

      logContratoInfo('upload:ui-inicio', {
        arquivo: file.name,
        bytes: file.size,
        contratoId: currentContrato?.id,
      });

      try {
        const saved = await ensureContratoDraft({
          titulo,
          sourceType,
          currentContrato: currentContrato?.titulo?.trim()
            ? currentContrato
            : { ...currentContrato, titulo },
        });

        setCurrentContrato(saved);
        store.saveContratos(
          contratos.some((c) => c?.id === saved.id)
            ? contratos
                .filter((c): c is ContratoTemplate => !!c?.id)
                .map((c) => (c.id === saved.id ? saved : c))
            : [saved, ...contratos.filter((c): c is ContratoTemplate => !!c?.id)],
        );

        const data = await uploadContratoTemplatePdf({
          contratoId: saved.id,
          file,
          onProgress: setUploadProgress,
        });

        const updated: ContratoTemplate = {
          ...saved,
          ...data,
          titulo: saved.titulo || titulo,
          sourceType: 'pdf',
          pdfPath: data.pdfPath ?? saved.pdfPath,
          pdfFileName: data.pdfFileName ?? file.name,
          pageCount: data.pageCount ?? saved.pageCount ?? 1,
        };

        setCurrentContrato(updated);
        setSourceType('pdf');
        setUploadError(null);
        setPendingFileName(null);
        setUploadProgress(100);

        store.saveContratos(
          contratos.some((c) => c?.id === updated.id)
            ? contratos
                .filter((c): c is ContratoTemplate => !!c?.id)
                .map((c) => (c.id === updated.id ? updated : c))
            : [updated, ...contratos.filter((c): c is ContratoTemplate => !!c?.id)],
        );

        logContratoInfo('upload:ui-ok', {
          contratoId: updated.id,
          pdfPath: resumirPdfPath(updated.pdfPath),
          pageCount: updated.pageCount,
          pdfFileName: updated.pdfFileName,
        });

        await onUploadSuccess?.(updated);
      } catch (err) {
        const msg = formatContratoUploadError(err);
        logContratoErro('upload:ui-falhou', msg, {
          arquivo: file.name,
          bytes: file.size,
          contratoId: currentContrato?.id,
          ...extrairErro(err),
        });
        reportError(msg);
      } finally {
        setUploading(false);
      }
    },
    [
      currentContrato,
      setCurrentContrato,
      contratos,
      sourceType,
      setSourceType,
      onUploadSuccess,
      reportError,
    ],
  );

  const removePdf = useCallback(async () => {
    const contratoId = currentContrato?.id;
    if (!contratoId) {
      setPendingFileSize(null);
      setPendingFileName(null);
      setUploadError(null);
      setUploadProgress(0);
      setCurrentContrato((prev) =>
        prev
          ? {
              ...prev,
              sourceType: 'text',
              pdfFileName: undefined,
              pageCount: undefined,
              pdfPath: undefined,
            }
          : prev,
      );
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const updated = await removeContratoTemplatePdf(contratoId);
      setCurrentContrato(updated);
      setPendingFileSize(null);
      setPendingFileName(null);
      setUploadProgress(0);
      store.saveContratos(
        contratos
          .filter((c): c is ContratoTemplate => !!c?.id)
          .map((c) => (c.id === updated.id ? updated : c)),
      );
    } catch (err) {
      reportError(formatContratoUploadError(err));
    } finally {
      setUploading(false);
    }
  }, [currentContrato?.id, setCurrentContrato, contratos, reportError]);

  return {
    uploading,
    uploadError,
    uploadProgress,
    pendingFileName,
    pendingFileSize,
    uploadPdf,
    removePdf,
    clearError,
    setUploadError: reportError,
  };
}
