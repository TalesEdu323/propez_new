import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { ContratoTemplate } from '../../lib/store';
import ContractEditor from '../../components/ContractEditor';
import { ContratoPdfUploadZone } from '../../components/contratos/ContratoPdfUploadZone';
import { PdfDocumentPages } from '../../components/contratos/PdfDocumentPages';
import { titleFromPdfFilename } from '../../lib/contratoPdfTitle';
import type { PdfPreviewSource } from '../../lib/pdfPreview';

export interface ContratoContentStepProps {
  currentContrato: Partial<ContratoTemplate>;
  onContratoChange: (patch: Partial<ContratoTemplate>) => void;
  sourceType: 'text' | 'pdf';
  isNewContrato: boolean;
  onOpenAi: () => void;
  uploading: boolean;
  uploadError?: string | null;
  pendingFileSize?: number | null;
  pendingFileName?: string | null;
  onUploadPdf: (file: File) => void;
  onRemovePdf?: () => void;
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
  uploadError,
  pendingFileSize,
  pendingFileName,
  onUploadPdf,
  onRemovePdf,
  previewFile,
  previewLoading,
  previewError,
}: ContratoContentStepProps) {
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(560);

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

  const handleSelectFile = (file: File) => {
    if (!currentContrato.titulo?.trim()) {
      onContratoChange({ titulo: titleFromPdfFilename(file.name) });
    }
    onUploadPdf(file);
  };

  return (
    <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
      {sourceType === 'text' && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Título do Modelo
            </label>
            <input
              type="text"
              value={currentContrato.titulo || ''}
              onChange={(e) => onContratoChange({ titulo: e.target.value })}
              placeholder="Ex: Contrato de Prestação de Serviços Web"
              className="w-full text-2xl font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none"
            />
          </div>
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
        <>
          <ContratoPdfUploadZone
            uploading={uploading}
            fileName={currentContrato.pdfFileName || pendingFileName}
            pageCount={currentContrato.pageCount ?? 0}
            fileSizeBytes={pendingFileSize}
            uploadError={uploadError}
            onSelectFile={handleSelectFile}
            onRemove={onRemovePdf}
          />

          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
              Título do Modelo
            </label>
            <input
              type="text"
              value={currentContrato.titulo || ''}
              onChange={(e) => onContratoChange({ titulo: e.target.value })}
              placeholder="Ex: Contrato de Prestação de Serviços Web"
              className="w-full text-2xl font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Preenchido automaticamente pelo nome do arquivo. Você pode editar antes de salvar.
            </p>
          </div>
        </>
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
              <PdfDocumentPages
                file={previewFile}
                pageWidth={previewWidth}
                pageNumbers={[1]}
                loading={<p className="p-8 text-sm text-zinc-400">Carregando PDF…</p>}
                error={
                  <p className="p-8 text-sm text-zinc-500">Não foi possível exibir o preview.</p>
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
