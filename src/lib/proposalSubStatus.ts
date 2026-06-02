import type { Proposta } from './store';
import { getContractSignPhase } from '../types/proposalFlow';

export function getProposalSubStatusLabel(proposta: Proposta): string | null {
  if (proposta.status !== 'aprovada') return null;
  const phase = getContractSignPhase({
    contractSignStatus: proposta.contractSignStatus ?? proposta.rubricaStatus,
    contractSignDocumentId: proposta.contractSignDocumentId ?? proposta.rubricaDocumentId,
    clienteContratoRecebidoAt: proposta.clienteContratoRecebidoAt,
    orgContratoAceitoAt: proposta.orgContratoAceitoAt,
    contratoConcluidoAt: proposta.contratoConcluidoAt,
  });
  if (phase === 'awaiting_client_receipt') return 'Aguardando cliente';
  if (phase === 'awaiting_org_accept') return 'Aguardando seu aceite';
  if (phase === 'sign_pending') return 'Assinatura pendente';
  return null;
}
