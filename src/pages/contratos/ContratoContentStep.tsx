import { useRef } from 'react';
import { Sparkles, Upload } from 'lucide-react';
import type { ContratoTemplate } from '../../lib/store';
import ContractEditor from '../../components/ContractEditor';

export interface ContratoContentStepProps {
  currentContrato: Partial<ContratoTemplate>;
  onContratoChange: (patch: Partial<ContratoTemplate>) => void;
  sourceType: 'text' | 'pdf';
  isNewContrato: boolean;
  onOpenAi: () => void;
  uploading: boolean;
  onUploadPdf: (file: File) => void;
  previewUrl: string | null;
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
  previewUrl,
  previewLoading,
  previewError,
}: ContratoContentStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const iframeSrc = previewUrl ? `${previewUrl}#toolbar=0&navpanes=0` : null;

  return (
    <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
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
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Enviando…' : currentContrato.pdfFileName ? 'Substituir PDF' : 'Enviar PDF'}
          </button>
          {currentContrato.pdfFileName && (
            <span className="text-sm text-blue-800 block">{currentContrato.pdfFileName}</span>
          )}
        </div>
      )}

      {(previewLoading || iframeSrc || previewError) && (
        <div>
          <h3 className="text-sm font-bold text-zinc-900 mb-2">Preview do documento</h3>
          <div className="rounded-2xl border border-black/10 overflow-hidden bg-zinc-100 aspect-[794/1123] max-h-[480px]">
            {previewError ? (
              <p className="p-8 text-center text-sm text-zinc-500">{previewError}</p>
            ) : previewLoading || !iframeSrc ? (
              <p className="p-8 text-center text-sm text-zinc-400">Gerando preview…</p>
            ) : (
              <iframe title="Preview" src={iframeSrc} className="w-full h-full min-h-[400px] border-0" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
