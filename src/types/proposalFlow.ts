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
