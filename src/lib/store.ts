export interface Cliente {
  id: string;
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  data_cadastro: string;
}

export interface Servico {
  id: string;
  nome: string;
  descricao: string;
  valor: number;
  tipo: 'unico' | 'recorrente';
  contratoId?: string; // ID do contrato padrão para este serviço
}

export interface ContratoTemplate {
  id: string;
  titulo: string;
  texto: string;
  data_criacao: string;
}

export interface ModeloProposta {
  id: string;
  nome: string;
  elementos: any[];
  servicos: string[]; // IDs dos serviços
  contratoTexto?: string;
  contratoId?: string; // ID do contrato padrão para este modelo
  chavePix?: string;
  linkPagamento?: string;
  data_criacao: string;
}

export interface Proposta {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  modelo_id?: string;
  servicos: string[]; // IDs dos serviços selecionados
  valor: number;
  desconto?: number;
  recorrente?: boolean;
  ciclo_recorrencia?: string;
  duracao_recorrencia?: number;
  data_envio?: string;
  data_validade?: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  data_criacao: string;
  elementos: any[];
  contratoTexto?: string;
  contratoId?: string;
  chavePix?: string;
  linkPagamento?: string;
  pago: boolean;
  data_pagamento?: string;
}

const initialClientes: Cliente[] = [
  {
    id: '1',
    nome: 'TechCorp Solutions',
    empresa: 'TechCorp',
    email: 'contato@techcorp.com',
    telefone: '(11) 99999-9999',
    data_cadastro: new Date().toISOString()
  },
  {
    id: '2',
    nome: 'Inova Marketing',
    empresa: 'Inova',
    email: 'ola@inovamarketing.com.br',
    telefone: '(11) 98888-8888',
    data_cadastro: new Date().toISOString()
  }
];

const initialServicos: Servico[] = [
  {
    id: '1',
    nome: 'Desenvolvimento de Website',
    descricao: 'Criação de website institucional responsivo com até 5 páginas.',
    valor: 3500,
    tipo: 'unico',
    contratoId: '1'
  },
  {
    id: '2',
    nome: 'Gestão de Redes Sociais',
    descricao: 'Gestão mensal de Instagram e Facebook com 12 posts/mês.',
    valor: 1200,
    tipo: 'recorrente'
  },
  {
    id: '3',
    nome: 'Consultoria SEO',
    descricao: 'Análise e otimização de SEO on-page e off-page.',
    valor: 2000,
    tipo: 'unico'
  }
];

export interface UserConfig {
  nome: string;
  cnpj: string;
  logo?: string;
  assinatura?: string;
  onboarded: boolean;
  isPro?: boolean;
}

