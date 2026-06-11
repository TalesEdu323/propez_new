import { useEffect, useState, type ReactNode } from 'react';
import { Document, Page } from 'react-pdf';
import { setupPdfWorker } from '../../lib/pdfSetup';
import type { PdfPreviewSource } from '../../lib/pdfPreview';

setupPdfWorker();

export interface ContratoPdfViewerProps {
  file: string | PdfPreviewSource;
  fileKey?: string | number;
  pageWidth: number;
  pageNumbers?: number[];
  renderPageWrap?: (pageNum: number, page: ReactNode) => ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
  /** true para rotas autenticadas /api/contratos quando file é URL (legado). */
  withCredentials?: boolean;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
}

function resolveFileSource(
  file: string | PdfPreviewSource,
  withCredentials: boolean,
): string | PdfPreviewSource | { url: string; withCredentials: true } {
  if (typeof file !== 'string') return file;
  return withCredentials ? { url: file, withCredentials: true as const } : file;
}

function fileIdentity(file: string | PdfPreviewSource, fileKey?: string | number): string {
  if (fileKey != null) return String(fileKey);
  if (typeof file === 'string') return file;
  return `bytes-${file.data.byteLength}`;
}

/**
 * Viewer react-pdf — bytes autenticados (PdfPreviewSource) ou URL pública.
 */
export function ContratoPdfViewer({
  file,
  fileKey,
  pageWidth,
  pageNumbers,
  renderPageWrap,
  loading,
  error,
  withCredentials = false,
  onLoadSuccess,
  onLoadError,
}: ContratoPdfViewerProps) {
  const [loadedPages, setLoadedPages] = useState<number | null>(null);
  const documentKey = fileIdentity(file, fileKey);

  useEffect(() => {
    setLoadedPages(null);
  }, [documentKey]);

  const pagesToRender =
    loadedPages != null && loadedPages > 0
      ? (pageNumbers ?? Array.from({ length: loadedPages }, (_, i) => i + 1))
      : [];

  const fileSource = resolveFileSource(file, withCredentials);

  return (
    <Document
      key={documentKey}
      file={fileSource}
      onLoadSuccess={({ numPages }) => {
        setLoadedPages(numPages);
        onLoadSuccess?.(numPages);
      }}
      onLoadError={(err) => {
        setLoadedPages(0);
        onLoadError?.(err);
      }}
      loading={
        loading ?? (
          <p className="text-center text-sm text-zinc-400 py-8">Renderizando PDF…</p>
        )
      }
      error={
        error ?? (
          <p className="text-center text-sm text-red-600 py-8">
            Não foi possível renderizar o PDF.
          </p>
        )
      }
    >
      {pagesToRender.map((pageNum) => {
        const page = (
          <Page
            key={`page-${pageNum}`}
            pageNumber={pageNum}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        );
        return renderPageWrap ? (
          <div key={`wrap-${pageNum}`}>{renderPageWrap(pageNum, page)}</div>
        ) : (
          page
        );
      })}
    </Document>
  );
}
