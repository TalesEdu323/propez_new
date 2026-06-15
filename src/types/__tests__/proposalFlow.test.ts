import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FLOW,
  getPostApproveSteps,
  isSignFlowStepDone,
  journeyMethodOrder,
  proposalValorFinal,
  proposalValorFinalCents,
  resolveClientActionAfterApprove,
  shouldTriggerContractSign,
} from '../proposalFlow';

describe('proposalFlow helpers', () => {
  it('getPostApproveSteps remove approve e preserva ordem', () => {
    expect(getPostApproveSteps({ steps: ['approve', 'pay', 'sign'] })).toEqual(['pay', 'sign']);
    expect(getPostApproveSteps(DEFAULT_FLOW)).toEqual(['sign', 'pay']);
  });

  it('proposalValorFinal aplica desconto', () => {
    expect(proposalValorFinal(1000, 150)).toBe(850);
    expect(proposalValorFinalCents(100000, 15000)).toBe(85000);
    expect(proposalValorFinal(100, 200)).toBe(0);
  });

  it('shouldTriggerContractSign respeita ordem pay/sign', () => {
    const signFirst = { steps: ['approve', 'sign', 'pay'] as const };
    const payFirst = { steps: ['approve', 'pay', 'sign'] as const };

    expect(shouldTriggerContractSign(signFirst, { pago: false })).toBe(true);
    expect(shouldTriggerContractSign(payFirst, { pago: false })).toBe(false);
    expect(shouldTriggerContractSign(payFirst, { pago: true })).toBe(true);
    expect(shouldTriggerContractSign({ steps: ['approve', 'pay'] }, { pago: false })).toBe(false);
  });

  it('resolveClientActionAfterApprove segue ordem do fluxo', () => {
    expect(
      resolveClientActionAfterApprove(DEFAULT_FLOW, { pago: false, contractSignStatus: null }),
    ).toBe('redirect_sign');

    expect(
      resolveClientActionAfterApprove(
        { steps: ['approve', 'pay', 'sign'] },
        { pago: false, contractSignStatus: null },
      ),
    ).toBe('show_pay');

    expect(
      resolveClientActionAfterApprove(
        { steps: ['approve', 'pay', 'sign'] },
        { pago: true, contractSignStatus: null },
      ),
    ).toBe('redirect_sign');

    expect(
      resolveClientActionAfterApprove(DEFAULT_FLOW, { pago: true, contractSignStatus: 'signed' }),
    ).toBe('idle');
  });

  it('resolveClientActionAfterApprove não pula assinatura quando contrato está apenas enviado', () => {
    // 'sent' = contrato gerado mas ainda NÃO assinado -> cliente deve ir assinar.
    expect(
      resolveClientActionAfterApprove(DEFAULT_FLOW, { pago: false, contractSignStatus: 'sent' }),
    ).toBe('redirect_sign');

    expect(
      resolveClientActionAfterApprove(DEFAULT_FLOW, { pago: false, contractSignStatus: 'pending' }),
    ).toBe('redirect_sign');

    // Após assinar ('signed'), avança para o pagamento.
    expect(
      resolveClientActionAfterApprove(DEFAULT_FLOW, { pago: false, contractSignStatus: 'signed' }),
    ).toBe('show_pay');
  });

  it('journeyMethodOrder reflete fluxo configurado', () => {
    expect(journeyMethodOrder(DEFAULT_FLOW)).toEqual([
      'SIGNATURE_ON_SCREEN',
      'EMAIL_OTP',
      'PAYMENT',
    ]);
    expect(journeyMethodOrder({ steps: ['approve', 'pay', 'sign'] })).toEqual([
      'PAYMENT',
      'SIGNATURE_ON_SCREEN',
      'EMAIL_OTP',
    ]);
  });

  it('isSignFlowStepDone após assinatura do cliente', () => {
    expect(isSignFlowStepDone({ contractSignStatus: 'signed' })).toBe(true);
    expect(isSignFlowStepDone({ contractSignStatus: 'sent' })).toBe(false);
    expect(isSignFlowStepDone({ contractSignStatus: null })).toBe(false);
  });
});
