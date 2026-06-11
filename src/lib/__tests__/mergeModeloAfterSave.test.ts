import { describe, expect, it } from 'vitest';
import { mergeModeloAfterSaveForTest } from '../mergeModeloAfterSave';
import type { ModeloProposta } from '../store';

const localBase: ModeloProposta = {
  id: 'local-id',
  nome: 'Modelo local',
  elementos: [{ id: 'el-1', type: 'heading', props: { text: 'Título' } }],
  pageLayout: { widthMode: 'boxed', horizontalPadding: 60, primaryColor: '#ff0000' },
  servicos: [],
  contratoId: '550e8400-e29b-41d4-a716-446655440000',
  contratoTexto: 'Texto local (não deve ir ao servidor)',
  tier: 'free',
  fluxo: { steps: ['approve', 'sign'] },
  data_criacao: '2026-01-01',
};

describe('mergeModeloAfterSave', () => {
  it('preserva elementos e pageLayout quando API retorna summary vazio', () => {
    const apiSummary: ModeloProposta = {
      id: 'server-id',
      nome: 'Modelo salvo',
      elementos: [],
      pageLayout: { widthMode: 'boxed', horizontalPadding: 60 },
      servicos: [],
      contratoId: '550e8400-e29b-41d4-a716-446655440000',
      tier: 'free',
      fluxo: { steps: ['approve', 'sign'] },
      data_criacao: '2026-01-02',
    };
    const merged = mergeModeloAfterSaveForTest(localBase, apiSummary);
    expect(merged.id).toBe('server-id');
    expect(merged.nome).toBe('Modelo salvo');
    expect(merged.elementos).toHaveLength(1);
    expect(merged.elementos[0].props.text).toBe('Título');
    expect(merged.pageLayout.primaryColor).toBe('#ff0000');
    expect(merged.contratoTexto).toBe('Texto local (não deve ir ao servidor)');
  });

  it('usa elementos da API quando a resposta traz conteúdo completo', () => {
    const apiFull: ModeloProposta = {
      ...localBase,
      id: 'server-id',
      elementos: [{ id: 'el-2', type: 'text', props: { text: 'Novo' } }],
    };
    const merged = mergeModeloAfterSaveForTest(localBase, apiFull);
    expect(merged.elementos).toHaveLength(1);
    expect(merged.elementos[0].id).toBe('el-2');
  });
});
