import type { BuilderElement, BuilderPageLayout } from '../types/builder';
import type { ProposalFlowConfig } from '../types/proposalFlow';
import { DEFAULT_FLOW } from '../types/proposalFlow';
import { createId } from '../lib/ids';
import { DEFAULT_PROPS } from '../components/builder/defaultProps';
import { DEFAULT_PAGE_LAYOUT, normalizePageLayout } from '../lib/pageLayout';
import { applyThemeToPageLayout } from '../lib/proposalTheme';

export interface StarterTemplate {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  elementos: BuilderElement[];
  fluxo: ProposalFlowConfig;
  pageLayout?: BuilderPageLayout;
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

const trafegoPagoElements: BuilderElement[] = [
  {
    id: 'tp1',
    type: 'marketing_hero',
    props: {
      title: 'Plano de Tráfego Pago & Funil de Vendas',
      subtitle: 'Estrutura completa de captação digital — da mídia paga ao contrato assinado.',
      badge: 'Plano Estratégico de Aquisição',
      description: 'Proposta com escopo de campanhas, landing pages, criativos e projeção de retorno sobre investimento em mídia.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
  { id: 'tp2', type: 'spacer', props: { height: '32' } },
  {
    id: 'tp3',
    type: 'heading',
    props: { text: 'O Que Vamos Construir', color: '#18181b', align: 'left', size: 'text-3xl', weight: 'font-bold' },
  },
  {
    id: 'tp4',
    type: 'feature_grid',
    props: {
      features: [
        { title: 'Landing Page de Alta Conversão', desc: 'Página otimizada com formulário de pré-qualificação (CEP, valor da conta, CPF).' },
        { title: 'Campanhas de Tráfego Pago', desc: 'Meta Ads segmentado por região, faixa etária e interesses com testes A/B contínuos.' },
        { title: 'Criativos & Copies', desc: 'Pacote mensal de criativos estáticos e em vídeo com variações para teste.' },
        { title: 'Funil de Qualificação', desc: 'Lead scoring: formulário → WhatsApp/CRM → equipe comercial.' },
      ],
    },
  },
  { id: 'tp5', type: 'spacer', props: { height: '48' } },
  {
    id: 'tp6',
    type: 'heading',
    props: { text: 'Estrutura do Funil', color: '#18181b', align: 'center', size: 'text-2xl', weight: 'font-bold' },
  },
  {
    id: 'tp7',
    type: 'funnel',
    props: {
      color: '#1a1a2e',
      stages: [
        { name: 'Impressão do Anúncio (Meta Ads)', value: '1' },
        { name: 'Clique → Landing Page', value: '2' },
        { name: 'Lead Captado', value: '3' },
        { name: 'Qualificação Interna', value: '4' },
        { name: 'Contrato Fechado', value: '5' },
      ],
    },
  },
  { id: 'tp8', type: 'spacer', props: { height: '48' } },
  {
    id: 'tp9',
    type: 'heading',
    props: { text: 'Calculadora de Projeção', color: '#18181b', align: 'left', size: 'text-3xl', weight: 'font-bold' },
  },
  {
    id: 'tp10',
    type: 'paragraph',
    props: {
      text: 'Simule cenários reais com base no investimento em mídia e nas taxas de conversão do funil.',
      color: '#636e72',
      align: 'left',
      size: 'text-base',
    },
  },
  {
    id: 'tp11',
    type: 'projection_calculator',
    props: { ...DEFAULT_PROPS.projection_calculator },
  },
  { id: 'tp12', type: 'spacer', props: { height: '48' } },
  {
    id: 'tp13',
    type: 'heading',
    props: { text: 'Cenários de Investimento', color: '#18181b', align: 'left', size: 'text-2xl', weight: 'font-bold' },
  },
  {
    id: 'tp14',
    type: 'metrics_table',
    props: { ...DEFAULT_PROPS.metrics_table },
  },
  {
    id: 'tp15',
    type: 'timeline',
    props: {
      steps: [
        { title: 'Semana 1 — SETUP', desc: 'Briefing, landing page, Pixel Meta, CRM/WhatsApp e conta de anúncios.' },
        { title: 'Semana 2 — CRIATIVOS', desc: 'Pacote de criativos, copies A/B e estrutura de campanhas.' },
        { title: 'Semana 3 — LANÇAMENTO', desc: 'Ativação, monitoramento de CPL/CTR/CPC e primeiros leads.' },
        { title: 'Semana 4–8 — OTIMIZAÇÃO', desc: 'Ajustes por criativo, região e copy; escala gradual do budget.' },
        { title: 'Mês 3+ — ESCALA', desc: 'Funil validado; aumento de investimento e expansão geográfica.' },
      ],
    },
  },
  {
    id: 'tp16',
    type: 'marketing_cta',
    props: {
      title: 'Próximos Passos',
      description: 'Definir regiões, aprovar investimento inicial em mídia e briefing comercial.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
];

const designElements: BuilderElement[] = [
  { id: 'd1', type: 'logo', props: { logoText: 'Studio Criativo', mode: 'text', align: 'center', height: '56', textColor: '#7c3aed' } },
  {
    id: 'd2',
    type: 'marketing_hero',
    props: {
      title: 'Identidade visual que converte',
      badge: 'Proposta criativa',
      subtitle: 'Branding, UI/UX e peças digitais alinhadas ao seu posicionamento e objetivos de negócio.',
      description: 'Apresentamos escopo, processo criativo, entregáveis e investimento para elevar a presença da sua marca.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      primaryColor: '#7c3aed',
      secondaryColor: '#a78bfa',
    },
  },
  {
    id: 'd3',
    type: 'gallery',
    props: {
      columns: '3',
      images: [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1558655146-9f40138edfeb?q=80&w=600&auto=format&fit=crop',
      ],
      gap: '16',
      radius: 'rounded-2xl',
    },
  },
  {
    id: 'd4',
    type: 'feature_grid',
    props: {
      features: [
        { title: 'Discovery', desc: 'Imersão na marca, concorrência e público-alvo.', icon: 'Search' },
        { title: 'Design System', desc: 'Tipografia, cores e componentes reutilizáveis.', icon: 'Palette' },
        { title: 'Entrega Final', desc: 'Arquivos editáveis e guia de uso da marca.', icon: 'Package' },
      ],
    },
  },
  {
    id: 'd5',
    type: 'timeline',
    props: {
      steps: [
        { title: 'Semana 1', desc: 'Briefing e moodboard.' },
        { title: 'Semanas 2–3', desc: 'Conceitos e refinamento.' },
        { title: 'Semana 4', desc: 'Entrega e handoff.' },
      ],
      color: '#7c3aed',
    },
  },
  {
    id: 'd6',
    type: 'pricing',
    props: {
      title: 'Investimento',
      price: 'R$ 12.800',
      period: '',
      items: ['Identidade visual completa', '3 rodadas de revisão', 'Manual de marca PDF'],
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      buttonColor: '#7c3aed',
      bgColor: '#faf5ff',
    },
  },
  {
    id: 'd7',
    type: 'marketing_cta',
    props: {
      title: 'Vamos criar algo memorável?',
      description: 'Aprove abaixo para reservar agenda de kick-off criativo.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
];

const juridicoElements: BuilderElement[] = [
  {
    id: 'j1',
    type: 'heading',
    props: { text: 'Proposta de Serviços Jurídicos', color: '#0f172a', align: 'left', size: 'text-4xl', weight: 'font-bold' },
  },
  {
    id: 'j2',
    type: 'paragraph',
    props: {
      text: 'Escopo detalhado de assessoria jurídica com prazos, entregáveis e honorários transparentes.',
      color: '#475569',
      align: 'left',
      size: 'text-lg',
    },
  },
  {
    id: 'j3',
    type: 'icon_list',
    props: {
      items: ['Atendimento dedicado', 'Relatórios mensais de andamento', 'Confidencialidade garantida'],
      iconColor: '#2563eb',
      textColor: '#334155',
    },
  },
  {
    id: 'j4',
    type: 'service_stack',
    props: { mode: 'stack', title: 'Serviços contratados' },
  },
  {
    id: 'j5',
    type: 'accordion',
    props: {
      title: 'FAQ',
      items: [
        { title: 'Como são calculados os honorários?', content: 'Valor fixo mensal ou por demanda, conforme escopo acordado.' },
        { title: 'Prazo de resposta?', content: 'SLA de 24h úteis para demandas urgentes.' },
      ],
      bgColor: '#f8fafc',
    },
  },
  {
    id: 'j6',
    type: 'pricing',
    props: {
      title: 'Honorários mensais',
      price: 'R$ 6.500',
      period: '/mês',
      items: ['Consultoria contínua', 'Até 20h/mês de demandas', 'Reunião mensal de alinhamento'],
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      buttonColor: '#2563eb',
      bgColor: '#f8fafc',
    },
  },
  {
    id: 'j7',
    type: 'marketing_cta',
    props: {
      title: 'Pronto para formalizar a parceria?',
      description: 'Ao aprovar, enviamos o contrato de prestação de serviços.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
];

const imobiliarioElements: BuilderElement[] = [
  {
    id: 'i1',
    type: 'marketing_hero',
    props: {
      title: 'Seu próximo imóvel está aqui',
      badge: 'Exclusividade',
      subtitle: 'Apresentamos condições especiais de aquisição com documentação completa e suporte em todas as etapas.',
      description: 'Proposta comercial personalizada com valores, condições de pagamento e cronograma de entrega.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      primaryColor: '#059669',
      secondaryColor: '#10b981',
    },
  },
  {
    id: 'i2',
    type: 'slider',
    props: {
      height: '420',
      slides: [
        { title: 'Ambientes integrados', desc: 'Plantas funcionais com acabamento premium.', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop' },
        { title: 'Localização privilegiada', desc: 'Próximo a comércio, escolas e vias principais.', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop' },
      ],
    },
  },
  {
    id: 'i3',
    type: 'stats',
    props: {
      items: [
        { value: '120', label: 'm² privativos', suffix: '', color: '#059669' },
        { value: '3', label: 'Suítes', suffix: '', color: '#059669' },
        { value: '2', label: 'Vagas', suffix: '', color: '#059669' },
      ],
      bgColor: '#f0fdf4',
    },
  },
  {
    id: 'i4',
    type: 'pricing',
    props: {
      title: 'Condições comerciais',
      price: 'R$ 890.000',
      period: '',
      items: ['Entrada facilitada', 'Financiamento assistido', 'Documentação regularizada'],
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      buttonColor: '#059669',
      bgColor: '#f0fdf4',
    },
  },
  {
    id: 'i5',
    type: 'marketing_cta',
    props: {
      title: 'Agende sua visita',
      description: 'Aprove para confirmar interesse e receber o roteiro de visita.',
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
    },
  },
];

const eventoElements: BuilderElement[] = [
  {
    id: 'e1',
    type: 'marketing_hero',
    props: {
      title: 'Lançamento — Reserve sua vaga',
      badge: 'Vagas limitadas',
      subtitle: 'Evento exclusivo com condições especiais para os primeiros confirmados.',
      description: 'Garanta sua participação antes do encerramento das inscrições.',
      buttonText: 'Garantir minha vaga',
      proposalAction: 'approve',
      primaryColor: '#dc2626',
      secondaryColor: '#ef4444',
    },
  },
  {
    id: 'e2',
    type: 'countdown',
    props: {
      targetDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      targetTime: '23:59',
      color: '#dc2626',
      bgColor: '#fef2f2',
      labelColor: '#52525b',
      expiredText: 'Inscrições encerradas',
    },
  },
  {
    id: 'e3',
    type: 'feature_grid',
    props: {
      features: [
        { title: 'Conteúdo ao vivo', desc: 'Apresentação exclusiva do produto/serviço.', icon: 'Zap' },
        { title: 'Networking', desc: 'Conexão com outros participantes qualificados.', icon: 'Users' },
        { title: 'Oferta especial', desc: 'Condições válidas apenas durante o evento.', icon: 'Gift' },
      ],
    },
  },
  {
    id: 'e4',
    type: 'pricing',
    props: {
      title: 'Investimento',
      price: 'R$ 497',
      period: '',
      items: ['Acesso ao evento completo', 'Material de apoio', 'Gravação por 30 dias'],
      buttonText: 'Aprovar proposta',
      proposalAction: 'approve',
      buttonColor: '#dc2626',
      bgColor: '#fef2f2',
    },
  },
  {
    id: 'e5',
    type: 'marketing_cta',
    props: {
      title: 'Não perca esta oportunidade',
      description: 'As vagas são limitadas. Confirme agora.',
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
    pageLayout: applyThemeToPageLayout(normalizePageLayout(null), 'clean-corporate'),
  },
  {
    id: 'starter-agencia',
    nome: 'Agência / Marketing',
    descricao: 'Performance, comparação, pacotes em abas e investimento mensal.',
    categoria: 'Marketing',
    elementos: agenciaElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: applyThemeToPageLayout(normalizePageLayout(null), 'dark-premium'),
  },
  {
    id: 'starter-recorrente',
    nome: 'Assinatura recorrente',
    descricao: 'SLA, serviços empilhados, governança e mensalidade.',
    categoria: 'Recorrente',
    elementos: recorrenteElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: applyThemeToPageLayout(normalizePageLayout(null), 'ocean-pro'),
  },
  {
    id: 'starter-trafego-pago',
    nome: 'Plano de Tráfego Pago',
    descricao: 'Hero, escopo, funil, calculadora interativa de ROI, tabela de cenários e cronograma.',
    categoria: 'Marketing',
    elementos: trafegoPagoElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: applyThemeToPageLayout(normalizePageLayout(null), 'navy-performance'),
  },
  {
    id: 'starter-design',
    nome: 'Design / Criativo',
    descricao: 'Portfolio visual, processo criativo e investimento em branding.',
    categoria: 'Criativo',
    elementos: designElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: applyThemeToPageLayout(normalizePageLayout(null), 'purple-creative'),
  },
  {
    id: 'starter-juridico',
    nome: 'Jurídico / Serviços',
    descricao: 'Escopo formal, FAQ e honorários mensais.',
    categoria: 'Serviços',
    elementos: juridicoElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: applyThemeToPageLayout(normalizePageLayout(null), 'clean-corporate'),
  },
  {
    id: 'starter-imobiliario',
    nome: 'Imobiliário',
    descricao: 'Galeria, métricas do imóvel e condições comerciais.',
    categoria: 'Imobiliário',
    elementos: imobiliarioElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: applyThemeToPageLayout(normalizePageLayout(null), 'forest-growth'),
  },
  {
    id: 'starter-evento',
    nome: 'Evento / Lançamento',
    descricao: 'Urgência com countdown, benefícios e pricing.',
    categoria: 'Eventos',
    elementos: eventoElements,
    fluxo: DEFAULT_FLOW,
    pageLayout: applyThemeToPageLayout(normalizePageLayout(null), 'bold-red'),
  },
];

export function applyStarterTemplate(templateId: string): {
  elementos: BuilderElement[];
  fluxo: ProposalFlowConfig;
  nome: string;
  pageLayout: BuilderPageLayout;
} | null {
  const t = STARTER_TEMPLATES.find((x) => x.id === templateId);
  if (!t) return null;
  return {
    elementos: cloneElements(t.elementos),
    fluxo: t.fluxo,
    nome: t.nome,
    pageLayout: normalizePageLayout(t.pageLayout ?? DEFAULT_PAGE_LAYOUT),
  };
}
