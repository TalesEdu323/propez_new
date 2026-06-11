import { useEffect, useState, type ReactNode } from 'react';
import { Document, Page } from 'react-pdf';
import { setupPdfWorker } from '../../lib/pdfSetup';

setupPdfWorker();

export interface ContratoPdfViewerProps {
  fileUrl: string;
  pageWidth: number;
  pageNumbers?: number[];
  renderPageWrap?: (pageNum: number, page: ReactNode) => ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
  /** true para rotas autenticadas /api/contratos (cookies de sessão). */
  withCredentials?: boolean;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: () => void;
}

/**
 * Viewer react-pdf via URL — padrão da assinatura pública, com suporte a renderPageWrap.
 */
export function ContratoPdfViewer({
  fileUrl,
  pageWidth,
  pageNumbers,
  renderPageWrap,
  loading,
  error,
  withCredentials = true,
  onLoadSuccess,
  onLoadError,
}: ContratoPdfViewerProps) {
  const [loadedPages, setLoadedPages] = useState<number | null>(null);

  useEffect(() => {
    setLoadedPages(null);
  }, [fileUrl]);

  const pagesToRender =
    loadedPages != null && loadedPages > 0
      ? (pageNumbers ?? Array.from({ length: loadedPages }, (_, i) => i + 1))
      : [];

  const fileSource = withCredentials ? { url: fileUrl, withCredentials: true as const } : fileUrl;

  return (
    <Document
      key={fileUrl}
      file={fileSource}
      onLoadSuccess={({ numPages }) => {
        setLoadedPages(numPages);
        onLoadSuccess?.(numPages);
      }}
      onLoadError={() => {
        setLoadedPages(0);
        onLoadError?.();
      }}
      loading={
        loading ?? (
          <p className="text-center text-sm text-zinc-400 py-8">Renderizando PDF…</p>
        )
      }
      error={
        error ?? (
          <p className="text-center text-sm text-red-600 py-8">
            Não foi possível carregar o PDF.
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
