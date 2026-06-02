import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Document, Page } from 'react-pdf';
import {
  ChevronLeft,
  ChevronRight,
  PenTool,
  Type,
  Trash2,
  Users,
} from 'lucide-react';
import type { Marcador, PositioningSigner, TipoMarcador } from '../../lib/documents/positioningTypes';
import { createId } from '../../lib/documents/positioningTypes';
import {
  DEFAULT_HEIGHT_PCT,
  DEFAULT_WIDTH_PCT,
  getSignerColorByIndex,
  hexToRgba,
} from '../../lib/documents/positioningConstants';
import { setupPdfWorker } from '../../lib/pdfSetup';

setupPdfWorker();

const PAGE_ASPECT = 1123 / 794;

export interface RubricaSignaturePositioningPanelProps {
  signers: PositioningSigner[];
  marcadores: Marcador[];
  setMarcadores: React.Dispatch<React.SetStateAction<Marcador[]>>;
  selectedSignerId: string | null;
  onSelectSigner: (id: string) => void;
  documentPages: number;
  currentPage: number;
  onCurrentPageChange: (page: number) => void;
  pdfUrl: string | null;
  loading?: boolean;
  error?: string | null;
  onNotify?: (message: string) => void;
}

type PendingClick = { xPct: number; yPct: number; page: number };

const TYPE_LABELS: Record<TipoMarcador, string> = {
  signature: 'Assinar',
  initials: 'Rubricar',
  text: 'Texto',
};

