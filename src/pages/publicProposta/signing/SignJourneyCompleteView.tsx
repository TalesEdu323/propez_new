import { CheckCircle, FileText } from 'lucide-react';
import { flowHasStep } from '../../../types/proposalFlow';
import { buildPublicSignedContractPdfUrl } from '../../../lib/publicProposalUrls';
import { SigningHeader } from './SigningHeader';
import type { OrgBrand, SignMeta } from './signTypes';

interface Props {
  meta: SignMeta;
  org?: OrgBrand | null;
  publicToken?: string | null;
  onBackToProposal?: () => void;
}

export function SignJourneyCompleteView({ meta, org, publicToken, onBackToProposal }: Props) {
  const fluxo = meta.fluxo;
  const token = publicToken ?? meta.publicToken;
  const pdfUrl = token ? buildPublicSignedContractPdfUrl(token) : null;

  const items = [
    { label: 'Proposta aprovada', show: true },
    { label: 'Contrato assinado', show: !fluxo || flowHasStep(fluxo, 'sign') },
    { label: 'Pagamento concluído', show: fluxo ? flowHasStep(fluxo, 'pay') : false },
  ].filter((i) => i.show);

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      <SigningHeader step="success" org={org} completedSignatures={1} totalSignatures={1} />
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mb-8">
          <CheckCircle className="h-16 w-16 text-green-600" strokeWidth={2.5} />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Tudo pronto!</h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto mb-8">
          Sua jornada foi concluída com sucesso.
        </p>
        {meta.title && <p className="text-sm text-gray-700 font-medium mb-8">&ldquo;{meta.title}&rdquo;</p>}

        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8 text-left space-y-3">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              <span className="text-sm font-medium text-gray-800">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="w-full max-w-sm space-y-3">
          {pdfUrl && flowHasStep(fluxo ?? { steps: ['approve', 'sign'] }, 'sign') && (
            <>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3"
              >
                <FileText className="h-5 w-5" /> Ver contrato assinado
              </a>
              <a
                href={pdfUrl}
                download
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <FileText className="h-5 w-5" /> Baixar PDF
              </a>
            </>
          )}
          {token && onBackToProposal && (
            <button
              type="button"
              onClick={onBackToProposal}
              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-colors shadow-lg"
            >
              Voltar para a proposta
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-400 pb-6">Assinatura digital PropEZ</p>
    </div>
  );
}
