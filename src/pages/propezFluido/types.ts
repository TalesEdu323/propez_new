import type { BuilderElement } from '../../types/builder';
import type { ProposalFlowConfig } from '../../types/proposalFlow';
import { DEFAULT_FLOW } from '../../types/proposalFlow';

/**
 * Forma única usada pelos steps para ler e escrever os dados da proposta.
 * É extraído aqui para permitir o compartilhamento entre Step1..Step5 e a
 * página `PropezFluido` sem duplicação.
 */
export interface PropezFluidoFormData {
  modeloId: string;
  clienteId: string;
  clienteNome: string;
  clienteEmail: string;
  prosyncLeadId: string;
  servicos: string[];
  valor: string;
  desconto: string;
  recorrente: boolean;
  cicloRecorrencia: string;
  duracaoRecorrencia: string;
  envio: string;
  validade: string;
  elementos: BuilderElement[];
  contratoTexto: string;
  contratoId: string;
  chavePix: string;
  linkPagamento: string;
  fluxo: ProposalFlowConfig;
}

export const INITIAL_PROPEZ_FLUIDO_FORM: PropezFluidoFormData = {
  modeloId: '',
  clienteId: '',
  clienteNome: '',
  clienteEmail: '',
  prosyncLeadId: '',
  servicos: [],
  valor: '',
  desconto: '',
  recorrente: false,
  cicloRecorrencia: 'mensal',
  duracaoRecorrencia: '12',
  envio: '',
  validade: '',
  elementos: [],
  contratoTexto: '',
  contratoId: '',
  chavePix: '',
  linkPagamento: '',
  fluxo: DEFAULT_FLOW,
};

export interface StepDescriptor {
  id: number;
  title: string;
  desc: string;
}

export type SetFormData = React.Dispatch<React.SetStateAction<PropezFluidoFormData>>;
