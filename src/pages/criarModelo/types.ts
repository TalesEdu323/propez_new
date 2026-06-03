import type { Dispatch, SetStateAction } from 'react';
import type { BuilderElement } from '../../types/builder';
import type { ProposalFlowConfig } from '../../types/proposalFlow';
import { DEFAULT_FLOW } from '../../types/proposalFlow';

export interface ModelSignatureConfig {
  clientField?: {
    page: number;
    xPct: number;
    yPct: number;
    widthPct: number;
    heightPct: number;
  };
}

export interface CriarModeloFormData {
  nome: string;
  servicos: string[];
  contratoTexto: string;
  contratoId: string;
  chavePix: string;
  linkPagamento: string;
  whatsappComprovante: string;
  fluxo: ProposalFlowConfig;
  signatureConfig?: ModelSignatureConfig;
}

export const INITIAL_CRIAR_MODELO_FORM: CriarModeloFormData = {
  nome: '',
  servicos: [],
  contratoTexto: '',
  contratoId: '',
  chavePix: '',
  linkPagamento: '',
  whatsappComprovante: '',
  fluxo: DEFAULT_FLOW,
};

export interface CriarModeloStepDescriptor {
  id: number;
  title: string;
  desc: string;
}

export type SetCriarModeloFormData = Dispatch<SetStateAction<CriarModeloFormData>>;

export type { BuilderElement };
