import { z } from 'zod';

export type ProposalFlowStep = 'approve' | 'sign' | 'pay';

export interface ProposalFlowConfig {
  steps: ProposalFlowStep[];
}

export const DEFAULT_FLOW: ProposalFlowConfig = {
  steps: ['approve', 'sign', 'pay'],
};

export const proposalFlowStepSchema = z.enum(['approve', 'sign', 'pay']);

export const proposalFlowConfigSchema = z.object({
  steps: z
    .array(proposalFlowStepSchema)
    .min(1, 'Informe ao menos um passo')
    .refine((steps) => new Set(steps).size === steps.length, {
      message: 'Passos duplicados não são permitidos',
    })
    .refine((steps) => steps.includes('approve'), {
      message: 'O passo "aprovar proposta" é obrigatório',
    }),
});

export function parseProposalFlow(raw: unknown): ProposalFlowConfig {
  const parsed = proposalFlowConfigSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return DEFAULT_FLOW;
}

export function flowHasStep(flow: ProposalFlowConfig | undefined | null, step: ProposalFlowStep): boolean {
  return (flow ?? DEFAULT_FLOW).steps.includes(step);
}

export type ContractSignPhase =
  | 'not_started'
  | 'sign_pending'
  | 'awaiting_client_receipt'
  | 'awaiting_org_accept'
  | 'complete';

export function getContractSignPhase(proposta: {
  contractSignStatus?: string | null;
  contractSignDocumentId?: string | null;
  clienteContratoRecebidoAt?: string | null;
  orgContratoAceitoAt?: string | null;
  contratoConcluidoAt?: string | null;
}): ContractSignPhase {
  const status = proposta.contractSignStatus;
  const documentId = proposta.contractSignDocumentId;
  if (proposta.contratoConcluidoAt) return 'complete';
  if (proposta.orgContratoAceitoAt) return 'complete';
  if (proposta.clienteContratoRecebidoAt) return 'awaiting_org_accept';
  if (status === 'signed') return 'awaiting_client_receipt';
  if (status === 'sent' || status === 'pending') return 'sign_pending';
  if (documentId) return 'sign_pending';
  return 'not_started';
}

/** Passos do fluxo após a aprovação (ordem preservada). */
export function getPostApproveSteps(flow: ProposalFlowConfig | undefined | null): ProposalFlowStep[] {
  return (flow ?? DEFAULT_FLOW).steps.filter((s) => s !== 'approve');
}

export function proposalValorFinal(valor: number, desconto = 0): number {
  const v = Number(valor);
  const d = Number(desconto);
  if (!Number.isFinite(v)) return 0;
  if (!Number.isFinite(d)) return Math.max(0, v);
  return Math.max(0, v - d);
}

export function proposalValorFinalCents(valorCents: number | null | undefined, descontoCents = 0): number {
  const v = typeof valorCents === 'number' && Number.isFinite(valorCents) ? valorCents : 0;
  const d = typeof descontoCents === 'number' && Number.isFinite(descontoCents) ? descontoCents : 0;
  return Math.max(0, v - d);
}

export interface ProposalJourneyState {
  pago: boolean;
  contractSignStatus?: string | null;
}

/** Dispara geração do contrato quando o passo `sign` está liberado na ordem do fluxo. */
export function shouldTriggerContractSign(
  flow: ProposalFlowConfig | undefined | null,
  state: ProposalJourneyState,
): boolean {
  const fluxo = flow ?? DEFAULT_FLOW;
  if (!flowHasStep(fluxo, 'sign')) return false;
  const post = getPostApproveSteps(fluxo);
  const signIdx = post.indexOf('sign');
  const payIdx = post.indexOf('pay');
  if (signIdx === -1) return false;
  if (payIdx === -1) return true;
  if (signIdx < payIdx) return true;
  return state.pago;
}

export type ClientPostApproveAction = 'redirect_sign' | 'show_pay' | 'idle';

function isSignClientStepDone(state: ProposalJourneyState): boolean {
  // Apenas 'signed' conta como assinatura concluída pelo cliente.
  // 'sent'/'pending' significam contrato gerado mas ainda NÃO assinado, então
  // o cliente deve ser levado à assinatura (e não pular para o pagamento).
  return state.contractSignStatus === 'signed';
}

/** Próxima ação do cliente na página pública após aprovação. */
export function resolveClientActionAfterApprove(
  flow: ProposalFlowConfig | undefined | null,
  state: ProposalJourneyState,
): ClientPostApproveAction {
  for (const step of getPostApproveSteps(flow)) {
    if (step === 'pay' && !state.pago) return 'show_pay';
    if (step === 'sign' && !isSignClientStepDone(state)) return 'redirect_sign';
  }
  return 'idle';
}

/** Passo `sign` concluído para barra de progresso (cliente assinou ou contrato finalizado). */
export function isSignFlowStepDone(proposta: {
  contractSignStatus?: string | null;
  contractSignDocumentId?: string | null;
  clienteContratoRecebidoAt?: string | null;
  orgContratoAceitoAt?: string | null;
  contratoConcluidoAt?: string | null;
}): boolean {
  const phase = getContractSignPhase(proposta);
  return phase !== 'not_started' && phase !== 'sign_pending';
}

/** Ordem dos métodos do wizard de assinatura conforme `fluxo.steps`. */
export function journeyMethodOrder(
  flow: ProposalFlowConfig | undefined | null,
): Array<'SIGNATURE_ON_SCREEN' | 'EMAIL_OTP' | 'PAYMENT'> {
  const ordered: Array<'SIGNATURE_ON_SCREEN' | 'EMAIL_OTP' | 'PAYMENT'> = [];
  for (const step of getPostApproveSteps(flow)) {
    if (step === 'sign') {
      ordered.push('SIGNATURE_ON_SCREEN', 'EMAIL_OTP');
    } else if (step === 'pay') {
      ordered.push('PAYMENT');
    }
  }
  return ordered;
}
