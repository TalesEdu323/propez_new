import { createId } from './ids';
import type { Proposta, Servico, ModeloProposta } from './store';
import type { BuilderElement, BuilderPageLayout } from '../types/builder';
import type { ProposalFlowConfig } from '../types/proposalFlow';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function copyLabel(name: string): string {
  return name.endsWith(' (cópia)') ? name : `${name} (cópia)`;
}

function cloneElements(elements: BuilderElement[] | undefined): BuilderElement[] {
  return deepClone(elements ?? []);
}

export function duplicateProposta(source: Proposta): Proposta {
  const now = new Date().toISOString();
  return {
    id: createId(),
    cliente_id: source.cliente_id,
    cliente_nome: copyLabel(source.cliente_nome),
    clienteEmail: source.clienteEmail,
    modelo_id: source.modelo_id,
    servicos: [...(source.servicos ?? [])],
    valor: source.valor,
    desconto: source.desconto,
    recorrente: source.recorrente,
    ciclo_recorrencia: source.ciclo_recorrencia,
    duracao_recorrencia: source.duracao_recorrencia,
    status: 'pendente',
    data_criacao: now,
    elementos: cloneElements(source.elementos),
    pageLayout: source.pageLayout ? deepClone(source.pageLayout) : undefined,
    contratoTexto: source.contratoTexto,
    contratoId: source.contratoId,
    chavePix: source.chavePix,
    linkPagamento: source.linkPagamento,
    whatsappComprovante: source.whatsappComprovante,
    pago: false,
    creatorPlan: source.creatorPlan,
    fluxo: source.fluxo ? deepClone(source.fluxo) as ProposalFlowConfig : undefined,
  };
}

export function duplicateServico(source: Servico): Servico {
  return {
    id: createId(),
    nome: copyLabel(source.nome),
    descricao: source.descricao,
    valor: source.valor,
    tipo: source.tipo,
    contratoId: source.contratoId,
    elementos: cloneElements(source.elementos),
  };
}

export function duplicateModelo(source: ModeloProposta): ModeloProposta {
  return {
    id: createId(),
    nome: copyLabel(source.nome),
    elementos: cloneElements(source.elementos),
    pageLayout: source.pageLayout ? deepClone(source.pageLayout) as BuilderPageLayout : undefined,
    servicos: [...(source.servicos ?? [])],
    contratoTexto: source.contratoTexto,
    contratoId: source.contratoId,
    chavePix: source.chavePix,
    linkPagamento: source.linkPagamento,
    whatsappComprovante: source.whatsappComprovante,
    fluxo: source.fluxo ? deepClone(source.fluxo) as ProposalFlowConfig : undefined,
    signatureConfig: source.signatureConfig ? deepClone(source.signatureConfig) : undefined,
    data_criacao: new Date().toISOString(),
    tier: source.tier,
  };
}
