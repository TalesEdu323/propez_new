export type DecisionAction = 'approve' | 'reject';
export type ProposalDecisionStatus = 'pendente' | 'aprovada' | 'recusada';

export type DecisionIntent = 'apply' | 'idempotent_ok' | 'conflict';

export function targetStatusForAction(action: DecisionAction): ProposalDecisionStatus {
  return action === 'approve' ? 'aprovada' : 'recusada';
}

/** Decide se a decisão deve ser aplicada, retornada como idempotente ou rejeitada por conflito. */
export function resolvePublicDecisionIntent(
  currentStatus: ProposalDecisionStatus,
  action: DecisionAction,
): DecisionIntent {
  if (currentStatus === 'pendente') return 'apply';
  const target = targetStatusForAction(action);
  if (currentStatus === target) return 'idempotent_ok';
  return 'conflict';
}

export function conflictDecisionMessage(
  currentStatus: ProposalDecisionStatus,
  action: DecisionAction,
): string {
  if (currentStatus === 'aprovada' && action === 'reject') {
    return 'Esta proposta já foi aprovada e não pode ser recusada.';
  }
  if (currentStatus === 'recusada' && action === 'approve') {
    return 'Esta proposta já foi recusada e não pode ser aprovada.';
  }
  return 'Decisão já registrada para esta proposta';
}
