export type OfferType =
  | 'consultoria'
  | 'agencia'
  | 'recorrente'
  | 'saas'
  | 'evento'
  | 'generico';

export type ToneType = 'corporativo' | 'criativo' | 'premium' | 'tecnico';

export interface LayoutContext {
  offerType: OfferType;
  tone: ToneType;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    bgLight: string;
    label: string;
  };
  suggestedElements: string[];
  narrativeHint: string;
}

const OFFER_KEYWORDS: Record<OfferType, string[]> = {
  consultoria: [
    'consultoria', 'consultor', 'estratég', 'estrateg', 'b2b', 'diagnóstico', 'diagnostico',
    'roadmap', 'mentoria', 'assessoria', 'planejamento',
  ],
  agencia: [
    'agência', 'agencia', 'marketing', 'tráfego', 'trafego', 'ads', 'meta', 'google',
    'criativo', 'social media', 'performance', 'mídia', 'midia', 'branding',
  ],
  recorrente: [
    'assinatura', 'mensal', 'recorrente', 'mensalidade', 'retainer', 'suporte contínuo',
    'suporte continuo', 'manutenção', 'manutencao', 'sla', 'plano mensal',
  ],
  saas: [
    'saas', 'software', 'plataforma', 'app', 'aplicativo', 'licença', 'licenca',
    'api', 'cloud', 'sistema', 'produto digital',
  ],
  evento: [
    'evento', 'workshop', 'treinamento', 'curso', 'palestra', 'bootcamp', 'imersão',
    'imersao', 'capacitação', 'capacitacao',
  ],
  generico: [],
};

const TONE_KEYWORDS: Record<ToneType, string[]> = {
  corporativo: ['corporativo', 'empresa', 'b2b', 'executivo', 'formal'],
  criativo: ['criativo', 'design', 'agência', 'agencia', 'visual', 'marca'],
  premium: ['premium', 'exclusivo', 'luxo', 'high ticket', 'vip'],
  tecnico: ['técnico', 'tecnico', 'ti', 'dev', 'software', 'engenharia', 'api'],
};

const PALETTES: Record<string, LayoutContext['palette']> = {
  b2b: {
    label: 'B2B / consultoria',
    primary: '#0a0a0a',
    secondary: '#18181b',
    accent: '#52525b',
    bgLight: '#fafafa',
  },
  saude: {
    label: 'Saúde / bem-estar',
    primary: '#059669',
    secondary: '#064e3b',
    accent: '#10b981',
    bgLight: '#ecfdf5',
  },
  criativo: {
    label: 'Criativo / agência',
    primary: '#7c3aed',
    secondary: '#0a0a0a',
    accent: '#a78bfa',
    bgLight: '#f5f3ff',
  },
  financeiro: {
    label: 'Finanças / jurídico',
    primary: '#1e3a5f',
    secondary: '#0f172a',
    accent: '#334155',
    bgLight: '#f8fafc',
  },
  tech: {
    label: 'Tech / SaaS',
    primary: '#2563eb',
    secondary: '#1e40af',
    accent: '#3b82f6',
    bgLight: '#eff6ff',
  },
};

const ELEMENT_CATALOG = `
Catálogo semântico — escolha elementos que façam sentido para o contexto (NÃO use todos sempre):
- marketing_hero: abertura impactante com título, subtítulo, badge; use primaryColor/secondaryColor
- marketing_context: parágrafos explicando contexto e objetivo do cliente
- marketing_strategy: metodologia em passos (auditar → otimizar → escalar)
- marketing_services / feature_grid: entregas, benefícios, diferenciais em cards
- stats: KPIs, prazos, números do projeto (extraia do prompt do usuário)
- timeline: cronograma, fases, marcos temporais
- comparison_table: antes vs depois, situação atual vs proposta
- icon_list: lista de benefícios ou inclusões com ícones
- testimonial + star_rating: prova social, depoimento
- accordion: FAQ, objeções frequentes
- service_stack: OBRIGATÓRIO — escopo dos serviços (mode "tabs" ou "stack" conforme recorrente vs projeto)
- pricing / marketing_pricing: investimento, planos, valores (use dados do prompt quando houver)
- marketing_cta / button: chamada final com proposalAction "approve"
- countdown: urgência, lançamento, prazo limitado
- metrics_table / projection_calculator: projeções, ROI, métricas de negócio (Business)
- spacer / divider: respiro visual entre seções
- logo: identidade da marca quando relevante
`.trim();

