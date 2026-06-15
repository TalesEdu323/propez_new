import { describe, expect, it } from 'vitest';
import {
  buildRequestContext,
  capErrorDetailSize,
  extractPgError,
  summarizeRequestBody,
  summarizeRequestParams,
} from '../apiErrorRequestContext.js';

describe('apiErrorRequestContext', () => {
  it('mascara token em params', () => {
    const params = summarizeRequestParams({
      token: '6xlGj5SxmicTtCJvuohpq_r0HMWr1C6R',
    });
    expect(params.token).toBe('6xlG…Wr1C6R');
    expect(params.token).not.toContain('micTtCJ');
  });

  it('resume body de modelo sem gravar contratoTexto completo', () => {
    const body = summarizeRequestBody({
      nome: 'Proposta XYZ',
      elementos: [{ id: '1' }, { id: '2' }],
      servicos: ['00000000-0000-4000-8000-000000000001'],
      contratoTexto: 'x'.repeat(5000),
      chavePix: '11999999999',
    });

    expect(body?.nome).toBe('Proposta XYZ');
    expect(body?.elementosCount).toBe(2);
    expect(body?.servicosCount).toBe(1);
    expect(body?.contratoTextoBytes).toBe(5000);
    expect(body?.chavePix).toBe('***');
    expect(body).not.toHaveProperty('contratoTexto');
  });

  it('extrai erro Postgres', () => {
    const pg = extractPgError({
      code: '23503',
      constraint: 'modelos_contrato_fk',
      detail: 'Key (contrato_id)=(...) is not present in table "contratos_templates".',
    });

    expect(pg?.code).toBe('23503');
    expect(pg?.constraint).toBe('modelos_contrato_fk');
    expect(pg?.detail).toContain('contratos_templates');
  });

  it('monta request context com params, query e body', () => {
    const ctx = buildRequestContext(
      { id: 'dba38d48-2fdb-4da1-a8c6-cf078ae06c23' },
      { fields: 'summary' },
      { email: 'cliente@example.com' },
    );

    expect(ctx.params).toEqual({ id: 'dba38d48-2fdb-4da1-a8c6-cf078ae06c23' });
    expect(ctx.query).toEqual({ fields: 'summary' });
    expect(ctx.body).toMatchObject({ email: 'cliente@example.com' });
  });

  it('trunca error_detail quando excede limite', () => {
    const detail = capErrorDetailSize({
      cause: {
        message: 'erro',
        stack: 'x'.repeat(10_000),
        pg: { code: '23503' },
      },
      request: { body: { nome: 'test' } },
    });

    const serialized = JSON.stringify(detail);
    expect(Buffer.byteLength(serialized, 'utf8')).toBeLessThanOrEqual(8000);
    expect(detail.cause).toBeDefined();
  });
});
