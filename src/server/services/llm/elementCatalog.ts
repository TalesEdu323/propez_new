import type { BuilderElementType } from '../../../types/builder.js';
import type { PlanTier } from '../../../lib/featureFlags.js';
import { getWidgetRequiredPlan } from '../../../lib/featureFlags.js';

export type ElementNarrativeRole =
  | 'abertura'
  | 'contexto'
  | 'metodologia'
  | 'prova'
  | 'escopo'
  | 'investimento'
  | 'urgencia'
  | 'cta'
  | 'estrutura'
  | 'midia'
  | 'navegacao'
  | 'interno';

export interface ElementCatalogEntry {
  type: BuilderElementType;
  role: ElementNarrativeRole;
  label: string;
  requiredProps: string[];
  optionalProps: string[];
  briefQuestions: string[];
  extractionHints: string[];
  imageFields: string[];
  planMin: PlanTier;
  pairsWith: BuilderElementType[];
  promptLine: string;
}

function entry(
  type: BuilderElementType,
  role: ElementNarrativeRole,
  label: string,
  requiredProps: string[],
  briefQuestions: string[],
  promptLine: string,
  opts?: Partial<Pick<ElementCatalogEntry, 'optionalProps' | 'extractionHints' | 'imageFields' | 'pairsWith'>>,
): ElementCatalogEntry {
  return {
    type,
    role,
    label,
    requiredProps,
    optionalProps: opts?.optionalProps ?? [],
    briefQuestions,
    extractionHints: opts?.extractionHints ?? ['R\\$\\s*[\\d.,]+', '\\d+\\s*(dias|semanas|meses)', '%'],
    imageFields: opts?.imageFields ?? [],
    planMin: getWidgetRequiredPlan(type),
    pairsWith: opts?.pairsWith ?? [],
    promptLine,
  };
}

