import { resolveClientSignatureField } from './signatureDefaults.js';
import type { SignatureFieldConfig } from './types.js';

export function resolveSignatureConfigFromSources(
  contratoConfig: unknown,
  modeloConfig?: unknown,
): SignatureFieldConfig {
  if (contratoConfig && typeof contratoConfig === 'object') {
    const resolved = resolveClientSignatureField(contratoConfig);
    const cfg = contratoConfig as { clientField?: Partial<SignatureFieldConfig> };
    if (cfg.clientField) return resolved;
  }
  return resolveClientSignatureField(modeloConfig);
}

export function hasClientSignatureField(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const cfg = config as { clientField?: Partial<SignatureFieldConfig> };
  return !!cfg.clientField && typeof cfg.clientField.xPct === 'number';
}
