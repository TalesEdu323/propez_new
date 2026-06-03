import type { ProposalFlowConfig } from '../../../types/proposalFlow';

export type SignStep =
  | 'document'
  | 'identity'
  | 'auth_select'
  | 'screen_signature'
  | 'email_otp'
  | 'payment'
  | 'complete';

export type JourneyMethodId = 'SIGNATURE_ON_SCREEN' | 'EMAIL_OTP' | 'PAYMENT';

export interface SignFieldMarker {
  type: string;
  page: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface SignMeta {
  documentId: string;
  title: string;
  signerName: string;
  signerEmail: string;
  used: boolean;
  expiresAt: string;
  previewUrl: string;
  publicToken?: string | null;
  fluxo?: ProposalFlowConfig;
  valorCents?: number | null;
  chavePix?: string | null;
  linkPagamento?: string | null;
  identityValidated?: boolean;
  clientFields?: SignFieldMarker[];
}

export interface JourneyMethod {
  id: JourneyMethodId;
  name: string;
  description: string;
  icon: string;
  order: number;
  available: boolean;
  completed: boolean;
}

export interface JourneyMethodsResponse {
  success: boolean;
  methods: JourneyMethod[];
  completedCount: number;
  totalSteps: number;
  nextMethodId: JourneyMethodId | null;
  allCompleted: boolean;
  identityValidated: boolean;
  fluxo: ProposalFlowConfig;
  payment: {
    valorCents: number | null;
    chavePix: string | null;
    linkPagamento: string | null;
    whatsappComprovante: string | null;
  } | null;
}

export interface OrgBrand {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  useOrgLogo?: boolean;
}
