import { Sparkles, Upload, FileType2 } from 'lucide-react';

export interface ContratoOriginStepProps {
  onChooseText: () => void;
  onChoosePdf: () => void;
}

export function ContratoOriginStep({ onChooseText, onChoosePdf }: ContratoOriginStepProps) {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h2 className="text-lg font-semibold text-zinc-900 mb-2">Como deseja criar o contrato?</h2>
      <p className="text-sm text-zinc-500 mb-8">Escolha uma opção para começar o modelo.</p>
      <div className="grid sm:grid-cols-2 gap-6">
        <button
          type="button"
          onClick={onChooseText}
          className="apple-card apple-card-hover !p-8 text-left flex flex-col gap-4 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
            <FileType2 className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-zinc-900">Escrever contrato</h3>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              Redija o texto no editor ou gere um rascunho com IA e revise antes de salvar.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-amber-700 mt-auto">
            <Sparkles className="w-4 h-4" /> Inclui gerar com IA
          </span>
        </button>
        <button
          type="button"
          onClick={onChoosePdf}
          className="apple-card apple-card-hover !p-8 text-left flex flex-col gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
            <Upload className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-zinc-900">Enviar PDF</h3>
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
              Faça upload do documento final em PDF. Na próxima etapa, informe o título do modelo
              antes de enviar o arquivo.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
