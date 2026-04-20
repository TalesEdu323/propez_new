import type { BuilderElement } from '../../types/builder';

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
}

export interface StepDescriptor {
  id: number;
  title: string;
  desc: string;
}

export type SetFormData = React.Dispatch<React.SetStateAction<PropezFluidoFormData>>;