const initialModelos: ModeloProposta[] = [
  {
    id: 'modelo-servico',
    nome: 'Proposta de Serviço (Simples)',
    elementos: [
      { id: 'h1', type: 'heading', props: { text: 'Proposta de Prestação de Serviços', align: 'center', size: 'text-5xl' } },
      { id: 'p1', type: 'paragraph', props: { text: 'Apresentamos nossa solução personalizada para atender às suas necessidades de negócio.', align: 'center' } },
      { id: 's1', type: 'stats', props: { value: '10', label: 'Anos de Experiência', suffix: '+', color: '#2563eb' } },
      { id: 'f1', type: 'feature_grid', props: { features: [{ title: 'Qualidade', desc: 'Entrega de alto nível' }, { title: 'Agilidade', desc: 'Prazos respeitados' }, { title: 'Suporte', desc: 'Atendimento 24/7' }] } }
    ],
    servicos: [],
    data_criacao: new Date().toISOString()
  },
  {
    id: 'modelo-website',
    nome: 'Proposta de Website Profissional',
    elementos: [
      { id: 'nav1', type: 'navbar', props: { logoText: 'WEB AGENCY', links: ['Sobre', 'Portfólio', 'Contato'], buttonText: 'Falar com Especialista' } },
      { id: 'hero1', type: 'slider', props: { height: 600, slides: [{ image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200', title: 'Websites que Convertem', desc: 'Design moderno e focado em resultados.' }] } },
      { id: 'grid1', type: 'feature_grid', props: { columns: '3', features: [{ title: 'Responsivo', desc: 'Funciona em todos os dispositivos' }, { title: 'SEO', desc: 'Otimizado para o Google' }, { title: 'Veloz', desc: 'Carregamento instantâneo' }] } },
      { id: 'pricing1', type: 'pricing', props: { title: 'Plano Website', price: '3.500', period: 'único', items: ['Design Exclusivo', 'Hospedagem 1 ano', 'Suporte Técnico'] } }
    ],
    servicos: ['1'],
    data_criacao: new Date().toISOString()
  },
  {
    id: 'modelo-trafego',
    nome: 'Tráfego Pago (Performance)',
    elementos: [
      { id: 'm-hero', type: 'marketing_hero', props: { title: 'Escalamos seu faturamento com anúncios inteligentes.', subtitle: 'Gestão de Tráfego Pago', description: 'Pare de queimar dinheiro com anúncios que não vendem. Nossa metodologia foca em ROI real.', primaryColor: '#B45309' } },
      { id: 'm-context', type: 'marketing_context', props: { title: 'O cenário atual do seu negócio', description: 'Muitas empresas investem em tráfego sem uma estratégia de funil, resultando em CAC alto e baixo lucro.', stats: [{ value: '3x', label: 'Média de ROI' }, { value: '45%', label: 'Redução de CAC' }], challenges: [{ title: 'Público Desqualificado', desc: 'Atraindo pessoas que não compram.' }, { title: 'Falta de Escala', desc: 'Dificuldade em aumentar o investimento mantendo o lucro.' }] } },
      { id: 'm-strategy', type: 'marketing_strategy', props: { title: 'Nossa Estratégia de Escala', steps: [{ letra: 'A', titulo: 'Atração', desc: 'Anúncios de topo de funil para novos públicos.' }, { letra: 'R', titulo: 'Retenção', desc: 'Remarketing para quem já demonstrou interesse.' }, { letra: 'C', titulo: 'Conversão', desc: 'Foco em fechamento e vendas diretas.' }] } },
      { id: 'm-pricing', type: 'marketing_pricing', props: { title: 'Investimento em Gestão', price: '1.500', items: ['Gestão de Meta Ads', 'Gestão de Google Ads', 'Dashboard de Métricas', 'Reunião Mensal'] } },
      { id: 'm-cta', type: 'marketing_cta', props: { title: 'Vamos escalar seu negócio?', description: 'Clique no botão abaixo para agendar sua consultoria gratuita.', buttonText: 'QUERO ESCALAR AGORA' } }
    ],
    servicos: ['2'],
    data_criacao: new Date().toISOString()
  },
  {
    id: 'modelo-marketing-completo',
    nome: 'Marketing 360º (Completo)',
    elementos: [
      { id: 'm-hero', type: 'marketing_hero', props: { title: 'Sua empresa com um ecossistema de vendas completo.', subtitle: 'Marketing 360º', description: 'Unimos branding, tráfego e tecnologia para criar uma máquina de vendas previsível.', primaryColor: '#1e40af' } },
      { id: 'grid1', type: 'feature_grid', props: { columns: '2', features: [{ title: 'Branding', desc: 'Identidade visual e posicionamento' }, { title: 'Tráfego', desc: 'Aquisição de novos clientes' }, { title: 'Conteúdo', desc: 'Retenção e autoridade' }, { title: 'Tecnologia', desc: 'Automação e CRM' }] } },
      { id: 'm-strategy', type: 'marketing_strategy', props: { title: 'Jornada do Cliente' } },
      { id: 'm-services', type: 'marketing_services', props: { title: 'O que entregamos no 360º' } },
      { id: 'timeline1', type: 'timeline', props: { steps: [{ title: 'Mês 1: Setup', desc: 'Configurações e planejamento' }, { title: 'Mês 2: Lançamento', desc: 'Início das campanhas' }, { title: 'Mês 3: Otimização', desc: 'Ajustes finos para escala' }] } },
      { id: 'm-pricing', type: 'marketing_pricing', props: { title: 'Plano 360º', price: '5.000', items: ['Gestão Completa', 'Time Dedicado', 'Relatórios Semanais'] } },
      { id: 'm-cta', type: 'marketing_cta', props: { title: 'Pronto para dominar o mercado?', buttonText: 'FALAR COM CONSULTOR' } }
    ],
    servicos: ['2', '3'],
    data_criacao: new Date().toISOString()
  }
];

const initialContratos: ContratoTemplate[] = [
  {
    id: '1',
    titulo: 'Contrato de Prestação de Serviços Web',
    texto: `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS

CONTRATADA: {{EMPRESA_NOME}} (CNPJ: {{EMPRESA_CNPJ}})
CONTRATANTE: {{CLIENTE_NOME}}

1. OBJETO
O presente contrato tem como objeto a prestação de serviços de {{SERVICOS_LISTA}}.

2. VALOR E PAGAMENTO
O valor total dos serviços é de {{VALOR_TOTAL}}.

3. PRAZO
A validade desta proposta é até {{DATA_VALIDADE}}.

Data: {{DATA_ATUAL}}

Assinatura CONTRATADA:
{{ASSINATURA_IMAGEM}}`,
    data_criacao: new Date().toISOString()
  }
];

const initialPropostas: Proposta[] = [
  {
    id: '1',
    cliente_id: '1',
    cliente_nome: 'TechCorp Solutions',
    modelo_id: '1',
    servicos: ['1', '3'],
    valor: 5500,
    status: 'aprovada',
    pago: true,
    data_pagamento: new Date(Date.now() - 86400000).toISOString(),
    data_criacao: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    elementos: initialModelos[0].elementos
  },
  {
    id: '2',
    cliente_id: '2',
    cliente_nome: 'Inova Marketing',
    servicos: ['2'],
    valor: 1200,
    recorrente: true,
    ciclo_recorrencia: 'mensal',
    status: 'pendente',
    pago: false,
    data_criacao: new Date().toISOString(),
    elementos: []
  }
];

export const store = {
  getUserConfig: (): UserConfig => {
    try {
      const data = localStorage.getItem('propez_user_config');
      if (!data) return { nome: '', cnpj: '', onboarded: false };
      return JSON.parse(data);
    } catch {
      return { nome: '', cnpj: '', onboarded: false };
    }
  },
  saveUserConfig: (config: UserConfig) => {
    localStorage.setItem('propez_user_config', JSON.stringify(config));
  },

  getClientes: (): Cliente[] => {
    try {
      const data = localStorage.getItem('propez_clientes');
      if (!data) {
        localStorage.setItem('propez_clientes', JSON.stringify(initialClientes));
        return initialClientes;
      }
      return JSON.parse(data);
    } catch {
      return initialClientes;
    }
  },
  saveClientes: (clientes: Cliente[]) => {
    localStorage.setItem('propez_clientes', JSON.stringify(clientes));
  },
  
  getServicos: (): Servico[] => {
    try {
      const data = localStorage.getItem('propez_servicos');
      if (!data) {
        localStorage.setItem('propez_servicos', JSON.stringify(initialServicos));
        return initialServicos;
      }
      return JSON.parse(data);
    } catch {
      return initialServicos;
    }
  },
  saveServicos: (servicos: Servico[]) => {
    localStorage.setItem('propez_servicos', JSON.stringify(servicos));
  },

  getModelos: (): ModeloProposta[] => {
    try {
      const data = localStorage.getItem('propez_modelos');
      if (!data) {
        localStorage.setItem('propez_modelos', JSON.stringify(initialModelos));
        return initialModelos;
      }
      return JSON.parse(data);
    } catch {
      return initialModelos;
    }
  },
  saveModelos: (modelos: ModeloProposta[]) => {
    localStorage.setItem('propez_modelos', JSON.stringify(modelos));
  },

  getPropostas: (): Proposta[] => {
    try {
      const data = localStorage.getItem('propez_propostas');
      if (!data) {
        localStorage.setItem('propez_propostas', JSON.stringify(initialPropostas));
        return initialPropostas;
      }
      return JSON.parse(data);
    } catch {
      return initialPropostas;
    }
  },
  savePropostas: (propostas: Proposta[]) => {
    localStorage.setItem('propez_propostas', JSON.stringify(propostas));
  },

  getContratos: (): ContratoTemplate[] => {
    try {
      const data = localStorage.getItem('propez_contratos');
      if (!data) {
        localStorage.setItem('propez_contratos', JSON.stringify(initialContratos));
        return initialContratos;
      }
      return JSON.parse(data);
    } catch {
      return initialContratos;
    }
  },
  saveContratos: (contratos: ContratoTemplate[]) => {
    localStorage.setItem('propez_contratos', JSON.stringify(contratos));
  },
};
