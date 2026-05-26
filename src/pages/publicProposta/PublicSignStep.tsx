import { ExternalLink, FileCheck, Loader2 } from 'lucide-react';
import { getContractSignPhase } from '../../types/proposalFlow';
import type { ProposalFlowConfig } from '../../types/proposalFlow';

interface PropostaSignFields {
  rubricaStatus?: string | null;
  rubricaSigningUrl?: string | null;
  clienteContratoRecebidoAt?: string | null;
  contratoConcluidoAt?: string | null;
  orgContratoAceitoAt?: string | null;
}

interface Props {
  proposta: PropostaSignFields;
  fluxo?: ProposalFlowConfig;
  orgName: string;
  onConfirmReceipt: () => void;
  confirming?: boolean;
}

export function PublicSignStep({ proposta, orgName, onConfirmReceipt, confirming }: Props) {
  const phase = getContractSignPhase({
    rubricaStatus: proposta.rubricaStatus,
    clienteContratoRecebidoAt: proposta.clienteContratoRecebidoAt,
    orgContratoAceitoAt: proposta.orgContratoAceitoAt,
    contratoConcluidoAt: proposta.contratoConcluidoAt,
  });

  if (phase === 'complete') {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-emerald-50 border border-emerald-100 text-center">
        <FileCheck className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-emerald-900">Contrato concluído</h3>
        <p className="text-emerald-700 mt-2 text-sm">Todas as etapas do contrato foram finalizadas.</p>
      </div>
    );
  }

  if (phase === 'awaiting_org_accept') {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-amber-50 border border-amber-100 text-center">
        <Loader2 className="w-10 h-10 text-amber-600 mx-auto mb-4 animate-spin" />
        <h3 className="text-xl font-bold text-amber-900">Recebimento confirmado</h3>
        <p className="text-amber-800 mt-2 text-sm">
          Aguardando confirmação de <strong>{orgName}</strong> para concluir o contrato.
        </p>
      </div>
    );
  }

  if (phase === 'awaiting_client_receipt') {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-white border border-black/5 shadow-lg text-center">
        <FileCheck className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-900">Assinatura registrada</h3>
        <p className="text-zinc-500 mt-2 text-sm mb-6">Confirme que recebeu o contrato assinado para dar sequência.</p>
        <button type="button" onClick={onConfirmReceipt} disabled={confirming} className="btn-primary">
          {confirming ? 'Confirmando...' : 'Confirmar recebimento'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-zinc-900 text-white text-center">
      <h3 className="text-xl font-bold mb-2">Assinar contrato</h3>
      <p className="text-zinc-400 text-sm mb-6">
        Você receberá um e-mail com o link de assinatura (e-mail + assinatura na tela). Após assinar, volte aqui.
      </p>
      {proposta.rubricaSigningUrl ? (
        <a
          href={proposta.rubricaSigningUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-zinc-900 font-bold hover:bg-zinc-100"
        >
          Abrir assinatura <ExternalLink className="w-4 h-4" />
        </a>
      ) : (
        <p className="text-amber-300 text-sm">Preparando link de assinatura… atualize a página em instantes.</p>
      )}
    </div>
  );
}
