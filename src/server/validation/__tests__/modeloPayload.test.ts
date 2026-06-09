import { describe, expect, it } from 'vitest';
import { modeloBodySchema, modeloPatchSchema } from '../modeloPayload.js';

describe('modeloBodySchema', () => {
  const validBase = {
    nome: 'Modelo teste',
    elementos: [],
    servicos: [],
    tier: 'free' as const,
  };

  it('aceita body sem signatureConfig', () => {
    const parsed = modeloBodySchema.safeParse(validBase);
    expect(parsed.success).toBe(true);
  });

  it('aceita signatureConfig null', () => {
    const parsed = modeloBodySchema.safeParse({ ...validBase, signatureConfig: null });
    expect(parsed.success).toBe(true);
  });

  it('aceita whatsappComprovante com até 20 dígitos', () => {
    const parsed = modeloBodySchema.safeParse({
      ...validBase,
      whatsappComprovante: '5511999999999',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejeita whatsappComprovante com mais de 20 caracteres', () => {
    const parsed = modeloBodySchema.safeParse({
      ...validBase,
      whatsappComprovante: '1'.repeat(21),
    });
    expect(parsed.success).toBe(false);
  });

  it('omite pageLayout.maxContentWidth inválido após preprocess', () => {
    const parsed = modeloBodySchema.safeParse({
      ...validBase,
      pageLayout: { widthMode: 'boxed', horizontalPadding: 60, maxContentWidth: 0 },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pageLayout?.maxContentWidth).toBeUndefined();
    }
  });

  it('aceita id UUID opcional para create idempotente', () => {
    const parsed = modeloBodySchema.safeParse({
      ...validBase,
      id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

describe('modeloPatchSchema', () => {
  it('aceita PATCH parcial só com elementos', () => {
    const parsed = modeloPatchSchema.safeParse({
      elementos: [{ id: 'el-1', type: 'text', props: {} }],
    });
    expect(parsed.success).toBe(true);
  });

  it('corrige fluxo inválido para DEFAULT_FLOW no PATCH', () => {
    const parsed = modeloPatchSchema.safeParse({
      fluxo: { steps: [] },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.fluxo?.steps).toContain('approve');
    }
  });

  it('omite maxContentWidth zero no PATCH', () => {
    const parsed = modeloPatchSchema.safeParse({
      pageLayout: { widthMode: 'boxed', horizontalPadding: 60, maxContentWidth: 0 },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.pageLayout?.maxContentWidth).toBeUndefined();
    }
  });
});
