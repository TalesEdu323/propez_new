import { CheckCircle2, Clock } from 'lucide-react';
import type { Proposta } from '../../lib/store';
import { getContractSignPhase } from '../../types/proposalFlow';

interface Props {
  proposta: Proposta;
  onAccept: () => void;
  accepting?: boolean;
}

export function ContractAcceptancePanel({ proposta, onAccept, accepting }: Props) {
  const phase = getContractSignPhase({
    contractSignStatus: proposta.contractSignStatus,
    clienteContratoRecebidoAt: proposta.clienteContratoRecebidoAt,
    orgContratoAceitoAt: proposta.orgContratoAceitoAt,
    contratoConcluidoAt: proposta.contratoConcluidoAt,
  });

  if (phase === 'complete' || phase === 'not_started') {
    return null;
  }

  if (phase === 'awaiting_client_receipt') {
    return (
      <div className="apple-card p-6 mb-6 border-amber-200 bg-amber-50/50">
        <div className="flex items-start gap-3">
          <Clock className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h3 className="font-bold text-amber-900">Aguardando cliente</h3>
            <p className="text-sm text-amber-800 mt-1">
              O contrato foi assinado. Aguardando o cliente confirmar o recebimento no link público.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'awaiting_org_accept') {
    return (
      <div className="apple-card p-6 mb-6 border-emerald-200 bg-emerald-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-emerald-900">Aceitar contrato</h3>
              <p className="text-sm text-emerald-800 mt-1">
                O cliente confirmou o recebimento. Aceite para concluir oficialmente o contrato.
              </p>
            </div>
          </div>
          <button type="button" onClick={onAccept} disabled={accepting} className="btn-primary shrink-0">
            {accepting ? 'Salvando…' : 'Aceitar contrato'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
