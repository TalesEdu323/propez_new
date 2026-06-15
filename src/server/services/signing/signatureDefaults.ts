import {
  fieldsForSigner,
  normalizeSignatureConfig,
  resolveClientSignatureFieldLegacy,
  resolveSignatureConfigWithDefaults,
  type DbContractField,
} from '../../../lib/signatureConfig.js';
import type { SignatureFieldConfig } from './types.js';
import { DEFAULT_CLIENT_FIELD } from './types.js';

export {
  fieldsForSigner,
  hasClientSignatureField,
  normalizeSignatureConfig,
  parseSavedSignatureConfig,
  resolveSignatureConfigWithDefaults,
  getOrgSignatureFields,
  validateTemplateSignatureConfig,
  hasSignerSignatureField,
} from '../../../lib/signatureConfig.js';

export function resolveClientSignatureField(signatureConfig: unknown): SignatureFieldConfig {
  const legacy = resolveClientSignatureFieldLegacy(signatureConfig);
  return {
    page: legacy.page,
    xPct: legacy.xPct,
    yPct: legacy.yPct,
    widthPct: legacy.widthPct,
    heightPct: legacy.heightPct,
  };
}

export function defaultFieldsForSigner(input: {
  tempId: string;
  name: string;
  email: string;
  field?: SignatureFieldConfig;
  signatureConfig?: unknown;
}): DbContractField[] {
  if (input.signatureConfig) {
    const cfg = normalizeSignatureConfig(input.signatureConfig);
    return fieldsForSigner(cfg, 'client', {
      tempId: input.tempId,
      name: input.name,
      email: input.email,
    });
  }
  const field = input.field ?? DEFAULT_CLIENT_FIELD;
  return [
    {
      signerTempId: input.tempId,
      signerName: input.name,
      signerEmail: input.email,
      fieldType: 'SIGNATURE',
      page: field.page,
      xPct: field.xPct,
      yPct: field.yPct - 0.6,
      widthPct: field.widthPct,
      heightPct: field.heightPct,
    },
  ];
}

export function allFieldsFromTemplateConfig(
  signatureConfig: unknown,
  client: { tempId: string; name: string; email: string },
  org: { tempId: string; name: string; email: string },
  pageCount = 1,
): DbContractField[] {
  const cfg = resolveSignatureConfigWithDefaults(signatureConfig, org.name, pageCount);
  return [
    ...fieldsForSigner(cfg, 'client', client),
    ...fieldsForSigner(cfg, 'org', org, { yOffsetPct: 0 }),
  ];
}
