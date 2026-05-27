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
    id: 'c1',
    type: 'marketing_hero',
    props: {
      title: 'Proposta de Consultoria Estratégica',
      subtitle: 'Diagnóstico, plano de ação e acompanhamento para escalar resultados com previsibilidade.',
      badge: 'Preparado exclusivamente para você',
    },
  },
  {
    id: 'c2',
    type: 'spacer',
    props: { height: '48px' },
  },
  {
    id: 'c3',
    type: 'marketing_context',
    props: {
      title: 'Contexto e objetivo',
      paragraphs: [
        'Entendemos que sua operação precisa de clareza antes de escalar investimentos.',
        'Esta proposta detalha escopo, entregáveis, cronograma, governança e investimento para uma parceria de alto impacto.',
      ],
    },
  },
  {
    id: 'c4',
    type: 'stats',
    props: {
      items: [
        { value: '90', label: 'Dias de plano' },
        { value: '12', label: 'Sessões de alinhamento' },
        { value: '3', label: 'Frentes de trabalho' },
      ],
      bgColor: '#fafafa',
    },
  },
  {
    id: 'c5',
    type: 'feature_grid',
    props: {
      features: [
        { title: 'Diagnóstico', desc: 'Mapeamento de processos, funil e gargalos com entrevistas e dados.' },
        { title: 'Plano de ação', desc: 'Roadmap de 90 dias com metas, responsáveis e indicadores.' },
        { title: 'Execução assistida', desc: 'Rituais quinzenais, revisão de KPIs e ajustes de rota.' },
      ],
    },
  },
  {
    id: 'c6',
    type: 'service_stack',
    props: { mode: 'tabs', title: 'Escopo dos serviços', hint: 'Preenchido pelos serviços selecionados no modelo.' },
  },
  {
    id: 'c7',
    type: 'timeline',
    props: {
      steps: [
        { title: 'Semanas 1–2', desc: 'Kick-off, coleta de dados e diagnóstico inicial.' },
        { title: 'Semanas 3–6', desc: 'Desenho do plano e validação com liderança.' },
        { title: 'Semanas 7–12', desc: 'Implementação assistida e relatórios executivos.' },
      ],
    },
  },
  {
    id: 'c8',
    type: 'accordion',
    props: {
      title: 'Perguntas frequentes',
      items: [
        { title: 'Como funciona o acompanhamento?', content: 'Reuniões quinzenais de 60 minutos com pauta e registro de decisões.' },
        { title: 'Quem participa do projeto?', content: 'Sponsor executivo, ponto focal operacional e nosso time consultivo.' },
        { title: 'Posso ajustar o escopo depois?', content: 'Sim, mediante aditivo documentado e alinhamento de prazo/valor.' },
      ],
    },
  },
  {
    id: 'c9',
    type: 'testimonial',
    props: {
      quote: 'Em 60 dias saímos de um funil confuso para um processo comercial previsível e mensurável.',
      author: 'Diretora Comercial',
      role: 'Empresa de tecnologia B2B',
      stars: 5,
    },
  },
  {
    id: 'c10',
    type: 'pricing',
    props: {
      title: 'Investimento total',
      price: 'R$ 18.500',
      period: '',
      items: ['Diagnóstico completo', 'Plano de 90 dias', '12 sessões de acompanhamento'],
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      buttonColor: '#0a0a0a',
      bgColor: '#fafafa',
    },
  },
  {
    id: 'c11',
    type: 'marketing_cta',
    props: {
      title: 'Pronto para avançar?',
      description: 'Revise os detalhes acima. Ao aprovar, iniciamos o onboarding em até 3 dias úteis.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
];

const agenciaElements: BuilderElement[] = [
  {
    id: 'a1',
    type: 'marketing_hero',
    props: {
      title: 'Proposta — Performance & Criativo',
      subtitle: 'Gestão de mídia, produção de criativos e páginas de conversão para acelerar aquisição.',
      badge: 'Marketing orientado a resultado',
    },
  },
  {
    id: 'a2',
    type: 'marketing_strategy',
    props: {
      title: 'Nossa abordagem',
      steps: [
        { title: 'Auditar', desc: 'Contas, pixel, criativos e jornada de conversão.' },
        { title: 'Otimizar', desc: 'Testes A/B contínuos em público, criativo e landing.' },
        { title: 'Escalar', desc: 'Budget incremental com metas de CPA e ROAS.' },
      ],
    },
  },
  {
    id: 'a3',
    type: 'stats',
    props: {
      items: [
        { value: '+38%', label: 'ROAS médio' },
        { value: '4', label: 'Criativos/mês' },
        { value: '24h', label: 'SLA suporte' },
      ],
      bgColor: '#0a0a0a',
      textColor: '#ffffff',
    },
  },
  {
    id: 'a4',
    type: 'service_stack',
    props: { mode: 'tabs', title: 'Pacotes e entregas', hint: 'Conteúdo importado dos seus serviços cadastrados.' },
  },
  {
    id: 'a5',
    type: 'comparison_table',
    props: {
      title: 'Antes vs depois da parceria',
      columns: ['Situação atual', 'Com nossa gestão'],
      rows: [
        ['Campanhas sem padronização', 'Playbook de testes semanais'],
        ['Criativos esporádicos', 'Produção mensal orientada a dados'],
        ['Landing genérica', 'Páginas com copy e prova social'],
      ],
    },
  },
  {
    id: 'a6',
    type: 'marketing_pricing',
    props: {
      title: 'Investimento mensal recomendado',
      price: '4.997',
      items: [
        'Gestão Meta + Google Ads',
        '4 criativos novos por mês',
        '1 landing page otimizada',
        'Relatório executivo quinzenal',
      ],
    },
  },
  {
    id: 'a7',
    type: 'icon_list',
    props: {
      items: ['Contrato mensal sem fidelidade após 90 dias', 'Acesso a dashboard de performance', 'Grupo dedicado no WhatsApp'],
      iconColor: '#10b981',
      textColor: '#52525b',
    },
  },
  {
    id: 'a8',
    type: 'accordion',
    props: {
      title: 'FAQ',
      items: [
        { title: 'Quem cria os anúncios?', content: 'Nosso time de mídia com validação conjunta de mensagens.' },
        { title: 'O budget de mídia está incluso?', content: 'Não — o investimento em plataformas é pago diretamente por você.' },
      ],
    },
  },
  {
    id: 'a9',
    type: 'marketing_cta',
    props: {
      title: 'Vamos colocar sua máquina de aquisição para rodar?',
      description: 'Aprove abaixo para reservar agenda de kick-off e alinhamento de metas.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
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
        'Modelo pensado para parcerias de longo prazo com entregas contínuas, previsibilidade de caixa e suporte prioritário.',
        'Abaixo você encontra o escopo detalhado, SLA e condições comerciais.',
      ],
    },
  },
  {
    id: 'r2',
    type: 'icon_list',
    props: {
      items: ['Suporte prioritário em horário comercial', 'Atualizações e melhorias mensais', 'SLA de resposta em 24h úteis'],
      iconColor: '#10b981',
      textColor: '#52525b',
    },
  },
  {
    id: 'r3',
    type: 'service_stack',
    props: { mode: 'stack', title: 'Serviços inclusos na assinatura' },
  },
  {
    id: 'r4',
    type: 'feature_grid',
    props: {
      features: [
        { title: 'Onboarding', desc: 'Semana 1 com mapeamento e alinhamento de metas.' },
        { title: 'Rituais', desc: 'Check-in quinzenal e relatório mensal executivo.' },
        { title: 'Renovação', desc: 'Revisão de escopo a cada 12 meses ou sob demanda.' },
      ],
    },
  },
  {
    id: 'r5',
    type: 'timeline',
    props: {
      steps: [
        { title: 'Mês 1', desc: 'Setup, integrações e primeiras entregas.' },
        { title: 'Mês 2', desc: 'Otimização com base em métricas acordadas.' },
        { title: 'Mês 3', desc: 'Plano de expansão ou consolidação do escopo.' },
      ],
    },
  },
  {
    id: 'r6',
    type: 'pricing',
    props: {
      title: 'Mensalidade',
      price: 'R$ 2.990',
      period: '/mês',
      items: ['Todas as entregas do escopo', 'Suporte e rituais inclusos', 'Reajuste anual pelo IPCA'],
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      buttonColor: '#18181b',
      bgColor: '#fafafa',
    },
  },
  {
    id: 'r7',
    type: 'accordion',
    props: {
      title: 'Termos comuns',
      items: [
        { title: 'Cancelamento', content: 'Aviso prévio de 30 dias após o período mínimo de 3 meses.' },
        { title: 'Forma de pagamento', content: 'Boleto ou PIX até o dia 5 de cada mês.' },
      ],
    },
  },
  {
    id: 'r8',
    type: 'marketing_cta',
    props: {
      title: 'Confirme sua assinatura',
      description: 'Ao aprovar, enviamos o contrato digital e o link de pagamento da primeira mensalidade.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'starter-consultoria',
    nome: 'Consultoria B2B',
    descricao: 'Narrativa completa: contexto, metodologia, serviços em abas, cronograma e FAQ.',
    categoria: 'Serviços',
    elementos: consultoriaElements,
    fluxo: DEFAULT_FLOW,
  },
  {
    id: 'starter-agencia',
    nome: 'Agência / Marketing',
    descricao: 'Performance, comparação, pacotes em abas e investimento mensal.',
    categoria: 'Marketing',
    elementos: agenciaElements,
    fluxo: DEFAULT_FLOW,
  },
  {
    id: 'starter-recorrente',
    nome: 'Assinatura recorrente',
    descricao: 'SLA, serviços empilhados, governança e mensalidade.',
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
