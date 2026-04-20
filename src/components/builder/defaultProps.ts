import type { BuilderElementType } from '../../types/builder';

/**
 * Props padrão para cada tipo de elemento do Builder.
 *
 * Usado tanto ao criar um novo elemento via drag-and-drop quanto como
 * referência de shape para o painel de propriedades. A tipagem permissiva
 * (`Record<string, any>`) será endurecida na Fase E (união discriminada
 * por `type`).
 */
export const DEFAULT_PROPS: Record<BuilderElementType, Record<string, any>> = {
  heading: { text: 'Novo Título', color: '#18181b', align: 'left', size: 'text-4xl', weight: 'font-bold' },
  paragraph: { text: 'Digite seu texto aqui. Você pode editar as propriedades na barra lateral.', color: '#52525b', align: 'left', size: 'text-base' },
  button: { text: 'Clique Aqui', bgColor: '#dc2626', textColor: '#ffffff', align: 'center', radius: 'rounded-md', animation: 'none' },
  image: { url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop', alt: 'Imagem', width: '100%', radius: 'rounded-xl', shadow: 'shadow-none' },
  divider: { color: '#e5e7eb', thickness: '2', style: 'solid' },
  spacer: { height: '64' },
  video: { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', radius: 'rounded-xl', shadow: 'shadow-lg' },
  card: { title: 'Título do Cartão', description: 'Uma breve descrição sobre o benefício ou recurso.', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop', buttonText: 'Saiba Mais', bgColor: '#ffffff', radius: 'rounded-2xl', shadow: 'shadow-xl' },
  stats: { value: '100', label: 'Clientes Satisfeitos', suffix: '%', color: '#dc2626' },
  accordion: { title: 'Como funciona o serviço?', content: 'Nós oferecemos uma solução completa de ponta a ponta para o seu negócio crescer de forma escalável e previsível.', bgColor: '#ffffff' },
  animated_text: { text: 'Texto com Animação', animation: 'fade-up', color: '#dc2626', size: 'text-5xl', align: 'center', weight: 'font-extrabold' },
  funnel: {
    stages: [
      { name: 'Visitantes', value: '10.000' },
      { name: 'Leads', value: '500' },
      { name: 'Oportunidades', value: '150' },
      { name: 'Vendas', value: '50' }
    ],
    color: '#dc2626'
  },
  icon_list: {
    items: ['Design Responsivo e Moderno', 'Otimizado para SEO e Conversão', 'Integração com CRM e Automação'],
    iconColor: '#10b981',
    textColor: '#52525b'
  },
  pricing: {
    title: 'Plano Profissional',
    price: 'R$ 997',
    period: '/mês',
    items: ['Acesso Completo à Plataforma', 'Suporte Prioritário 24/7', 'Atualizações Gratuitas', 'Consultoria Mensal'],
    buttonText: 'Assinar Agora',
    buttonColor: '#18181b',
    bgColor: '#ffffff'
  },
  testimonial: {
    quote: 'Esta ferramenta mudou completamente a forma como criamos páginas. É incrivelmente rápida, intuitiva e os resultados são fantásticos.',
    author: 'Maria Silva',
    role: 'Diretora de Marketing',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    bgColor: '#f8fafc'
  },
  timeline: {
    steps: [
      { title: 'Passo 1: Planejamento', desc: 'Definição de metas, público-alvo e estratégia de comunicação.' },
      { title: 'Passo 2: Execução', desc: 'Criação das campanhas, landing pages e automações.' },
      { title: 'Passo 3: Escala', desc: 'Otimização contínua, testes A/B e aumento de verba.' }
    ],
    color: '#3b82f6'
  },
  navbar: {
    logoText: 'Minha Marca',
    links: ['Início', 'Sobre', 'Serviços', 'Contato'],
    buttonText: 'Falar com Especialista',
    bgColor: '#ffffff',
    textColor: '#18181b'
  },
  slider: {
    slides: [
      { title: 'Design Moderno', desc: 'Crie interfaces incríveis com facilidade.', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' },
      { title: 'Alta Conversão', desc: 'Focado em resultados e performance.', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop' }
    ],
    height: '400'
  },
  feature_grid: {
    columns: '3',
    features: [
      { title: 'Rápido', desc: 'Carregamento otimizado' },
      { title: 'Responsivo', desc: 'Funciona em qualquer tela' },
      { title: 'Seguro', desc: 'Proteção de ponta a ponta' }
    ],
    bgColor: '#ffffff'
  },
  gallery: {
    columns: '3',
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop'
    ],
    gap: '16',
    radius: 'rounded-xl'
  },
  grid: {
    columns: '2',
    gap: '16',
    padding: '16',
    bgColor: 'transparent',
    radius: 'rounded-none'
  },
  container: {
    padding: '16',
    bgColor: 'transparent',
    radius: 'rounded-none',
    shadow: 'shadow-none',
    align: 'left'
  },
  column: {
    padding: '16',
    bgColor: 'transparent',
    radius: 'rounded-none',
    shadow: 'shadow-none',
    align: 'left'
  },
  countdown: {
    targetDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    targetTime: '23:59',
    color: '#dc2626',
    bgColor: '#ffffff',
    labelColor: '#52525b',
    expiredText: 'Oferta Encerrada!'
  },
  whatsapp_button: {
    link: 'https://wa.me/5511999999999',
    position: 'bottom-right',
    bgColor: '#25D366',
    iconColor: '#ffffff'
  },
  tabs: {
    tabs: [
      { title: 'Aba 1', content: 'Conteúdo da primeira aba.' },
      { title: 'Aba 2', content: 'Conteúdo da segunda aba.' },
      { title: 'Aba 3', content: 'Conteúdo da terceira aba.' }
    ],
    activeColor: '#3b82f6',
    bgColor: '#ffffff'
  },
  progress_bar: {
    percentage: '75',
    label: 'Vagas Preenchidas',
    color: '#10b981',
    bgColor: '#e5e7eb',
    height: '16'
  },
  star_rating: {
    rating: '5',
    maxStars: '5',
    color: '#fbbf24',
    size: '24',
    align: 'center'
  },
  google_map: {
    address: 'Av. Paulista, 1000, São Paulo, SP',
    height: '400',
    zoom: '15',
    radius: 'rounded-xl'
  },
  comparison_table: {
    title: 'Comparativo de Planos',
    headers: ['Recurso', 'Nosso Plano', 'Concorrente'],
    rows: [
      { feature: 'Suporte 24/7', us: true, them: false },
      { feature: 'Atualizações', us: true, them: true },
      { feature: 'Treinamento', us: true, them: false }
    ],
    color: '#10b981',
    bgColor: '#ffffff'
  },
  image_carousel: {
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop'
    ],
    height: '400',
    radius: 'rounded-xl',
    autoPlay: true,
    interval: '3000'
  },
  toast_notification: {
    name: 'João S.',
    action: 'acabou de comprar o plano Pro',
    timeAgo: 'há 2 minutos',
    avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
    position: 'bottom-left',
    bgColor: '#ffffff',
    textColor: '#18181b'
  },
  marketing_hero: {
    title: 'Chegar em quem já quer comprar — todo dia.',
    subtitle: 'Proposta Exclusiva · Cliente Exemplo',
    description: 'Você tem produtos incríveis e um posicionamento único. Nós colocamos eles na frente de quem está pronto para comprar.',
    primaryColor: '#B45309',
    secondaryColor: '#D97706',
    logoUrl: 'https://chocolate-wren-935571.hostingersite.com/wp-content/uploads/2026/03/Vortex.png'
  },
  marketing_context: {
    title: 'Entendemos o que você construiu.',
    description: 'Você não tem só um produto — tem ativos complementares que criam uma oportunidade única de escala no digital.',
    stats: [
      { value: '2', label: 'Produtos ativos' },
      { value: 'Meta', label: 'Instagram + Facebook' }
    ],
    challenges: [
      { title: 'Alcance limitado', desc: 'O conteúdo excelente não chega a quem nunca te seguiu.' },
      { title: 'Sem funil estruturado', desc: 'Visitantes chegam e saem sem entender o caminho.' }
    ]
  },
  marketing_strategy: {
    title: 'Funil completo do lead à venda.',
    steps: [
      { letra: 'T', titulo: 'Topo — Atração', desc: 'Anúncios para novos públicos que nunca ouviram falar de você.' },
      { letra: 'M', titulo: 'Meio — Nutrição', desc: 'Remarketing inteligente para quem já interagiu com a marca.' },
      { letra: 'F', titulo: 'Fundo — Conversão', desc: 'Público aquecido pronto para converter no produto de maior ticket.' }
    ]
  },
  marketing_services: {
    title: 'Estratégia simples, resultado real.',
    services: [
      { num: '01', titulo: 'Gestão de Tráfego Pago', desc: 'Configuramos, gerenciamos e otimizamos todas as campanhas.' },
      { num: '02', titulo: 'Produção Audiovisual', desc: 'Produzimos fotos e vídeos pensados para performance.' }
    ]
  },
  marketing_pricing: {
    title: 'O que você recebe',
    price: '2.459,97',
    items: [
      'Gestão completa de Meta Ads',
      'Produção audiovisual mensal',
      '1 Landing Page por mês'
    ]
  },
  marketing_cta: {
    title: 'O custo de não agir é maior do que o investimento.',
    description: 'Cada semana sem anúncios é uma semana de vendas que ficaram para o concorrente.',
    buttonText: 'Falar com Especialista agora'
  }
};
