import { useEffect, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { setupPdfWorker } from '../../../lib/pdfSetup';
import type { SignFieldMarker } from './signTypes';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

setupPdfWorker();

function normalizePct(v: number): number {
  return v <= 1 ? v * 100 : v;
}

interface Props {
  fileUrl: string;
  fields?: SignFieldMarker[];
  className?: string;
}

export function SignDocumentViewer({ fileUrl, fields = [], className = '' }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !fileUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg min-h-[400px] ${className}`}>
        <div className="animate-pulse text-gray-500">Carregando documento...</div>
      </div>
    );
  }

  return (
    <Document
      file={fileUrl}
      onLoadSuccess={({ numPages: n }) => setNumPages(n)}
      onLoadError={() => setNumPages(0)}
      loading={
        <div className="flex items-center justify-center bg-gray-100 rounded-lg min-h-[400px]">
          <div className="animate-pulse text-gray-500">Carregando PDF...</div>
        </div>
      }
      error={
        <div className="flex items-center justify-center bg-red-50 rounded-lg min-h-[400px] text-red-600">
          Não foi possível carregar o documento.
        </div>
      }
    >
      {numPages != null &&
        numPages > 0 &&
        Array.from({ length: numPages }, (_, i) => {
          const pageNum = i + 1;
          const pageFields = fields.filter((f) => f.page === pageNum);
          return (
            <div key={pageNum} className="relative inline-block mb-4 shadow-sm bg-white">
              <Page
                pageNumber={pageNum}
                width={Math.min(600, typeof window !== 'undefined' ? window.innerWidth - 48 : 600)}
              />
              {pageFields.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  {pageFields.map((f, idx) => (
                    <div
                      key={`${f.type}-${idx}`}
                      className="absolute border-2 border-[#0066FF] rounded bg-[#0066FF]/10 flex items-center justify-center"
                      style={{
                        left: `${normalizePct(f.xPct)}%`,
                        top: `${normalizePct(f.yPct)}%`,
                        width: `${normalizePct(f.widthPct)}%`,
                        height: `${normalizePct(f.heightPct)}%`,
                      }}
                    >
                      <span className="text-[10px] font-medium text-[#0066FF] opacity-90 text-center px-1">
                        {String(f.type || '').toUpperCase() === 'TEXT'
                          ? 'Texto'
                          : String(f.type || '').toUpperCase() === 'INITIALS'
                            ? 'Rubricar aqui'
                            : 'Assinar aqui'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </Document>
  );
}
