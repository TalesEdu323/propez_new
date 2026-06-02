import type { BuilderElement, BuilderPageLayout } from '../types/builder';
import type { ProposalFlowConfig } from '../types/proposalFlow';
import type { OfferType } from '../lib/layoutContext';
import { DEFAULT_FLOW } from '../types/proposalFlow';
import { createId } from '../lib/ids';
import { DEFAULT_PAGE_LAYOUT, normalizePageLayout } from '../lib/pageLayout';
import { applyThemeToPageLayout } from '../lib/proposalTheme';
import { AUTO_IMAGE_PROMPT } from '../lib/hydrateStarterImagePrompts';

export interface StarterTemplate {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  offerType: OfferType;
  elementos: BuilderElement[];
  fluxo: ProposalFlowConfig;
  pageLayout?: BuilderPageLayout;
}

export const STARTER_OFFER_TYPES: Record<string, OfferType> = {
  'starter-consultoria': 'consultoria',
  'starter-agencia': 'agencia',
  'starter-saas': 'saas',
  'starter-recorrente': 'recorrente',
};

export function getStarterOfferType(starterId: string): OfferType {
  return STARTER_OFFER_TYPES[starterId] ?? 'generico';
}

function cloneElements(elements: BuilderElement[]): BuilderElement[] {
  return JSON.parse(JSON.stringify(elements)).map((el: BuilderElement) => ({
    ...el,
    id: createId(),
    children: el.children?.map((c) => ({ ...c, id: createId() })),
  }));
}

function navbar(links: string[]): BuilderElement {
  return {
    id: createId(),
    type: 'navbar',
    props: {
      logoText: '[Nome da Org]',
      logoUrl: '',
      links,
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      bgColor: '#0a0a0a',
      textColor: '#fafafa',
    },
  };
}

function hero(config: {
  badge: string;
  title: string;
  description: string;
  secondaryButtonText?: string;
}): BuilderElement {
  return {
    id: createId(),
    type: 'marketing_hero',
    props: {
      badge: config.badge,
      title: config.title,
      description: config.description,
      buttonText: 'Aprovar proposta',
      secondaryButtonText: config.secondaryButtonText ?? 'Ver escopo completo',
      secondaryButtonAction: 'none',
      proposalAction: 'approve',
      dotOverlay: true,
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
      backgroundImageUrl: '',
    },
  };
}

function heading(title: string, align = 'center'): BuilderElement {
  return {
    id: createId(),
    type: 'heading',
    props: { text: title, size: 'text-3xl', align, weight: 'font-bold', color: '#fafafa' },
  };
}

function footer(): BuilderElement[] {
  return [
    { id: createId(), type: 'spacer', props: { height: '48' } },
    {
      id: createId(),
      type: 'logo',
      props: { url: '', align: 'center', width: '120' },
    },
    {
      id: createId(),
      type: 'paragraph',
      props: {
        text: '© [Nome da Org] · Proposta comercial confidencial.',
        align: 'center',
        color: '#71717a',
      },
    },
  ];
}

