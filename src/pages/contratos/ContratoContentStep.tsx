import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { Sparkles, Upload } from 'lucide-react';
import type { ContratoTemplate } from '../../lib/store';
import ContractEditor from '../../components/ContractEditor';
import { setupPdfWorker } from '../../lib/pdfSetup';
import type { PdfPreviewSource } from '../../lib/pdfPreview';

setupPdfWorker();

export interface ContratoContentStepProps {
  currentContrato: Partial<ContratoTemplate>;
  onContratoChange: (patch: Partial<ContratoTemplate>) => void;
  sourceType: 'text' | 'pdf';
  isNewContrato: boolean;
  onOpenAi: () => void;
  uploading: boolean;
  onUploadPdf: (file: File) => void;
  previewFile: PdfPreviewSource | null;
  previewLoading: boolean;
  previewError: string | null;
}

export function ContratoContentStep({
  currentContrato,
  onContratoChange,
  sourceType,
  isNewContrato,
  onOpenAi,
  uploading,
  onUploadPdf,
  previewFile,
  previewLoading,
  previewError,
}: ContratoContentStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(560);
  const hasTitle = !!currentContrato.titulo?.trim();
  const pageCount = currentContrato.pageCount ?? 0;

  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setPreviewWidth(Math.min(w, 720));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
      <div>
        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
          Título do Modelo
        </label>
        <input
          ref={titleInputRef}
          type="text"
          value={currentContrato.titulo || ''}
          onChange={(e) => onContratoChange({ titulo: e.target.value })}
          placeholder="Ex: Contrato de Prestação de Serviços Web"
          className="w-full text-2xl font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none"
        />
        {sourceType === 'pdf' && !hasTitle && (
          <p className="text-xs text-amber-700 mt-2">
            Informe o título antes de enviar o PDF — ele identifica o modelo na lista.
          </p>
        )}
      </div>

      {sourceType === 'text' && (
        <>
          {isNewContrato && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <div>
                <p className="text-sm font-medium text-amber-900">Gerar rascunho com IA</p>
                <p className="text-xs text-amber-700/80 mt-1">Revise com advogado antes de usar.</p>
              </div>
              <button
                type="button"
                onClick={onOpenAi}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-medium hover:bg-amber-600"
              >
                <Sparkles className="w-4 h-4" />
                Gerar com IA
              </button>
            </div>
          )}
          <div className="h-[400px] rounded-2xl border border-black/10 overflow-hidden">
            <ContractEditor
              value={currentContrato.texto || ''}
              onChange={(val) => onContratoChange({ texto: val, sourceType: 'text' })}
            />
          </div>
        </>
      )}

      {sourceType === 'pdf' && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-4">
          <p className="text-sm text-blue-900">
            O PDF enviado será o documento final do modelo.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadPdf(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading || !hasTitle}
            onClick={() => {
              if (!hasTitle) {
                titleInputRef.current?.focus();
                return;
              }
              fileInputRef.current?.click();
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Enviando…' : currentContrato.pdfFileName ? 'Substituir PDF' : 'Enviar PDF'}
          </button>
          {currentContrato.pdfFileName && (
            <p className="text-sm text-blue-800">
              <span className="font-medium">{currentContrato.pdfFileName}</span>
              {pageCount > 0 && (
                <span className="text-blue-700/80">
                  {' '}
                  · {pageCount} {pageCount === 1 ? 'página' : 'páginas'}
                </span>
              )}
            </p>
          )}
        </div>
      )}

      {(previewLoading || previewFile || previewError) && (
        <div>
          <h3 className="text-sm font-bold text-zinc-900 mb-2">Preview do documento</h3>
          <div
            ref={previewWrapRef}
            className="rounded-2xl border border-black/10 overflow-hidden bg-zinc-100 flex justify-center min-h-[200px]"
          >
            {previewError ? (
              <p className="p-8 text-center text-sm text-zinc-500">{previewError}</p>
            ) : previewLoading || !previewFile ? (
              <p className="p-8 text-center text-sm text-zinc-400">Gerando preview…</p>
            ) : (
              <Document
                file={previewFile}
                onLoadError={() => undefined}
                loading={<p className="p-8 text-sm text-zinc-400">Carregando PDF…</p>}
                error={
                  <p className="p-8 text-sm text-zinc-500">Não foi possível exibir o preview.</p>
                }
              >
                <Page
                  pageNumber={1}
                  width={previewWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
