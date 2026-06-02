export type ContractDocumentStatus =
  | 'UPLOADED'
  | 'WAITING_SIGNATURES'
  | 'SIGNED'
  | 'FAILED'
  | 'CANCELLED';

export type FieldType = 'SIGNATURE' | 'TEXT' | 'DATE' | 'INITIALS';

export interface SignatureFieldConfig {
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface ModelSignatureConfig {
  version?: 2;
  signers?: Array<{ id: string; name: string; role: 'client' | 'org' }>;
  fields?: Array<{
    id: string;
    signerId: string;
    type: 'signature' | 'initials' | 'text';
    page: number;
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
    rotation?: number;
    groupId?: string;
    content?: string;
    fontKey?: string;
  }>;
  clientField?: SignatureFieldConfig;
  orgField?: SignatureFieldConfig;
}

export interface ContractFieldRow {
  id: string;
  document_id: string;
  signer_temp_id: string;
  signer_name: string;
  signer_email: string;
  field_type: string;
  page: number;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
  required: boolean;
  content: string | null;
}

export interface SignatureLinkRow {
  id: string;
  document_id: string;
  token: string;
  signer_email: string;
  signer_name: string;
  expires_at: Date;
  used: boolean;
  used_at: Date | null;
  signature_data: Record<string, unknown> | null;
  authentication_data: Record<string, unknown> | null;
}

export interface ContractDocumentRow {
  id: string;
  organization_id: string;
  proposta_id: string | null;
  title: string;
  file_name: string;
  status: ContractDocumentStatus;
  original_pdf_path: string | null;
  signed_pdf_path: string | null;
  document_hash: string | null;
  validation_token: string | null;
  created_at: Date;
  updated_at: Date;
}

export const DEFAULT_CLIENT_FIELD: SignatureFieldConfig = {
  page: 1,
  xPct: 35,
  yPct: 82,
  widthPct: 30,
  heightPct: 10,
};
