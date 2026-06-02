import type { Proposta } from './store';
import {
  DEFAULT_FLOW,
  flowHasStep,
  getContractSignPhase,
  parseProposalFlow,
  type ProposalFlowStep,
} from '../types/proposalFlow';
import type { ListingStatusTone } from '../components/listing/listingLayout';

export interface ProposalListingStatus {
  primaryLabel: string;
  secondaryLabels: string[];
  tone: ListingStatusTone;
  progressPercent: number;
  doneSteps: number;
  totalSteps: number;
}

export function getProposalSubStatusLabel(proposta: Proposta): string | null {
  const listing = getProposalListingStatus(proposta);
  return listing.secondaryLabels[0] ?? null;
}

function signStepDone(proposta: Proposta): boolean {
  const fluxo = parseProposalFlow(proposta.fluxo);
  if (!flowHasStep(fluxo, 'sign')) return true;
  const phase = getContractSignPhase({
    contractSignStatus: proposta.contractSignStatus,
    contractSignDocumentId: proposta.contractSignDocumentId,
    clienteContratoRecebidoAt: proposta.clienteContratoRecebidoAt,
    orgContratoAceitoAt: proposta.orgContratoAceitoAt,
    contratoConcluidoAt: proposta.contratoConcluidoAt,
  });
  return phase === 'complete';
}

function payStepDone(proposta: Proposta): boolean {
  const fluxo = parseProposalFlow(proposta.fluxo);
  if (!flowHasStep(fluxo, 'pay')) return true;
  return !!proposta.pago;
}

function approveStepDone(proposta: Proposta): boolean {
  return proposta.status === 'aprovada';
}

export function getProposalFlowProgress(proposta: Proposta): {
  doneSteps: number;
  totalSteps: number;
  progressPercent: number;
} {
  const fluxo = parseProposalFlow(proposta.fluxo);
  const steps = fluxo.steps;
  const totalSteps = steps.length;
  let doneSteps = 0;
  for (const step of steps) {
    if (step === 'approve' && approveStepDone(proposta)) doneSteps++;
    else if (step === 'sign' && signStepDone(proposta)) doneSteps++;
    else if (step === 'pay' && payStepDone(proposta)) doneSteps++;
  }
  if (proposta.status === 'recusada') {
    doneSteps = 0;
  }
  const progressPercent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
  return { doneSteps, totalSteps, progressPercent };
}

function getSignSecondaryLabels(proposta: Proposta): string[] {
  const labels: string[] = [];
  const phase = getContractSignPhase({
    contractSignStatus: proposta.contractSignStatus,
    contractSignDocumentId: proposta.contractSignDocumentId,
    clienteContratoRecebidoAt: proposta.clienteContratoRecebidoAt,
    orgContratoAceitoAt: proposta.orgContratoAceitoAt,
    contratoConcluidoAt: proposta.contratoConcluidoAt,
  });
  if (phase === 'awaiting_client_receipt') labels.push('Aguardando cliente');
  else if (phase === 'awaiting_org_accept') labels.push('Aguardando seu aceite');
  else if (phase === 'sign_pending') labels.push('Assinatura pendente');
  return labels;
}

export function getProposalListingStatus(proposta: Proposta): ProposalListingStatus {
  const { doneSteps, totalSteps, progressPercent } = getProposalFlowProgress(proposta);
  const fluxo = parseProposalFlow(proposta.fluxo);
  const secondaryLabels: string[] = [];

  if (proposta.status === 'recusada') {
    return {
      primaryLabel: 'Recusada',
      secondaryLabels: [],
      tone: 'rejected',
      progressPercent: 0,
      doneSteps: 0,
      totalSteps,
    };
  }

  if (proposta.status === 'pendente') {
    const primaryLabel = proposta.data_envio ? 'Aguardando decisão' : 'Rascunho';
    return {
      primaryLabel,
      secondaryLabels: proposta.viewedAt ? ['Visualizada'] : [],
      tone: 'waiting',
      progressPercent,
      doneSteps,
      totalSteps,
    };
  }

  // aprovada
  const signLabels = flowHasStep(fluxo, 'sign') ? getSignSecondaryLabels(proposta) : [];
  const payPending = flowHasStep(fluxo, 'pay') && !proposta.pago;
  const payDone = flowHasStep(fluxo, 'pay') && proposta.pago;

  secondaryLabels.push(...signLabels);
  if (payPending) secondaryLabels.push('Pagamento pendente');
  if (payDone) secondaryLabels.push('Pago');

  const allComplete = doneSteps >= totalSteps && totalSteps > 0;
  const tone: ListingStatusTone = allComplete ? 'success' : 'waiting';
  const primaryLabel = allComplete ? 'Concluída' : 'Aprovada';

  return {
    primaryLabel,
    secondaryLabels,
    tone,
    progressPercent,
    doneSteps,
    totalSteps,
  };
}

export function getFlowStepLabels(proposta: Proposta): { step: ProposalFlowStep; label: string; done: boolean }[] {
  const fluxo = parseProposalFlow(proposta.fluxo ?? DEFAULT_FLOW);
  const labels: Record<ProposalFlowStep, string> = {
    approve: 'Aprovação',
    sign: 'Assinatura',
    pay: 'Pagamento',
  };
  return fluxo.steps.map((step) => ({
    step,
    label: labels[step],
    done:
      step === 'approve'
        ? approveStepDone(proposta)
        : step === 'sign'
          ? signStepDone(proposta)
          : payStepDone(proposta),
  }));
}
