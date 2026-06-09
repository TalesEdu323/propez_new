import { useEffect, useState, type ReactNode } from 'react';
import { Document, Page } from 'react-pdf';
import { setupPdfWorker } from '../../lib/pdfSetup';
import type { PdfPreviewSource } from '../../lib/pdfPreview';

setupPdfWorker();

function pdfFileKey(file: PdfPreviewSource): string {
  const { data } = file;
  const len = data.byteLength;
  return `${len}-${data[0] ?? 0}-${data[len - 1] ?? 0}`;
}

export interface PdfDocumentPagesProps {
  file: PdfPreviewSource;
  pageWidth: number;
  /** Páginas a renderizar após load. Padrão: todas as páginas do documento. */
  pageNumbers?: number[];
  renderPageWrap?: (pageNum: number, page: ReactNode) => ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: () => void;
}

/**
 * Wrapper react-pdf que só monta `<Page>` depois de `onLoadSuccess`.
 * Evita crash `sendWithPromise` quando o worker ainda não carregou o documento.
 */
export function PdfDocumentPages({
  file,
  pageWidth,
  pageNumbers,
  renderPageWrap,
  loading,
  error,
  onLoadSuccess,
  onLoadError,
}: PdfDocumentPagesProps) {
  const [loadedPages, setLoadedPages] = useState<number | null>(null);
  const fileKey = pdfFileKey(file);

  useEffect(() => {
    setLoadedPages(null);
  }, [fileKey]);

  const pagesToRender =
    loadedPages != null && loadedPages > 0
      ? (pageNumbers ?? Array.from({ length: loadedPages }, (_, i) => i + 1))
      : [];

  return (
    <Document
      key={fileKey}
      file={file}
      onLoadSuccess={({ numPages }) => {
        setLoadedPages(numPages);
        onLoadSuccess?.(numPages);
      }}
      onLoadError={() => {
        setLoadedPages(0);
        onLoadError?.();
      }}
      loading={loading ?? <p className="text-center text-sm text-zinc-400 py-8">Renderizando PDF…</p>}
      error={
        error ?? (
          <p className="text-center text-sm text-red-600 py-8">Não foi possível exibir o documento.</p>
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
