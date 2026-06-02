import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, ChevronLeft, ChevronRight, PenLine } from 'lucide-react';

export interface SignatureFieldConfig {
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

const DEFAULT_FIELD: SignatureFieldConfig = {
  page: 1,
  xPct: 35,
  yPct: 82,
  widthPct: 30,
  heightPct: 10,
};

export interface SignaturePositioningPanelProps {
  pdfUrl: string | null;
  pageCount: number;
  orgName: string;
  field: SignatureFieldConfig;
  onFieldChange: (field: SignatureFieldConfig) => void;
  loading?: boolean;
  error?: string | null;
}

export function SignaturePositioningPanel({
  pdfUrl,
  pageCount,
  orgName,
  field,
  onFieldChange,
  loading,
  error,
}: SignaturePositioningPanelProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(field.page);
  const dragRef = useRef<{ startX: number; startY: number; startXPct: number; startYPct: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  useEffect(() => {
    setCurrentPage(field.page);
  }, [field.page]);

  const totalPages = Math.max(1, pageCount || 1);

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragRef.current || resizeRef.current) return;
      const el = previewRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const xPct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
      onFieldChange({
        ...field,
        page: currentPage,
        xPct: Math.round(xPct * 10) / 10,
        yPct: Math.round(yPct * 10) / 10,
      });
    },
    [currentPage, field, onFieldChange],
  );

  const onMarkerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startXPct: field.xPct,
        startYPct: field.yPct,
      };
    },
    [field.xPct, field.yPct],
  );

  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: field.widthPct,
        startH: field.heightPct,
      };
    },
    [field.widthPct, field.heightPct],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = previewRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      if (dragRef.current) {
        const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
        const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
        onFieldChange({
          ...field,
          page: currentPage,
          xPct: Math.max(5, Math.min(95, Math.round((dragRef.current.startXPct + dx) * 10) / 10)),
          yPct: Math.max(5, Math.min(95, Math.round((dragRef.current.startYPct + dy) * 10) / 10)),
        });
      }

      if (resizeRef.current) {
        const dw = ((e.clientX - resizeRef.current.startX) / rect.width) * 100;
        const dh = ((e.clientY - resizeRef.current.startY) / rect.height) * 100;
        onFieldChange({
          ...field,
          page: currentPage,
          widthPct: Math.max(8, Math.min(80, Math.round((resizeRef.current.startW + dw) * 10) / 10)),
          heightPct: Math.max(4, Math.min(40, Math.round((resizeRef.current.startH + dh) * 10) / 10)),
        });
      }
    };

    const onUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [currentPage, field, onFieldChange]);

  const iframeSrc = pdfUrl
    ? `${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0`
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100">
        <div className="flex items-center gap-3 flex-1">
          <Building2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Assinatura da empresa</p>
            <p className="text-sm text-emerald-900">{orgName || 'Sua organização'} — automática no PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-1">
          <PenLine className="w-5 h-5 text-zinc-600 shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Campo do cliente</p>
            <p className="text-sm text-zinc-700 font-mono">
              pág. {field.page} · x {field.xPct}% · y {field.yPct}% · {field.widthPct}×{field.heightPct}%
            </p>
          </div>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-2 rounded-lg border border-black/10 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-zinc-600 font-medium">
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 rounded-lg border border-black/10 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative rounded-2xl border border-black/10 overflow-hidden bg-zinc-100 shadow-inner">
        {error ? (
          <div className="p-12 text-center text-zinc-500 text-sm">{error}</div>
        ) : loading || !iframeSrc ? (
          <div className="p-12 text-center text-zinc-400 text-sm">Carregando preview…</div>
        ) : (
          <div
            ref={previewRef}
            className="relative cursor-crosshair select-none"
            style={{ aspectRatio: '794 / 1123' }}
            onClick={handlePageClick}
            role="presentation"
          >
            <iframe title="Preview do contrato" src={iframeSrc} className="w-full h-full pointer-events-none border-0" />
            {field.page === currentPage && (
              <div
                className="absolute border-2 border-dashed border-emerald-500 bg-emerald-400/20 rounded"
                style={{
                  left: `${field.xPct}%`,
                  top: `${field.yPct}%`,
                  width: `${field.widthPct}%`,
                  height: `${field.heightPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={onMarkerMouseDown}
              >
                <span className="absolute -top-6 left-0 text-[10px] font-bold uppercase tracking-widest text-emerald-700 whitespace-nowrap pointer-events-none">
                  Assinatura do cliente
                </span>
                <div
                  className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-600 rounded-sm cursor-se-resize"
                  onMouseDown={onResizeMouseDown}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[10px] text-zinc-400 text-center uppercase tracking-widest">
        Clique para posicionar · arraste para mover · canto inferior direito para redimensionar
      </p>
    </div>
  );
}

export function resolveSignatureField(config: unknown): SignatureFieldConfig {
  if (!config || typeof config !== 'object') return DEFAULT_FIELD;
  const cfg = config as { clientField?: Partial<SignatureFieldConfig> };
  const f = cfg.clientField;
  if (!f) return DEFAULT_FIELD;
  return {
    page: f.page ?? DEFAULT_FIELD.page,
    xPct: f.xPct ?? DEFAULT_FIELD.xPct,
    yPct: f.yPct ?? DEFAULT_FIELD.yPct,
    widthPct: f.widthPct ?? DEFAULT_FIELD.widthPct,
    heightPct: f.heightPct ?? DEFAULT_FIELD.heightPct,
  };
}

export function hasConfiguredSignatureField(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const cfg = config as { clientField?: Partial<SignatureFieldConfig> };
  return cfg.clientField != null && typeof cfg.clientField.xPct === 'number';
}

export { DEFAULT_FIELD as DEFAULT_SIGNATURE_FIELD };
