import { describe, expect, it } from 'vitest';
import { serializeModelo, serializeModeloSummary } from '../serializers.js';

describe('serializeModeloSummary', () => {
  it('não inclui elementos nem contrato_texto pesados', () => {
    const row = {
      id: '11111111-1111-4111-8111-111111111111',
      nome: 'Modelo teste',
      elementos: [{ id: 'a', type: 'heading', props: { text: 'Título' } }],
      page_layout: { widthMode: 'boxed', horizontalPadding: 60 },
      servicos: [],
      contrato_id: null,
      contrato_texto: 'Contrato longo...',
      chave_pix: null,
      link_pagamento: null,
      whatsapp_comprovante: null,
      tier: 'free',
      fluxo: { steps: ['approve'] },
      signature_config: { clientField: { page: 1 } },
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const summary = serializeModeloSummary(row);
    expect(summary.elementos).toEqual([]);
    expect(summary.contratoTexto).toBeUndefined();
    expect(summary.signatureConfig).toBeUndefined();
    expect(summary.nome).toBe('Modelo teste');
  });

  it('serializeModelo completo preserva elementos', () => {
    const row = {
      id: '11111111-1111-4111-8111-111111111111',
      nome: 'Completo',
      elementos: [{ id: 'a', type: 'heading', props: {} }],
      page_layout: null,
      servicos: [],
      contrato_id: null,
      contrato_texto: null,
      chave_pix: null,
      link_pagamento: null,
      whatsapp_comprovante: null,
      tier: 'free',
      fluxo: null,
      signature_config: null,
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const full = serializeModelo(row);
    expect(full.elementos).toHaveLength(1);
  });
});
