import { describe, expect, it } from 'vitest';
import { buildJourneyMethods } from '../signJourney';

describe('buildJourneyMethods', () => {
  it('ordena pagamento antes da assinatura quando fluxo é approve → pay → sign', () => {
    const methods = buildJourneyMethods({ steps: ['approve', 'pay', 'sign'] }, {});
    expect(methods.map((m) => m.id)).toEqual(['PAYMENT', 'SIGNATURE_ON_SCREEN', 'EMAIL_OTP']);
  });

  it('ordena assinatura antes do pagamento no fluxo padrão', () => {
    const methods = buildJourneyMethods({ steps: ['approve', 'sign', 'pay'] }, {});
    expect(methods.map((m) => m.id)).toEqual(['SIGNATURE_ON_SCREEN', 'EMAIL_OTP', 'PAYMENT']);
  });

  it('omite pagamento quando fluxo não inclui pay', () => {
    const methods = buildJourneyMethods({ steps: ['approve', 'sign'] }, {});
    expect(methods.map((m) => m.id)).toEqual(['SIGNATURE_ON_SCREEN', 'EMAIL_OTP']);
  });
});