export function RubricaSignaturePositioningPanel({
  signers,
  marcadores,
  setMarcadores,
  selectedSignerId,
  onSelectSigner,
  documentPages,
  currentPage,
  onCurrentPageChange,
  pdfUrl,
  loading,
  error,
  onNotify,
}: RubricaSignaturePositioningPanelProps) {
  const [pendingClick, setPendingClick] = useState<PendingClick | null>(null);
  const [pageWidth, setPageWidth] = useState(794);
  const [numPages, setNumPages] = useState(documentPages);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{
    id: string;
    page: number;
    startX: number;
    startY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);
  const resizingRef = useRef<{
    id: string;
    startW: number;
    startH: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    setNumPages(Math.max(documentPages, numPages));
  }, [documentPages, numPages]);

  useEffect(() => {
    if (signers.length > 0 && !selectedSignerId) {
      onSelectSigner(signers[0].id);
    }
  }, [signers, selectedSignerId, onSelectSigner]);

  useEffect(() => {
    const updateWidth = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const w = container.clientWidth - 48;
      if (w > 0) setPageWidth(Math.min(794, w));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [pdfUrl]);

  const getPageRect = useCallback((pageNum: number) => {
    return pageRefs.current[pageNum]?.getBoundingClientRect() ?? null;
  }, []);

  const notify = (msg: string) => onNotify?.(msg);

  const resolveSignerId = (): string | null => {
    if (!selectedSignerId) {
      notify('Selecione Cliente ou Empresa na lista à esquerda.');
      return null;
    }
    return selectedSignerId;
  };

  const createMarcador = (type: TipoMarcador, xPct: number, yPct: number, page: number) => {
    const signerId = resolveSignerId();
    if (!signerId) return;
    const item: Marcador = {
      id: createId(),
      signerId,
      type,
      page,
      xPct: Math.max(0, Math.min(1, xPct)),
      yPct: Math.max(0, Math.min(1, yPct)),
      widthPct: DEFAULT_WIDTH_PCT,
      heightPct: DEFAULT_HEIGHT_PCT,
      content: type === 'text' ? '' : undefined,
      fontKey: type === 'text' ? 'aletheia' : undefined,
    };
    setMarcadores((prev) => [...prev, item]);
    setPendingClick(null);
  };

  const handleCanvasClick = (e: React.MouseEvent, pageNum: number) => {
    const rect = getPageRect(pageNum);
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    for (const m of marcadores.filter((f) => f.page === pageNum)) {
      const mw = m.widthPct * rect.width;
      const mh = m.heightPct * rect.height;
      const mx = m.xPct * rect.width;
      const my = m.yPct * rect.height;
      if (
        clickX >= mx - mw / 2 &&
        clickX <= mx + mw / 2 &&
        clickY >= my - mh / 2 &&
        clickY <= my + mh / 2
      ) {
        return;
      }
    }

    const xPct = Math.min(Math.max(clickX / rect.width, 0), 1);
    const yPct = Math.min(Math.max(clickY / rect.height, 0), 1);
    setPendingClick({ xPct, yPct, page: pageNum });
    onCurrentPageChange(pageNum);
  };

  const removeMarcador = (id: string) => {
    setMarcadores((prev) => prev.filter((m) => m.id !== id));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        const rect = getPageRect(draggingRef.current.page);
        if (!rect) return;
        const dx = (e.clientX - draggingRef.current.startX) / rect.width;
        const dy = (e.clientY - draggingRef.current.startY) / rect.height;
        setMarcadores((prev) =>
          prev.map((m) =>
            m.id === draggingRef.current!.id
              ? {
                  ...m,
                  xPct: Math.max(0.05, Math.min(0.95, draggingRef.current!.startXPct + dx)),
                  yPct: Math.max(0.05, Math.min(0.95, draggingRef.current!.startYPct + dy)),
                }
              : m,
          ),
        );
      }
      if (resizingRef.current) {
        const field = marcadores.find((f) => f.id === resizingRef.current!.id);
        if (!field) return;
        const rect = getPageRect(field.page);
        if (!rect) return;
        const dw = (e.clientX - resizingRef.current.startX) / rect.width;
        const dh = (e.clientY - resizingRef.current.startY) / rect.height;
        setMarcadores((prev) =>
          prev.map((m) =>
            m.id === resizingRef.current!.id
              ? {
                  ...m,
                  widthPct: Math.max(0.08, Math.min(0.6, resizingRef.current!.startW + dw)),
                  heightPct: Math.max(0.06, Math.min(0.4, resizingRef.current!.startH + dh)),
                }
              : m,
          ),
        );
      }
    };
    const onUp = () => {
      draggingRef.current = null;
      resizingRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [getPageRect, marcadores, setMarcadores]);

  const totalPages = Math.max(1, numPages || documentPages);
  const pageHeight = pageWidth * PAGE_ASPECT;

  const chooserPortal =
    pendingClick &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-zinc-200 p-3 min-w-[200px]"
        style={{
          left: Math.min(window.innerWidth - 220, (getPageRect(pendingClick.page)?.left ?? 0) + pendingClick.xPct * pageWidth),
          top: Math.min(window.innerHeight - 180, (getPageRect(pendingClick.page)?.top ?? 0) + pendingClick.yPct * pageHeight - 80),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest">Adicionar campo</p>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium mb-1"
          onClick={() => createMarcador('signature', pendingClick.xPct, pendingClick.yPct, pendingClick.page)}
        >
          <PenTool className="w-4 h-4" /> Assinar
        </button>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 text-sm mb-1"
          onClick={() => createMarcador('initials', pendingClick.xPct, pendingClick.yPct, pendingClick.page)}
        >
          <PenTool className="w-4 h-4" /> Rubricar
        </button>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 text-sm"
          onClick={() => createMarcador('text', pendingClick.xPct, pendingClick.yPct, pendingClick.page)}
        >
          <Type className="w-4 h-4" /> Texto
        </button>
        <button
          type="button"
          className="mt-2 text-xs text-zinc-400 hover:text-zinc-600"
          onClick={() => setPendingClick(null)}
        >
          Cancelar
        </button>
      </div>,
      document.body,
    );

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[520px]">
      <aside className="lg:w-56 shrink-0 rounded-2xl border border-black/10 bg-zinc-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Signatários</span>
        </div>
        <ul className="space-y-2">
          {signers.map((s, idx) => {
            const color = getSignerColorByIndex(idx);
            const active = selectedSignerId === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelectSigner(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    active ? 'border-zinc-900 bg-white shadow-sm' : 'border-transparent hover:bg-white/80'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-semibold text-zinc-900">{s.name}</span>
                  <span className="block text-[10px] text-zinc-400 mt-0.5">
                    {s.id === 'client' ? 'Assina via link' : 'Contratada'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-[10px] text-zinc-400 mt-4 leading-relaxed">
          Selecione o signatário e clique no documento para posicionar campos.
        </p>
      </aside>

      <div className="flex-1 flex min-w-0 rounded-2xl border border-black/10 overflow-hidden bg-[#EBEEF2]">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 max-h-[70vh]">
          {error ? (
            <p className="text-center text-sm text-red-600 py-12">{error}</p>
          ) : loading || !pdfUrl ? (
            <p className="text-center text-sm text-zinc-400 py-12">Carregando documento…</p>
          ) : (
            <Document
              file={pdfUrl}
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
              loading={<p className="text-center text-sm text-zinc-400">Renderizando PDF…</p>}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <div
                  key={pageNum}
                  ref={(el) => {
                    pageRefs.current[pageNum] = el;
                  }}
                  className="relative mx-auto mb-6 shadow-lg bg-white"
                  style={{ width: pageWidth }}
                  onClick={(e) => handleCanvasClick(e, pageNum)}
                  role="presentation"
                >
                  <Page pageNumber={pageNum} width={pageWidth} renderTextLayer={false} renderAnnotationLayer={false} />
                  {marcadores
                    .filter((m) => m.page === pageNum)
                    .map((field) => {
                      const signerIdx = signers.findIndex((s) => s.id === field.signerId);
                      const color = getSignerColorByIndex(signerIdx >= 0 ? signerIdx : 0);
                      const w = field.widthPct * pageWidth;
                      const h = field.heightPct * pageHeight;
                      return (
                        <div
                          key={field.id}
                          className="absolute border-2 border-dashed rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
                          style={{
                            left: `${field.xPct * 100}%`,
                            top: `${field.yPct * 100}%`,
                            width: w,
                            height: h,
                            transform: `translate(-50%, -50%) rotate(${field.rotation || 0}deg)`,
                            borderColor: color,
                            backgroundColor: hexToRgba(color, 0.1),
                            zIndex: 20,
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            draggingRef.current = {
                              id: field.id,
                              page: pageNum,
                              startX: e.clientX,
                              startY: e.clientY,
                              startXPct: field.xPct,
                              startYPct: field.yPct,
                            };
                          }}
                        >
                          <span className="text-[10px] font-bold text-zinc-700 pointer-events-none px-1 text-center">
                            {TYPE_LABELS[field.type]}
                          </span>
                          <button
                            type="button"
                            className="absolute -top-2 -right-2 w-5 h-5 bg-white border rounded-full flex items-center justify-center text-red-500 shadow"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeMarcador(field.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <div
                            className="absolute -bottom-1 -right-1 w-3 h-3 rounded-sm cursor-se-resize"
                            style={{ backgroundColor: color }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              resizingRef.current = {
                                id: field.id,
                                startW: field.widthPct,
                                startH: field.heightPct,
                                startX: e.clientX,
                                startY: e.clientY,
                              };
                            }}
                          />
                        </div>
                      );
                    })}
                </div>
              ))}
            </Document>
          )}
        </div>

        {totalPages > 1 && pdfUrl && (
          <nav className="w-12 shrink-0 border-l border-zinc-200 flex flex-col items-center justify-center gap-2 py-4">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onCurrentPageChange(Math.max(1, currentPage - 1))}
              className="p-2 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold text-zinc-600 text-center">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onCurrentPageChange(Math.min(totalPages, currentPage + 1))}
              className="p-2 rounded-lg disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        )}
      </div>
      {chooserPortal}
    </div>
  );
}
