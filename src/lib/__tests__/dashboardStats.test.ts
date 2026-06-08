import { describe, expect, it } from 'vitest';
import {
  aggregateByStatus,
  approvedRevenue,
  defaultDateFilterState,
  filterPropostasInRange,
  getFilterRange,
} from '../dashboardStats';
import type { Proposta } from '../store';

function mockProposta(
  partial: Pick<Proposta, 'id' | 'status' | 'valor' | 'data_criacao'>,
): Proposta {
  return {
    id: partial.id,
    cliente_id: 'c1',
    cliente_nome: 'Cliente',
    servicos: [],
    valor: partial.valor,
    status: partial.status,
    data_criacao: partial.data_criacao,
    elementos: [],
    pago: false,
  };
}

describe('dashboardStats', () => {
  it('filtra propostas por mês', () => {
    const filter = { ...defaultDateFilterState(), mode: 'month' as const, year: 2026, month: 4 };
    const { start, end } = getFilterRange(filter);
    const list = [
      mockProposta({ id: '1', status: 'aprovada', valor: 1000, data_criacao: '2026-05-10T12:00:00Z' }),
      mockProposta({ id: '2', status: 'pendente', valor: 500, data_criacao: '2026-04-02T12:00:00Z' }),
    ];
    const filtered = filterPropostasInRange(list, start, end);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('1');
  });

  it('agrega por status e faturamento aprovado', () => {
    const list = [
      mockProposta({ id: '1', status: 'aprovada', valor: 1000, data_criacao: '2026-05-01' }),
      mockProposta({ id: '2', status: 'recusada', valor: 200, data_criacao: '2026-05-02' }),
      mockProposta({ id: '3', status: 'pendente', valor: 300, data_criacao: '2026-05-03' }),
    ];
    const stats = aggregateByStatus(list);
    expect(stats.aprovada.count).toBe(1);
    expect(stats.recusada.count).toBe(1);
    expect(stats.pendente.count).toBe(1);
    expect(approvedRevenue(stats)).toBe(1000);
  });
});
