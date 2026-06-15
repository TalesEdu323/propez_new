import { describe, expect, it } from 'vitest';
import {
  conflictDecisionMessage,
  resolvePublicDecisionIntent,
  targetStatusForAction,
} from '../publicPropostaDecisionHelpers';

describe('publicPropostaDecisionHelpers', () => {
  it('targetStatusForAction mapeia approve/reject', () => {
    expect(targetStatusForAction('approve')).toBe('aprovada');
    expect(targetStatusForAction('reject')).toBe('recusada');
  });

  it('resolvePublicDecisionIntent permite aplicar em pendente', () => {
    expect(resolvePublicDecisionIntent('pendente', 'approve')).toBe('apply');
    expect(resolvePublicDecisionIntent('pendente', 'reject')).toBe('apply');
  });

  it('resolvePublicDecisionIntent idempotente na mesma decisão', () => {
    expect(resolvePublicDecisionIntent('aprovada', 'approve')).toBe('idempotent_ok');
    expect(resolvePublicDecisionIntent('recusada', 'reject')).toBe('idempotent_ok');
  });

  it('resolvePublicDecisionIntent conflita decisões opostas', () => {
    expect(resolvePublicDecisionIntent('aprovada', 'reject')).toBe('conflict');
    expect(resolvePublicDecisionIntent('recusada', 'approve')).toBe('conflict');
  });

  it('conflictDecisionMessage descreve conflito', () => {
    expect(conflictDecisionMessage('aprovada', 'reject')).toContain('aprovada');
    expect(conflictDecisionMessage('recusada', 'approve')).toContain('recusada');
  });
});
