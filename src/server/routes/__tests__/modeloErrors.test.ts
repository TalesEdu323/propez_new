import { describe, expect, it } from 'vitest';
import { MODELO_MAX_PAYLOAD_BYTES, modeloErrorResponse } from '../modeloErrors.js';

describe('modeloErrorResponse', () => {
  it('mapeia FK inválida', () => {
    expect(modeloErrorResponse({ code: '23503' })).toEqual({
      status: 400,
      error: expect.stringContaining('Contrato ou serviço'),
    });
  });

  it('mapeia schema desatualizado', () => {
    expect(modeloErrorResponse({ code: '42703' }).status).toBe(503);
  });

  it('mapeia jsonb inválido', () => {
    expect(modeloErrorResponse({ code: '22P02' }).status).toBe(400);
  });

  it('limite de payload alinhado ao express 5mb', () => {
    expect(MODELO_MAX_PAYLOAD_BYTES).toBe(4_000_000);
  });
});
