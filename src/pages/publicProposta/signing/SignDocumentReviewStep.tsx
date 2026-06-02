import { ArrowRight, Info } from 'lucide-react';
import { SignDocumentViewer } from './SignDocumentViewer';
import { SigningHeader } from './SigningHeader';
import type { OrgBrand, SignMeta } from './signTypes';

interface Props {
  meta: SignMeta;
  org?: OrgBrand | null;
  onContinue: () => void;
}

export function SignDocumentReviewStep({ meta, org, onContinue }: Props) {
  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col font-sans">
      <SigningHeader step="review" org={org} completedSignatures={0} totalSignatures={1} />
      <div className="flex-1 flex justify-center p-4 sm:p-8 overflow-y-auto pb-32">
        <div className="w-full max-w-3xl bg-white shadow-sm rounded-sm border border-gray-300 min-h-[500px] relative">
          <div className="absolute top-4 right-4 bg-black/5 text-gray-500 text-[10px] font-bold px-2 py-1 rounded">
            Documento para assinatura
          </div>
          <div className="w-full min-h-[500px] flex justify-center p-4 pt-12">
            <SignDocumentViewer
              fileUrl={meta.previewUrl}
              fields={meta.clientFields}
              className="w-full"
            />
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="hidden sm:flex items-center gap-4">
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-full">
              <Info size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Revise o documento</p>
              <p className="text-xs text-gray-500">Ao finalizar a leitura, clique em continuar para preencher seus dados.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="w-full sm:w-auto bg-[#1877F2] hover:bg-blue-700 text-white px-10 py-3.5 rounded-lg font-bold text-base shadow-lg shadow-blue-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            Continuar <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
