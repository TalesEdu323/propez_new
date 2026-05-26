import type { BuilderElement } from '../types/builder';
import type { ProposalFlowConfig } from '../types/proposalFlow';
import { DEFAULT_FLOW } from '../types/proposalFlow';
import { createId } from '../lib/ids';

export interface StarterTemplate {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  elementos: BuilderElement[];
  fluxo: ProposalFlowConfig;
}

function cloneElements(elements: BuilderElement[]): BuilderElement[] {
  return JSON.parse(JSON.stringify(elements)).map((el: BuilderElement) => ({
    ...el,
    id: createId(),
    children: el.children?.map((c) => ({ ...c, id: createId() })),
  }));
}

const consultoriaElements: BuilderElement[] = [
  {
    id: 's1',
    type: 'marketing_hero',
    props: {
      title: 'Proposta de Consultoria Estratégica',
      subtitle: 'Um plano claro para escalar seus resultados com previsibilidade.',
      badge: 'Exclusivo para você',
    },
  },
  {
    id: 's2',
    type: 'paragraph',
    props: {
      text: 'Nesta proposta detalhamos escopo, entregáveis, cronograma e investimento para transformar sua operação comercial.',
      color: '#52525b',
      align: 'center',
      size: 'text-lg',
    },
  },
  {
    id: 's3',
    type: 'feature_grid',
    props: {
      title: 'O que está incluso',
      items: [
        { title: 'Diagnóstico', desc: 'Mapeamento completo do funil atual' },
        { title: 'Plano de ação', desc: '90 dias com metas e responsáveis' },
        { title: 'Acompanhamento', desc: 'Reuniões quinzenais de performance' },
      ],
    },
  },
  {
    id: 's4',
    type: 'marketing_cta',
    props: {
      title: 'Pronto para avançar?',
      description: 'Revise os detalhes abaixo e confirme sua aprovação quando estiver de acordo.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
];

const agenciaElements: BuilderElement[] = [
  {
    id: 'a1',
    type: 'heading',
    props: { text: 'Proposta — Performance & Criativo', color: '#0a0a0a', align: 'center', size: 'text-5xl', weight: 'font-bold' },
  },
  {
    id: 'a2',
    type: 'marketing_services',
    props: {
      title: 'Pacote recomendado',
      services: [
        { name: 'Gestão de anúncios', desc: 'Meta + Google com otimização semanal' },
        { name: 'Criativos', desc: '4 peças novas por mês' },
        { name: 'Landing page', desc: '1 página de conversão otimizada' },
      ],
    },
  },
  {
    id: 'a3',
    type: 'pricing',
    props: {
      title: 'Investimento mensal',
      price: 'R$ 4.997',
      period: '/mês',
      items: ['Setup incluso', 'Relatório executivo', 'Suporte via WhatsApp'],
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      buttonColor: '#0a0a0a',
      bgColor: '#fafafa',
    },
  },
];

const recorrenteElements: BuilderElement[] = [
  {
    id: 'r1',
    type: 'marketing_context',
    props: {
      title: 'Assinatura de serviço recorrente',
      paragraphs: [
        'Modelo pensado para parcerias de longo prazo com entregas contínuas e previsibilidade de caixa.',
      ],
    },
  },
  {
    id: 'r2',
    type: 'icon_list',
    props: {
      items: ['Suporte prioritário', 'Atualizações mensais', 'SLA de 24h úteis'],
      iconColor: '#10b981',
      textColor: '#52525b',
    },
  },
  {
    id: 'r3',
    type: 'button',
    props: {
      text: 'Aprovar proposta',
      proposalAction: 'approve',
      bgColor: '#18181b',
      textColor: '#ffffff',
      align: 'center',
      radius: 'rounded-2xl',
      animation: 'scale',
    },
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'starter-consultoria',
    nome: 'Consultoria',
    descricao: 'Hero, benefícios e CTA para serviços consultivos.',
    categoria: 'Serviços',
    elementos: consultoriaElements,
    fluxo: DEFAULT_FLOW,
  },
  {
    id: 'starter-agencia',
    nome: 'Agência / Marketing',
    descricao: 'Serviços, pricing e foco em performance.',
    categoria: 'Marketing',
    elementos: agenciaElements,
    fluxo: DEFAULT_FLOW,
  },
  {
    id: 'starter-recorrente',
    nome: 'Assinatura recorrente',
    descricao: 'Layout enxuto para contratos mensais.',
    categoria: 'Recorrente',
    elementos: recorrenteElements,
    fluxo: DEFAULT_FLOW,
  },
];

export function applyStarterTemplate(templateId: string): {
  elementos: BuilderElement[];
  fluxo: ProposalFlowConfig;
  nome: string;
} | null {
  const t = STARTER_TEMPLATES.find((x) => x.id === templateId);
  if (!t) return null;
  return {
    elementos: cloneElements(t.elementos),
    fluxo: t.fluxo,
    nome: t.nome,
  };
}
