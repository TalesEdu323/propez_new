import type { Dispatch, SetStateAction } from 'react';
import type { BuilderElement } from '../../types/builder';
import type { ProposalFlowConfig } from '../../types/proposalFlow';
import { DEFAULT_FLOW } from '../../types/proposalFlow';

export interface CriarModeloFormData {
  nome: string;
  servicos: string[];
  contratoTexto: string;
  contratoId: string;
  chavePix: string;
  linkPagamento: string;
  fluxo: ProposalFlowConfig;
}

export const INITIAL_CRIAR_MODELO_FORM: CriarModeloFormData = {
  nome: '',
  servicos: [],
  contratoTexto: '',
  contratoId: '',
  chavePix: '',
  linkPagamento: '',
  fluxo: DEFAULT_FLOW,
};

export interface CriarModeloStepDescriptor {
  id: number;
  title: string;
  desc: string;
}

export type SetCriarModeloFormData = Dispatch<SetStateAction<CriarModeloFormData>>;

export type { BuilderElement };