const ARCHETYPE_PATTERNS = `
Padrões de referência (INSPIRAÇÃO — adapte, não copie a mesma ordem):

CONSULTORIA: marketing_hero → marketing_context → stats → feature_grid → service_stack(tabs) → timeline → accordion → pricing → marketing_cta
AGÊNCIA: marketing_hero → marketing_strategy → stats → service_stack(tabs) → comparison_table → marketing_pricing → icon_list → accordion → marketing_cta
RECORRENTE: marketing_context → icon_list → service_stack(stack) → feature_grid → timeline → pricing(/mês) → accordion → marketing_cta
SAAS/TECH: marketing_hero → marketing_context → feature_grid → stats → comparison_table → pricing → testimonial → marketing_cta
`.trim();

function scoreKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
}

function inferOfferType(prompt: string): OfferType {
  const scores = (Object.keys(OFFER_KEYWORDS) as OfferType[])
    .filter((k) => k !== 'generico')
    .map((type) => ({ type, score: scoreKeywords(prompt, OFFER_KEYWORDS[type]) }))
    .sort((a, b) => b.score - a.score);

  if (scores[0]?.score > 0) return scores[0].type;
  return 'generico';
}

function inferTone(prompt: string, offerType: OfferType): ToneType {
  const scores = (Object.keys(TONE_KEYWORDS) as ToneType[]).map((tone) => ({
    tone,
    score: scoreKeywords(prompt, TONE_KEYWORDS[tone]),
  })).sort((a, b) => b.score - a.score);

  if (scores[0]?.score > 0) return scores[0].tone;

  if (offerType === 'agencia') return 'criativo';
  if (offerType === 'saas') return 'tecnico';
  if (offerType === 'consultoria') return 'corporativo';
  return 'corporativo';
}

function pickPalette(prompt: string, offerType: OfferType, tone: ToneType): LayoutContext['palette'] {
  const lower = prompt.toLowerCase();
  if (/saúde|saude|clínica|clinica|wellness|nutri/.test(lower)) return PALETTES.saude;
  if (/financ|juríd|jurid|contáb|contab|advogad/.test(lower)) return PALETTES.financeiro;
  if (offerType === 'saas' || tone === 'tecnico') return PALETTES.tech;
  if (offerType === 'agencia' || tone === 'criativo') return PALETTES.criativo;
  return PALETTES.b2b;
}

function suggestElements(offerType: OfferType, prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const base: string[] = ['service_stack'];

  const byOffer: Record<OfferType, string[]> = {
    consultoria: ['marketing_hero', 'marketing_context', 'stats', 'feature_grid', 'timeline', 'accordion', 'pricing', 'marketing_cta'],
    agencia: ['marketing_hero', 'marketing_strategy', 'stats', 'comparison_table', 'marketing_pricing', 'icon_list', 'accordion', 'marketing_cta'],
    recorrente: ['marketing_context', 'icon_list', 'feature_grid', 'timeline', 'pricing', 'accordion', 'marketing_cta'],
    saas: ['marketing_hero', 'marketing_context', 'feature_grid', 'stats', 'comparison_table', 'pricing', 'testimonial', 'marketing_cta'],
    evento: ['marketing_hero', 'marketing_context', 'timeline', 'feature_grid', 'pricing', 'accordion', 'marketing_cta'],
    generico: ['marketing_hero', 'marketing_context', 'feature_grid', 'stats', 'pricing', 'marketing_cta'],
  };

  const suggested = [...new Set([...base, ...byOffer[offerType]])];

  if (/depoimento|cliente disse|testemunho/.test(lower)) suggested.push('testimonial');
  if (/urgente|prazo|limitado|vagas/.test(lower)) suggested.push('countdown');
  if (/roi|projeção|projecao|métrica|metrica/.test(lower)) suggested.push('metrics_table', 'projection_calculator');
  if (/antes.*depois|compar/.test(lower)) suggested.push('comparison_table');

  return suggested;
}

