import type { SignatureFieldConfig } from './types.js';
import { DEFAULT_CLIENT_FIELD } from './types.js';

export function resolveClientSignatureField(
  signatureConfig: unknown,
): SignatureFieldConfig {
  if (!signatureConfig || typeof signatureConfig !== 'object') return DEFAULT_CLIENT_FIELD;
  const cfg = signatureConfig as { clientField?: Partial<SignatureFieldConfig> };
  const f = cfg.clientField;
  if (!f) return DEFAULT_CLIENT_FIELD;
  return {
    page: f.page ?? DEFAULT_CLIENT_FIELD.page,
    xPct: f.xPct ?? DEFAULT_CLIENT_FIELD.xPct,
    yPct: f.yPct ?? DEFAULT_CLIENT_FIELD.yPct,
    widthPct: f.widthPct ?? DEFAULT_CLIENT_FIELD.widthPct,
    heightPct: f.heightPct ?? DEFAULT_CLIENT_FIELD.heightPct,
  };
}

export function defaultFieldsForSigner(input: {
  tempId: string;
  name: string;
  email: string;
  field?: SignatureFieldConfig;
}): Array<{
  signerTempId: string;
  signerName: string;
  signerEmail: string;
  fieldType: 'SIGNATURE';
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}> {
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
