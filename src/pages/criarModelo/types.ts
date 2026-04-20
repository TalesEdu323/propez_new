import type { Dispatch, SetStateAction } from 'react';
import type { BuilderElement } from '../../types/builder';

export interface CriarModeloFormData {
  nome: string;
  servicos: string[];
  contratoTexto: string;
  contratoId: string;
  chavePix: string;
  linkPagamento: string;
}

export interface CriarModeloStepDescriptor {
  id: number;
  title: string;
  desc: string;
}

export type SetCriarModeloFormData = Dispatch<SetStateAction<CriarModeloFormData>>;

export type { BuilderElement };
