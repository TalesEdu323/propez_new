import { describe, expect, it } from 'vitest';
import { decisionRecoveryMessage, extractDecisionPayload } from '../publicPropostaDecisionClient';

describe('publicPropostaDecisionClient', () => {
  it('extractDecisionPayload lê proposta do body de erro', () => {
    const payload = extractDecisionPayload({
      proposta: { status: 'aprovada', pago: false },
      warning: 'Assinatura pendente',
    });
    expect(payload?.proposta?.status).toBe('aprovada');
    expect(payload?.warning).toBe('Assinatura pendente');
  });

  it('decisionRecoveryMessage para retry após 409', () => {
    expect(decisionRecoveryMessage('aprovada', 'approve')).toContain('aprovada');
    expect(decisionRecoveryMessage('recusada', 'reject')).toContain('recusada');
    expect(decisionRecoveryMessage('aprovada', 'reject')).toBeNull();
  });
});
