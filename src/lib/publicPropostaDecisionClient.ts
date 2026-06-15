import type { ProposalFlowConfig } from '../types/proposalFlow';

export interface DecisionApiPayload {
  proposta?: {
    status: 'pendente' | 'aprovada' | 'recusada';
    fluxo?: ProposalFlowConfig;
    pago: boolean;
    contractSignStatus?: string | null;
    contractSigningUrl?: string | null;
    [key: string]: unknown;
  };
  journey?: unknown;
  warning?: string;
  error?: string;
}

export function extractDecisionPayload(body: unknown): DecisionApiPayload | null {
  if (!body || typeof body !== 'object') return null;
  return body as DecisionApiPayload;
}

export function decisionRecoveryMessage(
  status: 'pendente' | 'aprovada' | 'recusada',
  action: 'approve' | 'reject',
): string | null {
  if (status === 'aprovada' && action === 'approve') {
    return 'Esta proposta já foi aprovada. Atualizamos a página.';
  }
  if (status === 'recusada' && action === 'reject') {
    return 'Esta proposta já foi recusada. Atualizamos a página.';
  }
  return null;
}
