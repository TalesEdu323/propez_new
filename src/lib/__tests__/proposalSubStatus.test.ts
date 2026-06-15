import { describe, expect, it } from 'vitest';
import { getProposalListingStatus } from '../proposalSubStatus';
import type { Proposta } from '../store';

function baseProposta(overrides: Partial<Proposta> = {}): Proposta {
  return {
    id: 'p1',
    cliente_id: 'c1',
    cliente_nome: 'Cliente',
    servicos: [],
    valor: 1000,
    status: 'aprovada',
    data_criacao: '2026-01-01',
    elementos: [],
    pago: false,
    fluxo: { steps: ['approve', 'sign', 'pay'] },
    ...overrides,
  };
}

describe('proposalSubStatus', () => {
  it('conta assinatura como concluída após cliente assinar', () => {
    const listing = getProposalListingStatus(
      baseProposta({ contractSignStatus: 'signed', pago: false }),
    );
    expect(listing.doneSteps).toBe(2);
    expect(listing.secondaryLabels).toContain('Pagamento pendente');
  });

  it('marca proposta concluída quando todos os passos do fluxo terminam', () => {
    const listing = getProposalListingStatus(
      baseProposta({
        contractSignStatus: 'signed',
        orgContratoAceitoAt: '2026-01-02',
        contratoConcluidoAt: '2026-01-02',
        pago: true,
      }),
    );
    expect(listing.primaryLabel).toBe('Concluída');
    expect(listing.doneSteps).toBe(3);
  });
});