export const ELEMENT_CATALOG: ElementCatalogEntry[] = [
  entry('marketing_hero', 'abertura', 'Hero marketing', ['title'], ['Qual a promessa principal?', 'Qual badge ou subtítulo?'], 'marketing_hero: abertura impactante; use primaryColor/secondaryColor; imageGeneratePrompt para banner de capa (backgroundImageUrl) — cena wide cinematic', { imageFields: ['backgroundImageUrl', 'logoUrl'], pairsWith: ['marketing_context', 'stats'] }),
  entry('marketing_context', 'contexto', 'Contexto', ['title', 'description'], ['Qual dor do cliente?', 'Quais números ou fatos reforçam?'], 'marketing_context: parágrafos + stats/challenges do prompt'),
  entry('marketing_strategy', 'metodologia', 'Estratégia', ['title', 'steps'], ['Quais etapas da metodologia?', 'Como nomear cada fase?'], 'marketing_strategy: passos com letra/título/descrição', { pairsWith: ['timeline', 'feature_grid'] }),
  entry('marketing_services', 'escopo', 'Serviços marketing', ['title', 'services'], ['Quais entregas numeradas?', 'Descrição de cada serviço?'], 'marketing_services: lista numerada de entregas'),
  entry('marketing_pricing', 'investimento', 'Preço marketing', ['title', 'price', 'items'], ['Valor total?', 'O que está incluso?'], 'marketing_pricing: investimento com lista e CTA approve', { pairsWith: ['marketing_cta'] }),
  entry('marketing_cta', 'cta', 'CTA marketing', ['title', 'buttonText'], ['Qual frase de fechamento?', 'Texto do botão?'], 'marketing_cta: fechamento com proposalAction approve', { pairsWith: ['pricing', 'marketing_pricing'] }),
  entry('heading', 'abertura', 'Título', ['text'], ['Qual o título da seção?', 'Tom formal ou direto?'], 'heading: títulos de seção com cor e tamanho'),
  entry('paragraph', 'contexto', 'Parágrafo', ['text'], ['Que explicação detalhar?', 'Benefícios em prosa?'], 'paragraph: texto corrido'),
  entry('button', 'cta', 'Botão', ['text'], ['Texto do CTA?', 'Aprovar proposta?'], 'button: CTA com proposalAction approve quando for fechamento'),
  entry('image', 'midia', 'Imagem', [], ['Que imagem ilustra a proposta?'], 'image: imageGeneratePrompt (cena descritiva fotorrealista) — preferir sobre imageSearchQuery', { imageFields: ['url'] }),
  entry('logo', 'abertura', 'Logo', [], ['Nome da marca?', 'URL do logo?'], 'logo: logoText ou logoUrl', { imageFields: ['logoUrl'] }),
  entry('card', 'prova', 'Card', ['title'], ['Benefício em destaque?', 'Imagem do card?'], 'card: benefício com imageSearchQuery em imageUrl', { imageFields: ['imageUrl'], pairsWith: ['feature_grid'] }),
  entry('feature_grid', 'escopo', 'Grade de features', ['features'], ['3–6 benefícios ou entregas?', 'Ícones Lucide?'], 'feature_grid: cards com icon/title/desc'),
  entry('stats', 'prova', 'Estatísticas', ['items'], ['Quais KPIs ou prazos?', 'Números do prompt?'], 'stats: value/label/suffix extraídos do brief', { pairsWith: ['timeline', 'marketing_context'] }),
  entry('timeline', 'metodologia', 'Cronograma', ['steps'], ['Fases e prazos?', 'Marcos do projeto?'], 'timeline: passos temporais'),
  entry('accordion', 'prova', 'FAQ', ['items'], ['Objeções frequentes?', 'Perguntas do cliente?'], 'accordion: FAQ com title/content'),
  entry('icon_list', 'escopo', 'Lista com ícones', ['items'], ['Lista de inclusões?', 'Benefícios em tópicos?'], 'icon_list: itens com listIcon'),
  entry('pricing', 'investimento', 'Preço', ['title', 'price'], ['Valor?', 'Recorrente ou único?', 'Parcelas?'], 'pricing: price e period (/mês se recorrente); proposalAction approve', { extractionHints: ['R\\$\\s*[\\d.,]+', '/mês', 'mensal'] }),
  entry('testimonial', 'prova', 'Depoimento', ['quote', 'author'], ['Citação ou prova social?', 'Nome e cargo?'], 'testimonial: quote/author/role; imageSearchQuery em avatarUrl', { imageFields: ['avatarUrl'] }),
  entry('comparison_table', 'prova', 'Comparativo', ['headers', 'rows'], ['Antes vs depois?', 'Nós vs concorrente?'], 'comparison_table: comparativo'),
  entry('service_stack', 'escopo', 'Stack de serviços', ['mode'], ['Projeto ou recorrente?', 'Abas ou pilha?'], 'service_stack: OBRIGATÓRIO — mode tabs (projeto) ou stack (recorrente); título da seção', { pairsWith: ['feature_grid', 'tabs'] }),
  entry('countdown', 'urgencia', 'Contagem', ['targetDate'], ['Data limite?', 'Urgência?'], 'countdown: prazo de oferta'),
  entry('divider', 'estrutura', 'Divisor', [], [], 'divider: respiro entre seções'),
  entry('spacer', 'estrutura', 'Espaço', ['height'], [], 'spacer: altura em px'),
  entry('navbar', 'navegacao', 'Navbar', ['logoText'], ['Links de navegação?'], 'navbar: links e botão'),
  entry('gallery', 'midia', 'Galeria', ['images'], ['Fotos do portfólio?'], 'gallery: imageSearchQuery por imagem ou urls', { imageFields: ['images'] }),
  entry('slider', 'midia', 'Slider', ['slides'], ['Slides de destaque?'], 'slider: slides com imageSearchQuery', { imageFields: ['image'] }),
  entry('video', 'midia', 'Vídeo', ['url'], ['URL YouTube/Vimeo?'], 'video: embed URL'),
  entry('animated_text', 'abertura', 'Texto animado', ['text'], ['Frase de impacto?'], 'animated_text: headline animada'),
  entry('tabs', 'escopo', 'Abas', ['tabs'], ['Conteúdo por aba?'], 'tabs: conteúdo tabulado'),
  entry('progress_bar', 'urgencia', 'Barra progresso', ['percentage'], ['% vagas ou progresso?'], 'progress_bar: urgência visual'),
  entry('star_rating', 'prova', 'Estrelas', ['rating'], ['Nota ou avaliação?'], 'star_rating: prova social numérica'),
  entry('whatsapp_button', 'cta', 'WhatsApp', ['link'], ['Número WhatsApp?'], 'whatsapp_button: link wa.me'),
  entry('image_carousel', 'midia', 'Carrossel', ['images'], ['Fotos em sequência?'], 'image_carousel: várias imagens', { imageFields: ['images'] }),
  entry('google_map', 'contexto', 'Mapa', ['address'], ['Endereço?'], 'google_map: localização'),
  entry('funnel', 'metodologia', 'Funil', ['stages'], ['Etapas do funil?'], 'funnel: estágios com valores'),
  entry('toast_notification', 'prova', 'Toast social', ['name', 'action'], ['Prova social recente?'], 'toast_notification: notificação fictícia', { imageFields: ['avatarUrl'] }),
  entry('grid', 'estrutura', 'Grid', ['columns'], [], 'grid: layout com column children (evitar na IA plana)'),
  entry('container', 'estrutura', 'Container', [], [], 'container: agrupador (evitar na IA plana)'),
  entry('column', 'estrutura', 'Coluna', [], [], 'column: só via grid'),
  entry('projection_calculator', 'investimento', 'Calculadora ROI', ['title', 'sliders'], ['Métricas de tráfego/ROI?'], 'projection_calculator: simulador Business'),
  entry('metrics_table', 'investimento', 'Tabela métricas', ['headers', 'rows'], ['Cenários de investimento?'], 'metrics_table: tabela comparativa Business'),
];

