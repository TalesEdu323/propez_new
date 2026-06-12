import { describe, expect, it } from 'vitest';
import { modeloErrorResponse } from '../modeloErrors.js';
import { JsonNotSerializableError } from '../../db/jsonbParam.js';
import { ModeloReferenceError } from '../modeloPersistHelpers.js';

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

  it('mapeia unique violation', () => {
    expect(modeloErrorResponse({ code: '23505' }).status).toBe(409);
  });

  it('mapeia timeout', () => {
    expect(modeloErrorResponse({ code: '57014' }).status).toBe(504);
  });

  it('mapeia JSON não serializável', () => {
    expect(modeloErrorResponse(new JsonNotSerializableError('elementos')).status).toBe(400);
  });

  it('mapeia referência inválida pré-validada', () => {
    expect(
      modeloErrorResponse(new ModeloReferenceError('Contrato ausente')).status,
    ).toBe(400);
  });
});
