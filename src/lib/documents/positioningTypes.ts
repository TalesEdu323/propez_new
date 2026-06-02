export type TipoMarcador = 'signature' | 'initials' | 'text';

export type SignatureFontKey = 'aletheia' | 'authentic';

export interface Marcador {
  id: string;
  signerId: string;
  type: TipoMarcador;
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  rotation?: number;
  groupId?: string;
  content?: string;
  fontKey?: SignatureFontKey;
}

export interface PositioningSigner {
  id: string;
  name: string;
  email: string;
}

export type TemplateSignerRole = 'client' | 'org';

export interface ContractTemplateSigner {
  id: string;
  name: string;
  role: TemplateSignerRole;
}

export interface ContractTemplateSignatureConfigV2 {
  version: 2;
  signers: ContractTemplateSigner[];
  fields: Marcador[];
}

export function createId(): string {
  return `fld_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