const catalogByType = new Map(ELEMENT_CATALOG.map((e) => [e.type, e]));

export function getCatalogEntry(type: BuilderElementType): ElementCatalogEntry | undefined {
  return catalogByType.get(type);
}

export function buildCatalogPromptSection(allowedTypes: readonly string[]): string {
  const allowed = new Set(allowedTypes);
  const lines = ELEMENT_CATALOG.filter((e) => allowed.has(e.type)).map(
    (e) => `- ${e.type} [${e.role}]: ${e.promptLine} | Perguntas: ${e.briefQuestions.join('; ')}`,
  );
  return `Catálogo de elementos (imagens: imageSearchQuery para fotos reais; imageGeneratePrompt para cenas custom/ilustrativas — nunca invente URLs):\n${lines.join('\n')}`;
}

/** Perguntas de briefing sugeridas na UI (cliente). */
export function getBriefQuestionChips(offerType: string, hasMarketing: boolean): string[] {
  const common = [
    'Qual o valor ou faixa de investimento (R$)?',
    'Qual o prazo ou duração do projeto?',
    'É recorrente (mensal) ou projeto com entrega única?',
    'Quais são as 3 principais entregas?',
    'Há urgência ou data limite?',
  ];
  const byOffer: Record<string, string[]> = {
    consultoria: ['Quantas sessões ou etapas?', 'Qual o resultado esperado pelo cliente?'],
    agencia: ['Quais canais (Meta, Google)?', 'Orçamento de mídia mensal?'],
    recorrente: ['O que está incluso todo mês?', 'SLA de resposta?'],
    saas: ['Quantos usuários ou licenças?', 'Integrações necessárias?'],
    evento: ['Data e formato do evento?', 'Vagas disponíveis?'],
    generico: ['Quem é o público-alvo?', 'Qual diferencial da sua oferta?'],
  };
  const extra = byOffer[offerType] ?? byOffer.generico;
  if (!hasMarketing) {
    return [...common, ...extra, 'Tom: corporativo, criativo ou técnico?'];
  }
  return [...common, ...extra];
}

export const OFFER_PLACEHOLDERS: Record<string, string> = {
  consultoria:
    'Ex.: Consultoria B2B por 90 dias — diagnóstico, plano de ação e acompanhamento quinzenal. Investimento R$ 15.000.',
  agencia:
    'Ex.: Gestão de tráfego Meta + Google por 6 meses, produção de criativos e relatórios semanais. Budget R$ 4.500/mês.',
  recorrente:
    'Ex.: Retainer de design e suporte — 20h/mês, SLA 24h, entregas contínuas. Mensalidade R$ 3.200.',
  saas:
    'Ex.: Plataforma SaaS com onboarding, 50 licenças e suporte prioritário. R$ 890/usuário/mês.',
  evento:
    'Ex.: Workshop presencial 2 dias, 30 vagas, material e certificado. R$ 1.200 por participante.',
  generico:
    'Ex.: Proposta comercial com escopo, cronograma, investimento e CTA de aprovação.',
};
