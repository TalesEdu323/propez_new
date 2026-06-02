import type {
  ContractTemplateSignatureConfigV2,
  ContractTemplateSigner,
  Marcador,
  PositioningSigner,
  TipoMarcador,
} from './documents/positioningTypes.js';
import { createId } from './documents/positioningTypes.js';
import { DEFAULT_HEIGHT_PCT, DEFAULT_WIDTH_PCT } from './documents/positioningConstants.js';

/** Legado v1 — percentuais 0–100 */
export interface LegacyClientField {
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export const DEFAULT_CLIENT_FIELD_LEGACY: LegacyClientField = {
  page: 1,
  xPct: 35,
  yPct: 82,
  widthPct: 30,
  heightPct: 10,
};

/** Posição padrão da org (legado stampOrgSignatureOnPdf) — percentuais 0–100 */
export const DEFAULT_ORG_FIELD_LEGACY: LegacyClientField = {
  page: 1,
  xPct: 12,
  yPct: 88,
  widthPct: 28,
  heightPct: 8,
};

export function pctToUi(v: number): number {
  if (v <= 1 && v >= 0) return v;
  return v / 100;
}

export function pctToStorage(v: number): number {
  if (v <= 1 && v >= 0) return v * 100;
  return v;
}

export function defaultTemplateSigners(orgName: string): ContractTemplateSigner[] {
  return [
    { id: 'client', name: 'Cliente', role: 'client' },
    { id: 'org', name: orgName || 'Empresa', role: 'org' },
  ];
}

export function templateSignersToPositioning(
  signers: ContractTemplateSigner[],
  orgEmail = 'empresa@org',
): PositioningSigner[] {
  return signers.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.role === 'client' ? 'cliente@proposta' : orgEmail,
  }));
}

function legacyFieldToMarcador(
  signerId: string,
  type: TipoMarcador,
  field: LegacyClientField,
  pageOverride?: number,
): Marcador {
  return {
    id: createId(),
    signerId,
    type,
    page: pageOverride ?? field.page,
    xPct: pctToUi(field.xPct),
    yPct: pctToUi(field.yPct),
    widthPct: pctToUi(field.widthPct),
    heightPct: pctToUi(field.heightPct),
  };
}

export function normalizeSignatureConfig(
  raw: unknown,
  orgName = 'Empresa',
  pageCount = 1,
): ContractTemplateSignatureConfigV2 {
  if (raw && typeof raw === 'object') {
    const cfg = raw as Record<string, unknown>;
    if (cfg.version === 2 && Array.isArray(cfg.fields)) {
      const signers = Array.isArray(cfg.signers)
        ? (cfg.signers as ContractTemplateSigner[])
        : defaultTemplateSigners(orgName);
      const fields = (cfg.fields as Marcador[]).map((f) => ({
        ...f,
        xPct: pctToUi(f.xPct),
        yPct: pctToUi(f.yPct),
        widthPct: pctToUi(f.widthPct ?? DEFAULT_WIDTH_PCT),
        heightPct: pctToUi(f.heightPct ?? DEFAULT_HEIGHT_PCT),
      }));
      return { version: 2, signers, fields };
    }

    const clientField = cfg.clientField as Partial<LegacyClientField> | undefined;
    const orgField = cfg.orgField as Partial<LegacyClientField> | undefined;
    if (clientField && typeof clientField.xPct === 'number') {
      const client = { ...DEFAULT_CLIENT_FIELD_LEGACY, ...clientField };
      const org = { ...DEFAULT_ORG_FIELD_LEGACY, ...orgField, page: pageCount };
      return {
        version: 2,
        signers: defaultTemplateSigners(orgName),
        fields: [
          legacyFieldToMarcador('client', 'signature', client),
          legacyFieldToMarcador('org', 'signature', org, pageCount),
        ],
      };
    }
  }

  return {
    version: 2,
    signers: defaultTemplateSigners(orgName),
    fields: [
      legacyFieldToMarcador('client', 'signature', DEFAULT_CLIENT_FIELD_LEGACY),
      legacyFieldToMarcador('org', 'signature', { ...DEFAULT_ORG_FIELD_LEGACY, page: pageCount }, pageCount),
    ],
  };
}

export function configToMarcadores(config: ContractTemplateSignatureConfigV2): Marcador[] {
  return config.fields;
}

export function marcadoresToConfig(
  marcadores: Marcador[],
  signers: ContractTemplateSigner[],
): ContractTemplateSignatureConfigV2 {
  return { version: 2, signers, fields: marcadores };
}

export function hasSignerSignatureField(
  config: ContractTemplateSignatureConfigV2,
  signerId: 'client' | 'org',
): boolean {
  return config.fields.some((f) => f.signerId === signerId && f.type === 'signature');
}

export function validateTemplateSignatureConfig(config: ContractTemplateSignatureConfigV2): string | null {
  if (!hasSignerSignatureField(config, 'client')) {
    return 'Posicione pelo menos um marcador de assinatura do Cliente.';
  }
  if (!hasSignerSignatureField(config, 'org')) {
    return 'Posicione pelo menos um marcador de assinatura da Empresa.';
  }
  return null;
}

export function hasClientSignatureField(raw: unknown): boolean {
  const cfg = normalizeSignatureConfig(raw);
  return hasSignerSignatureField(cfg, 'client');
}

export type DbContractField = {
  signerTempId: string;
  signerName: string;
  signerEmail: string;
  fieldType: 'SIGNATURE' | 'TEXT' | 'INITIALS' | 'DATE';
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  content?: string | null;
};

const TYPE_MAP: Record<TipoMarcador, DbContractField['fieldType']> = {
  signature: 'SIGNATURE',
  initials: 'INITIALS',
  text: 'TEXT',
};

export function fieldsForSigner(
  config: ContractTemplateSignatureConfigV2,
  signerId: 'client' | 'org',
  input: { tempId: string; name: string; email: string },
  options?: { yOffsetPct?: number },
): DbContractField[] {
  const yOff = options?.yOffsetPct ?? (signerId === 'client' ? -0.6 : 0);
  return config.fields
    .filter((f) => f.signerId === signerId)
    .map((f) => ({
      signerTempId: input.tempId,
      signerName: input.name,
      signerEmail: input.email,
      fieldType: TYPE_MAP[f.type] ?? 'SIGNATURE',
      page: f.page,
      xPct: pctToStorage(f.xPct),
      yPct: pctToStorage(f.yPct) + yOff,
      widthPct: pctToStorage(f.widthPct),
      heightPct: pctToStorage(f.heightPct),
      content: f.type === 'text' ? f.content ?? null : null,
    }));
}

export function getOrgSignatureFields(config: ContractTemplateSignatureConfigV2): Marcador[] {
  return config.fields.filter((f) => f.signerId === 'org');
}

/** Primeiro campo de assinatura do cliente (compat legado) */
export function resolveClientSignatureFieldLegacy(raw: unknown): LegacyClientField {
  const cfg = normalizeSignatureConfig(raw);
  const sig = cfg.fields.find((f) => f.signerId === 'client' && f.type === 'signature');
  if (!sig) return DEFAULT_CLIENT_FIELD_LEGACY;
  return {
    page: sig.page,
    xPct: pctToStorage(sig.xPct),
    yPct: pctToStorage(sig.yPct),
    widthPct: pctToStorage(sig.widthPct),
    heightPct: pctToStorage(sig.heightPct),
  };
}