const consultoriaElements: BuilderElement[] = [
  navbar(['Contexto', 'Metodologia', 'Jornada', 'Proposta']),
  hero({
    badge: 'Proposta exclusiva · [Nome do Cliente]',
    title: 'Vendas que\ngeram resultado\nde verdade.',
    description:
      'Consultoria comercial B2B com metodologia SPIN, jornada estruturada e entregáveis claros para escalar receita previsível.',
    secondaryButtonText: 'Ver metodologia',
  }),
  {
    id: createId(),
    type: 'marketing_context',
    props: {
      sectionLabel: '01 · Contexto',
      title: 'Entendemos o desafio de [Nome do Cliente]',
      description:
        'Operações B2B maduras precisam de clareza comercial antes de escalar investimento. Mapeamos gargalos, alinhamos liderança e desenhamos um plano executável.',
      stats: [
        { value: '55+', label: 'Empresas atendidas' },
        { value: 'ISO', label: 'Processos certificados' },
        { value: '90d', label: 'Horizonte do plano' },
      ],
      challenges: [
        { title: 'Funil imprevisível', desc: 'Leads entram sem critério de qualificação ou próximo passo.', icon: 'AlertCircle' },
        { title: 'Time desalinhado', desc: 'Marketing e vendas com metas e mensagens diferentes.', icon: 'AlertCircle' },
        { title: 'Dados fragmentados', desc: 'CRM e planilhas não conversam — decisões no feeling.', icon: 'AlertCircle' },
      ],
    },
  },
  heading('02 · Metodologia SPIN'),
  {
    id: createId(),
    type: 'tabs',
    props: {
      sectionLabel: '02 · Metodologia',
      tabs: [
        {
          title: 'S — Situação',
          content:
            'Mapeamos contexto atual: processos, equipe, stack e metas.\n\n• Como funciona o funil hoje?\n• Quais canais geram oportunidades?\n• Onde estão os gargalos operacionais?',
        },
        {
          title: 'P — Problema',
          content:
            'Identificamos dores explícitas e implícitas.\n\n• O que impede bater meta?\n• Onde perdemos deals?\n• Quais objeções mais aparecem?',
        },
        {
          title: 'I — Implicação',
          content:
            'Quantificamos o custo de não agir.\n\n• Quanto custa cada mês sem previsibilidade?\n• Qual impacto na retenção de clientes?\n• Risco de perder share para concorrentes?',
        },
        {
          title: 'N — Necessidade',
          content:
            'Conectamos solução ao resultado desejado.\n\n• Qual ROI mínimo aceitável?\n• Quais entregáveis são inegociáveis?\n• Como medir sucesso em 90 dias?',
        },
      ],
      activeColor: '#B45309',
      bgColor: '#18181b',
    },
  },
  heading('03 · Jornada comercial'),
  {
    id: createId(),
    type: 'timeline',
    props: {
      steps: [
        { title: 'Diagnóstico', desc: 'Entrevistas, dados de CRM e mapeamento do funil atual.' },
        { title: 'Desenho SPIN', desc: 'Playbook de qualificação e roteiros por segmento.' },
        { title: 'Enablement', desc: 'Treinamento do time comercial e rituais semanais.' },
        { title: 'Pilotos', desc: 'Campanhas e cadências testadas com amostra controlada.' },
        { title: 'Escala', desc: 'Expansão com KPIs, dashboards e governança.' },
      ],
      color: '#B45309',
    },
  },
  {
    id: createId(),
    type: 'funnel',
    props: {
      sectionLabel: '03 · Jornada',
      stages: [
        { name: 'Empresas mapeadas', value: '100%' },
        { name: 'Leads abordados', value: '60%' },
        { name: 'Responderam', value: '30%' },
        { name: 'Qualificados', value: '15%' },
        { name: 'Propostas', value: '8%' },
        { name: 'Fechados', value: '4%' },
      ],
      color: '#B45309',
    },
  },
  {
    id: createId(),
    type: 'service_stack',
    props: { mode: 'tabs', title: 'Escopo dos serviços', hint: 'Preenchido pelos serviços selecionados no modelo.' },
  },
  {
    id: createId(),
    type: 'feature_grid',
    props: {
      columns: '3',
      bgColor: '#0a0a0a',
      features: [
        { title: 'Diagnóstico comercial', desc: 'Auditoria de funil, ICP e processos.', icon: 'Search' },
        { title: 'Playbook SPIN', desc: 'Scripts, cadências e critérios de qualificação.', icon: 'BookOpen' },
        { title: 'Dashboards', desc: 'KPIs semanais e painéis executivos.', icon: 'BarChart3' },
        { title: 'Enablement', desc: 'Treinamentos e role-play com o time.', icon: 'Users' },
        { title: 'Governança', desc: 'Rituais, comitês e plano de 90 dias.', icon: 'Shield' },
        { title: 'Acompanhamento', desc: 'Sessões quinzenais com sponsor.', icon: 'Calendar' },
      ],
    },
  },
  {
    id: createId(),
    type: 'card',
    props: {
      title: 'Entrega principal',
      content: 'Pacote consultivo com entregáveis documentados e cronograma executivo.',
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
      imageUrl: '',
      buttonText: 'Ver detalhes',
      proposalAction: 'none',
    },
  },
  {
    id: createId(),
    type: 'marketing_pricing',
    props: {
      sectionLabel: '04 · Proposta',
      title: 'Investimento recomendado',
      price: '12.500',
      listIcon: 'CheckCircle2',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      items: [
        'Diagnóstico completo em 2 semanas',
        'Playbook SPIN customizado',
        '12 sessões de acompanhamento',
        'Dashboards e rituais de governança',
      ],
    },
  },
  {
    id: createId(),
    type: 'testimonial',
    props: {
      quote: 'A metodologia trouxe previsibilidade ao pipeline em menos de 60 dias.',
      author: 'Diretor Comercial',
      role: '[Segmento]',
      avatarUrl: '',
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
      bgColor: '#18181b',
    },
  },
  {
    id: createId(),
    type: 'marketing_cta',
    props: {
      sectionLabel: '05 · Próximo passo',
      title: 'Pronto para acelerar resultados?',
      description: 'Validade desta proposta: 15 dias. Agende o kick-off assim que aprovar.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
  ...footer(),
];

const agenciaElements: BuilderElement[] = [
  navbar(['Estratégia', 'Campanhas', 'Resultados', 'Investimento']),
  hero({
    badge: 'Performance · [Nome do Cliente]',
    title: 'Crescimento\nprevisível\ncom mídia paga.',
    description: 'Agência full-funnel: criativos, tráfego e otimização contínua alinhados ao seu modelo de negócio.',
    secondaryButtonText: 'Ver cases',
  }),
  {
    id: createId(),
    type: 'marketing_context',
    props: {
      sectionLabel: '01 · Contexto',
      title: 'Seu mercado exige velocidade e criatividade',
      description: 'Campanhas isoladas não sustentam ROAS. Integramos estratégia, produção e mídia em um único squad.',
      stats: [
        { value: '3.2x', label: 'ROAS médio' },
        { value: '48h', label: 'Primeiros criativos' },
        { value: '24/7', label: 'Monitoramento' },
      ],
      challenges: [
        { title: 'Criativos saturados', desc: 'Anúncios perdem performance sem rotação constante.', icon: 'AlertCircle' },
        { title: 'Dados silados', desc: 'Pixel, CRM e planilhas sem visão unificada.', icon: 'AlertCircle' },
      ],
    },
  },
  heading('02 · Funil T/M/F'),
  {
    id: createId(),
    type: 'tabs',
    props: {
      sectionLabel: '02 · Metodologia',
      tabs: [
        { title: 'Topo — Atração', content: 'Campanhas de prospecção e awareness com criativos testados A/B.' },
        { title: 'Meio — Nutrição', content: 'Remarketing, e-mail e conteúdo para leads mornos.' },
        { title: 'Fundo — Conversão', content: 'Ofertas diretas, urgência e landing otimizada.' },
      ],
      activeColor: '#B45309',
      bgColor: '#18181b',
    },
  },
  heading('03 · Jornada da campanha'),
  {
    id: createId(),
    type: 'timeline',
    props: {
      steps: [
        { title: 'Semana 1', desc: 'Auditoria de contas, pixel e concorrência.' },
        { title: 'Semana 2', desc: 'Produção de criativos e estrutura de campanhas.' },
        { title: 'Semana 3–4', desc: 'Go-live, testes e otimização diária.' },
        { title: 'Mês 2+', desc: 'Escala com relatórios executivos semanais.' },
      ],
      color: '#B45309',
    },
  },
  {
    id: createId(),
    type: 'funnel',
    props: {
      sectionLabel: '03 · Jornada',
      stages: [
        { name: 'Impressões', value: '100%' },
        { name: 'Cliques', value: '4.2%' },
        { name: 'Leads', value: '1.8%' },
        { name: 'Oportunidades', value: '0.9%' },
        { name: 'Vendas', value: '0.3%' },
      ],
      color: '#e94560',
    },
  },
  {
    id: createId(),
    type: 'gallery',
    props: {
      columns: '3',
      gap: '16',
      radius: 'rounded-2xl',
      images: [
        { imageGeneratePrompt: AUTO_IMAGE_PROMPT },
        { imageGeneratePrompt: AUTO_IMAGE_PROMPT },
        { imageGeneratePrompt: AUTO_IMAGE_PROMPT },
      ],
    },
  },
  {
    id: createId(),
    type: 'service_stack',
    props: { mode: 'tabs', title: 'Pacotes de mídia', hint: 'Preenchido pelos serviços selecionados no modelo.' },
  },
  {
    id: createId(),
    type: 'card',
    props: {
      title: 'Squad dedicado',
      content: 'Gestor de tráfego, designer e analista no mesmo time.',
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
      imageUrl: '',
      buttonText: 'Saiba mais',
      proposalAction: 'none',
    },
  },
  {
    id: createId(),
    type: 'marketing_pricing',
    props: {
      sectionLabel: '04 · Proposta',
      title: 'Investimento mensal',
      price: '4.997',
      listIcon: 'CheckCircle2',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      items: ['Gestão Meta + Google Ads', '8 criativos/mês', 'Landing page otimizada', 'Relatório semanal'],
    },
  },
  {
    id: createId(),
    type: 'testimonial',
    props: {
      quote: 'Dobramos leads qualificados mantendo o CAC dentro da meta.',
      author: 'Head de Marketing',
      role: 'E-commerce B2C',
      avatarUrl: '',
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
    },
  },
  {
    id: createId(),
    type: 'marketing_cta',
    props: {
      sectionLabel: '05 · Próximo passo',
      title: 'Vamos colocar sua mídia para performar?',
      description: 'Kick-off em até 7 dias após aprovação.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
  ...footer(),
];

const saasElements: BuilderElement[] = [
  navbar(['Produto', 'Features', 'Onboarding', 'Planos']),
  hero({
    badge: 'SaaS · [Nome do Cliente]',
    title: 'Software que\nescala com\nseu time.',
    description: 'Proposta de implantação, licenciamento e sucesso do cliente para acelerar adoção e retenção.',
    secondaryButtonText: 'Ver integrações',
  }),
  {
    id: createId(),
    type: 'marketing_context',
    props: {
      sectionLabel: '01 · Contexto',
      title: 'Transformação digital com segurança',
      description: 'Times precisam de ferramentas que integrem fluxo de trabalho, dados e governança desde o dia one.',
      stats: [
        { value: '99.9%', label: 'Uptime SLA' },
        { value: '14d', label: 'Go-live médio' },
        { value: '50+', label: 'Integrações nativas' },
      ],
      challenges: [
        { title: 'Adoção lenta', desc: 'Usuários resistem sem treinamento e champions internos.', icon: 'AlertCircle' },
        { title: 'Integração complexa', desc: 'APIs legadas atrasam o rollout.', icon: 'AlertCircle' },
      ],
    },
  },
  heading('02 · Módulos principais'),
  {
    id: createId(),
    type: 'tabs',
    props: {
      sectionLabel: '02 · Metodologia',
      tabs: [
        { title: 'Features', content: 'Automação, dashboards, permissões granulares e auditoria.' },
        { title: 'Integrações', content: 'CRM, ERP, webhooks e SSO corporativo.' },
        { title: 'Suporte', content: 'CSM dedicado, base de conhecimento e SLA 4h.' },
      ],
      activeColor: '#2563eb',
      bgColor: '#1e293b',
    },
  },
  heading('03 · Onboarding'),
  {
    id: createId(),
    type: 'timeline',
    props: {
      steps: [
        { title: 'Discovery', desc: 'Mapeamento de usuários, dados e integrações.' },
        { title: 'Configuração', desc: 'Ambiente, SSO e importação inicial.' },
        { title: 'Treinamento', desc: 'Workshops por squad e material gravado.' },
        { title: 'Go-live', desc: 'Hypercare de 30 dias com CSM.' },
      ],
      color: '#2563eb',
    },
  },
  {
    id: createId(),
    type: 'funnel',
    props: {
      sectionLabel: '03 · Jornada',
      stages: [
        { name: 'Trials iniciados', value: '100%' },
        { name: 'Ativação', value: '65%' },
        { name: 'Uso recorrente', value: '40%' },
        { name: 'Conversão paga', value: '22%' },
        { name: 'Expansão', value: '12%' },
      ],
      color: '#2563eb',
    },
  },
  {
    id: createId(),
    type: 'service_stack',
    props: { mode: 'tabs', title: 'Módulos contratados', hint: 'Preenchido pelos serviços selecionados no modelo.' },
  },
  {
    id: createId(),
    type: 'card',
    props: {
      title: 'Implantação assistida',
      content: 'Setup completo com migração de dados e treinamento.',
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
      imageUrl: '',
      buttonText: 'Detalhes',
      proposalAction: 'none',
    },
  },
  {
    id: createId(),
    type: 'card',
    props: {
      title: 'Suporte premium',
      content: 'CSM dedicado e canal prioritário.',
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
      imageUrl: '',
      buttonText: 'Detalhes',
      proposalAction: 'none',
    },
  },
  {
    id: createId(),
    type: 'marketing_pricing',
    props: {
      sectionLabel: '04 · Proposta',
      title: 'Plano anual recomendado',
      price: '899',
      listIcon: 'CheckCircle2',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      items: ['Licenças ilimitadas no tier Business', 'Implantação inclusa', 'Integrações premium', 'CSM dedicado'],
    },
  },
  {
    id: createId(),
    type: 'testimonial',
    props: {
      quote: 'Reduzimos 40% do tempo operacional após a implantação.',
      author: 'CTO',
      role: 'Scale-up B2B',
      avatarUrl: '',
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
    },
  },
  {
    id: createId(),
    type: 'marketing_cta',
    props: {
      sectionLabel: '05 · Próximo passo',
      title: 'Pronto para modernizar sua operação?',
      description: 'Ambiente sandbox disponível após assinatura.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
  ...footer(),
];

const recorrenteElements: BuilderElement[] = [
  navbar(['SLA', 'Entregas', 'Governança', 'Investimento']),
  hero({
    badge: 'Retainer · [Nome do Cliente]',
    title: 'Parceria\ncontínua\ncom previsibilidade.',
    description: 'Modelo recorrente com entregas mensais, SLA claro e governança para evolução constante.',
    secondaryButtonText: 'Ver entregáveis',
  }),
  {
    id: createId(),
    type: 'marketing_context',
    props: {
      sectionLabel: '01 · Contexto',
      title: 'Sucesso de longo prazo exige ritmo',
      description: 'Projetos pontuais não sustentam melhoria contínua. Estruturamos retainer com metas trimestrais.',
      stats: [
        { value: '12m+', label: 'Contratos ativos' },
        { value: '4h', label: 'SLA resposta' },
        { value: '98%', label: 'Renovação' },
      ],
      challenges: [
        { title: 'Escopo difuso', desc: 'Entregas sem priorização geram frustração.', icon: 'AlertCircle' },
        { title: 'Falta de métricas', desc: 'Dificuldade em provar valor mês a mês.', icon: 'AlertCircle' },
      ],
    },
  },
  heading('02 · Pilares do retainer'),
  {
    id: createId(),
    type: 'tabs',
    props: {
      sectionLabel: '02 · Metodologia',
      tabs: [
        { title: 'SLA', content: 'Tempos de resposta, canais e escalonamento definidos.' },
        { title: 'Governança', content: 'Comitê mensal, backlog priorizado e QBR trimestral.' },
        { title: 'Entregas', content: 'Pacote fixo de horas/skills com rollover controlado.' },
      ],
      activeColor: '#0d9488',
      bgColor: '#134e4a',
    },
  },
  heading('03 · Ciclo mensal'),
  {
    id: createId(),
    type: 'timeline',
    props: {
      steps: [
        { title: 'Semana 1', desc: 'Planning e alinhamento de prioridades.' },
        { title: 'Semana 2–3', desc: 'Execução das entregas do sprint.' },
        { title: 'Semana 4', desc: 'Review, métricas e próximo ciclo.' },
      ],
      color: '#0d9488',
    },
  },
  {
    id: createId(),
    type: 'funnel',
    props: {
      sectionLabel: '03 · Jornada',
      stages: [
        { name: 'Clientes ativos', value: '100%' },
        { name: 'Engajamento mensal', value: '92%' },
        { name: 'Metas atingidas', value: '78%' },
        { name: 'Upsell', value: '24%' },
        { name: 'Renovação', value: '98%' },
      ],
      color: '#14b8a6',
    },
  },
  {
    id: createId(),
    type: 'service_stack',
    props: { mode: 'stack', title: 'Entregas recorrentes', hint: 'Preenchido pelos serviços selecionados no modelo.' },
  },
  {
    id: createId(),
    type: 'card',
    props: {
      title: 'Pacote mensal',
      content: 'Horas dedicadas, relatório e reunião de status.',
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
      imageUrl: '',
      buttonText: 'Ver escopo',
      proposalAction: 'none',
    },
  },
  {
    id: createId(),
    type: 'marketing_pricing',
    props: {
      sectionLabel: '04 · Proposta',
      title: 'Mensalidade recomendada',
      price: '6.500',
      listIcon: 'CheckCircle2',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      items: ['40h/mês dedicadas', 'SLA 4h úteis', 'Comitê mensal', 'Relatório de performance'],
    },
  },
  {
    id: createId(),
    type: 'testimonial',
    props: {
      quote: 'Previsibilidade de custo e entrega transformou nossa operação.',
      author: 'COO',
      role: 'Serviços B2B',
      avatarUrl: '',
      imageGeneratePrompt: AUTO_IMAGE_PROMPT,
    },
  },
  {
    id: createId(),
    type: 'marketing_cta',
    props: {
      sectionLabel: '05 · Próximo passo',
      title: 'Vamos estruturar sua parceria recorrente?',
      description: 'Contrato mínimo de 6 meses com revisão trimestral.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
  ...footer(),
];

function premiumPageLayout(themeId: string): BuilderPageLayout {
  return {
    ...applyThemeToPageLayout(normalizePageLayout(null), themeId),
    backgroundEffect: 'dots',
    widthMode: 'full',
    horizontalPadding: 0,
  };
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'starter-consultoria',
    nome: 'Consultoria Executiva',
    descricao: 'Blueprint Vortex: menu, hero IA, 5 seções numeradas, SPIN, funil e pricing premium.',
    categoria: 'Consultoria',
    offerType: 'consultoria',
    elementos: consultoriaElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: premiumPageLayout('dark-premium'),
  },
  {
    id: 'starter-agencia',
    nome: 'Agência Performance',
    descricao: 'Funil T/M/F, galeria IA, timeline de campanha e investimento mensal.',
    categoria: 'Marketing',
    offerType: 'agencia',
    elementos: agenciaElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: premiumPageLayout('dark-premium'),
  },
  {
    id: 'starter-saas',
    nome: 'SaaS / Produto Tech',
    descricao: 'Onboarding, integrações, cards IA e pricing anual estilo produto.',
    categoria: 'Tech',
    offerType: 'saas',
    elementos: saasElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: premiumPageLayout('navy-performance'),
  },
  {
    id: 'starter-recorrente',
    nome: 'Retainer / Recorrente',
    descricao: 'SLA, governança, ciclo mensal e mensalidade com imagens IA.',
    categoria: 'Recorrente',
    offerType: 'recorrente',
    elementos: recorrenteElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: premiumPageLayout('ocean-pro'),
  },
];

export function applyOrgLogoToElements(
  elements: BuilderElement[],
  logoUrl?: string,
): BuilderElement[] {
  if (!logoUrl) return elements;
  return elements.map((el) => {
    if (el.type === 'navbar') {
      return { ...el, props: { ...el.props, logoUrl } };
    }
    if (el.type === 'marketing_hero' && !el.props.logoUrl) {
      return { ...el, props: { ...el.props, logoUrl } };
    }
    if (el.type === 'logo' && !el.props.url) {
      return { ...el, props: { ...el.props, url: logoUrl } };
    }
    return el;
  });
}

export function applyStarterTemplate(templateId: string): {
  elementos: BuilderElement[];
  fluxo: ProposalFlowConfig;
  nome: string;
  pageLayout: BuilderPageLayout;
  offerType: OfferType;
} | null {
  const t = STARTER_TEMPLATES.find((x) => x.id === templateId);
  if (!t) return null;
  return {
    elementos: cloneElements(t.elementos),
    fluxo: t.fluxo,
    nome: t.nome,
    pageLayout: normalizePageLayout(t.pageLayout ?? DEFAULT_PAGE_LAYOUT),
    offerType: t.offerType,
  };
}

/** Conta slots de imagem IA (imageGeneratePrompt) por template — para testes. */
export function countStarterImagePrompts(elements: BuilderElement[]): number {
  let count = 0;
  function walk(list: BuilderElement[]) {
    for (const el of list) {
      const props = el.props ?? {};
      if (typeof props.imageGeneratePrompt === 'string' && props.imageGeneratePrompt.trim()) count++;
      if (Array.isArray(props.images)) {
        for (const item of props.images) {
          if (typeof item === 'object' && item && 'imageGeneratePrompt' in item) {
            const q = String((item as { imageGeneratePrompt: string }).imageGeneratePrompt).trim();
            if (q) count++;
          }
        }
      }
      if (el.children?.length) walk(el.children);
    }
  }
  walk(elements);
  return count;
}