function narrativeHint(offerType: OfferType): string {
  const hints: Record<OfferType, string> = {
    consultoria: 'Conte uma história de transformação: diagnóstico → plano → execução assistida. Use números de prazo e sessões.',
    agencia: 'Foque em performance e criativo: abordagem → resultados → comparativo antes/depois → investimento mensal.',
    recorrente: 'Enfatize parceria contínua, SLA, entregas mensais e previsibilidade. service_stack mode "stack".',
    saas: 'Destaque funcionalidades, integrações, planos e prova social. Tom moderno e técnico.',
    evento: 'Cronograma do evento, o que está incluso, vagas/prazo e investimento por participante ou turma.',
    generico: 'Monte narrativa única conforme o prompt — abertura, valor, prova, escopo, investimento, CTA.',
  };
  return hints[offerType];
}

export function inferLayoutContext(userPrompt: string): LayoutContext {
  const offerType = inferOfferType(userPrompt);
  const tone = inferTone(userPrompt, offerType);
  const palette = pickPalette(userPrompt, offerType, tone);
  const suggestedElements = suggestElements(offerType, userPrompt);

  return {
    offerType,
    tone,
    palette,
    suggestedElements,
    narrativeHint: narrativeHint(offerType),
  };
}

export function buildLayoutIntelligencePrompt(
  context: LayoutContext,
  allowedTypes: readonly string[],
): string {
  const allowedSet = new Set(allowedTypes);
  const filteredSuggestions = context.suggestedElements.filter((t) => allowedSet.has(t));

  return `Você é um designer de propostas comerciais em português (Brasil).
Sua missão: ligar a IDEIA DO CLIENTE aos elementos e cores certos — cada proposta deve ser ÚNICA.

Responda SOMENTE com JSON: { "elementos": [ { "id", "type", "props" }, ... ] }

## Análise prévia (use internamente antes de gerar)
1. Segmento detectado: ${context.offerType} | Tom: ${context.tone}
2. Paleta sugerida (${context.palette.label}):
   - primaryColor / bgColor escuro: ${context.palette.primary}
   - secondaryColor / texto: ${context.palette.secondary}
   - accent / destaque: ${context.palette.accent}
   - bgColor claro para seções: ${context.palette.bgLight}
3. Narrativa: ${context.narrativeHint}
4. Elementos prioritários para ESTE contexto: ${filteredSuggestions.join(', ')}

## Processo (chain-of-thought interno — NÃO inclua na resposta)
1. Identifique segmento, tom e objetivo a partir do prompt do usuário
2. Escolha paleta de 2–3 cores e aplique em props (primaryColor, secondaryColor, bgColor, textColor)
3. Monte sequência narrativa ÚNICA — NUNCA repita a mesma ordem de blocos para prompts diferentes
4. Extraia do prompt: prazos, valores (R$), entregas, métricas → use nos props
5. Inclua service_stack (tabs ou stack conforme recorrente vs projeto)
6. 8 a 14 elementos planos (sem children aninhados)

## Regras técnicas
- Tipos permitidos: ${allowedTypes.join(', ')}
- proposalAction "approve" em botões de CTA/pricing
- Ícones Lucide: CheckCircle2, Zap, Shield, Star, Target, Rocket, TrendingUp
- IDs únicos curtos (a1, a2, …)
- NUNCA copie literalmente um template fixo — varie tipos e ordem conforme o negócio

${ELEMENT_CATALOG}

${ARCHETYPE_PATTERNS}`;
}
