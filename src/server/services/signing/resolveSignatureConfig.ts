import {
  hasClientSignatureField,
  hasSignerSignatureField,
  normalizeSignatureConfig,
  resolveClientSignatureFieldLegacy,
} from '../../../lib/signatureConfig.js';
import type { SignatureFieldConfig } from './types.js';

export {
  hasClientSignatureField,
  hasSignerSignatureField,
  normalizeSignatureConfig,
  validateTemplateSignatureConfig,
} from '../../../lib/signatureConfig.js';

export function resolveSignatureConfigFromSources(
  contratoConfig: unknown,
  modeloConfig?: unknown,
): SignatureFieldConfig {
  if (contratoConfig && typeof contratoConfig === 'object') {
    const cfg = contratoConfig as { clientField?: Partial<SignatureFieldConfig>; version?: number };
    if (cfg.clientField || cfg.version === 2) {
      return resolveClientSignatureFieldLegacy(contratoConfig);
    }
  }
  return resolveClientSignatureFieldLegacy(modeloConfig);
}

export function resolveNormalizedSignatureConfig(
  contratoConfig: unknown,
  modeloConfig?: unknown,
  orgName = 'Empresa',
  pageCount = 1,
) {
  if (contratoConfig && typeof contratoConfig === 'object') {
    const cfg = contratoConfig as { version?: number; fields?: unknown[]; clientField?: unknown };
    if (cfg.version === 2 || cfg.clientField || (cfg.fields && cfg.fields.length > 0)) {
      return normalizeSignatureConfig(contratoConfig, orgName, pageCount);
    }
  }
  return normalizeSignatureConfig(modeloConfig, orgName, pageCount);
}
