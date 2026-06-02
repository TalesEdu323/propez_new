import { describe, expect, it } from 'vitest';
import {
  normalizeSignatureConfig,
  parseSavedSignatureConfig,
  resolveSignatureConfigWithDefaults,
  hasSignerSignatureField,
  validateTemplateSignatureConfig,
  fieldsForSigner,
  pctToUi,
  pctToStorage,
} from '../signatureConfig';

describe('signatureConfig', () => {
  it('parseSavedSignatureConfig returns empty fields when no config', () => {
    const cfg = parseSavedSignatureConfig(undefined);
    expect(cfg.fields).toEqual([]);
    expect(cfg.signers.length).toBe(2);
  });

  it('resolveSignatureConfigWithDefaults fills client and org when empty', () => {
    const cfg = resolveSignatureConfigWithDefaults(undefined);
    expect(cfg.fields.length).toBeGreaterThanOrEqual(2);
    expect(hasSignerSignatureField(cfg, 'client')).toBe(true);
    expect(hasSignerSignatureField(cfg, 'org')).toBe(true);
  });

  it('converts legacy clientField to v2 with client and org', () => {
    const cfg = normalizeSignatureConfig({
      clientField: { page: 1, xPct: 40, yPct: 80, widthPct: 25, heightPct: 12 },
    });
    expect(cfg.version).toBe(2);
    expect(cfg.fields.length).toBeGreaterThanOrEqual(2);
    expect(hasSignerSignatureField(cfg, 'client')).toBe(true);
    expect(hasSignerSignatureField(cfg, 'org')).toBe(true);
    expect(cfg.fields[0].xPct).toBeCloseTo(0.4, 2);
  });

  it('keeps v2 config with ui-scale percentages', () => {
    const cfg = normalizeSignatureConfig({
      version: 2,
      signers: [
        { id: 'client', name: 'Cliente', role: 'client' },
        { id: 'org', name: 'ACME', role: 'org' },
      ],
      fields: [
        {
          id: 'a',
          signerId: 'client',
          type: 'signature',
          page: 1,
          xPct: 0.35,
          yPct: 0.82,
          widthPct: 0.22,
          heightPct: 0.12,
        },
        {
          id: 'b',
          signerId: 'org',
          type: 'signature',
          page: 2,
          xPct: 0.12,
          yPct: 0.88,
          widthPct: 0.28,
          heightPct: 0.08,
        },
      ],
    });
    expect(validateTemplateSignatureConfig(cfg)).toBeNull();
  });

  it('fieldsForSigner stores percentages 0-100', () => {
    const cfg = normalizeSignatureConfig({
      version: 2,
      signers: [{ id: 'client', name: 'Cliente', role: 'client' }],
      fields: [
        {
          id: 'x',
          signerId: 'client',
          type: 'signature',
          page: 1,
          xPct: 0.5,
          yPct: 0.5,
          widthPct: 0.2,
          heightPct: 0.1,
        },
      ],
    });
    const rows = fieldsForSigner(cfg, 'client', {
      tempId: 't1',
      name: 'João',
      email: 'joao@test.com',
    });
    expect(rows[0].xPct).toBe(50);
    expect(rows[0].yPct).toBeCloseTo(49.4, 1);
  });

  it('pct helpers', () => {
    expect(pctToUi(35)).toBe(0.35);
    expect(pctToUi(0.35)).toBe(0.35);
    expect(pctToStorage(0.35)).toBe(35);
  });
});
