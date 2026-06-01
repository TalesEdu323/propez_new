/**
 * Inferência de contexto de layout — compartilhado entre servidor (IA) e cliente (brief).
 */

export type OfferType =
  | 'consultoria'
  | 'agencia'
  | 'recorrente'
  | 'saas'
  | 'evento'
  | 'generico';

export type ToneType = 'corporativo' | 'criativo' | 'premium' | 'tecnico';

export interface LayoutPalette {
  primary: string;
  secondary: string;
  accent: string;
  bgLight: string;
  label: string;
}

export interface LayoutContext {
  offerType: OfferType;
  tone: ToneType;
  palette: LayoutPalette;
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

export const LAYOUT_PALETTES: Record<string, LayoutPalette> = {
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

function pickPalette(prompt: string, offerType: OfferType, tone: ToneType): LayoutPalette {
  const lower = prompt.toLowerCase();
  if (/saúde|saude|clínica|clinica|wellness|nutri/.test(lower)) return LAYOUT_PALETTES.saude;
  if (/financ|juríd|jurid|contáb|contab|advogad/.test(lower)) return LAYOUT_PALETTES.financeiro;
  if (offerType === 'saas' || tone === 'tecnico') return LAYOUT_PALETTES.tech;
  if (offerType === 'agencia' || tone === 'criativo') return LAYOUT_PALETTES.criativo;
  return LAYOUT_PALETTES.b2b;
}

/** Sugestões de elementos conforme plano (Business com marketing_* ou Pro com blocos clássicos). */
export function suggestElementsForPlan(offerType: OfferType, prompt: string, hasMarketing: boolean): string[] {
  const lower = prompt.toLowerCase();
  const base: string[] = ['service_stack'];

  const marketingByOffer: Record<OfferType, string[]> = {
    consultoria: ['marketing_hero', 'marketing_context', 'stats', 'feature_grid', 'timeline', 'accordion', 'pricing', 'marketing_cta'],
    agencia: ['marketing_hero', 'marketing_strategy', 'stats', 'comparison_table', 'marketing_pricing', 'icon_list', 'accordion', 'marketing_cta'],
    recorrente: ['marketing_context', 'icon_list', 'feature_grid', 'timeline', 'pricing', 'accordion', 'marketing_cta'],
    saas: ['marketing_hero', 'marketing_context', 'feature_grid', 'stats', 'comparison_table', 'pricing', 'testimonial', 'marketing_cta'],
    evento: ['marketing_hero', 'marketing_context', 'timeline', 'feature_grid', 'pricing', 'accordion', 'marketing_cta'],
    generico: ['marketing_hero', 'marketing_context', 'feature_grid', 'stats', 'pricing', 'marketing_cta'],
  };

  const proByOffer: Record<OfferType, string[]> = {
    consultoria: ['heading', 'paragraph', 'stats', 'feature_grid', 'timeline', 'accordion', 'pricing', 'button'],
    agencia: ['heading', 'stats', 'feature_grid', 'comparison_table', 'icon_list', 'pricing', 'accordion', 'button'],
    recorrente: ['heading', 'icon_list', 'feature_grid', 'timeline', 'pricing', 'accordion', 'button'],
    saas: ['heading', 'feature_grid', 'stats', 'comparison_table', 'pricing', 'testimonial', 'button'],
    evento: ['heading', 'timeline', 'feature_grid', 'pricing', 'accordion', 'button'],
    generico: ['heading', 'feature_grid', 'stats', 'pricing', 'button'],
  };

  const core = hasMarketing ? marketingByOffer[offerType] : proByOffer[offerType];
  const suggested = [...new Set([...base, ...core])];

  if (/depoimento|cliente disse|testemunho/.test(lower)) suggested.push('testimonial');
  if (/urgente|prazo|limitado|vagas/.test(lower)) suggested.push('countdown');
  if (/roi|projeção|projecao|métrica|metrica/.test(lower) && hasMarketing) {
    suggested.push('metrics_table', 'projection_calculator');
  }
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

export function inferLayoutContext(
  userPrompt: string,
  hasMarketingWidgets = true,
  orgSegment?: OfferType | null,
): LayoutContext {
  const inferred = inferOfferType(userPrompt);
  const offerType = inferred !== 'generico' ? inferred : (orgSegment ?? 'generico');
  const tone = inferTone(userPrompt, offerType);
  const palette = pickPalette(userPrompt, offerType, tone);
  const suggestedElements = suggestElementsForPlan(offerType, userPrompt, hasMarketingWidgets);

  return {
    offerType,
    tone,
    palette,
    suggestedElements,
    narrativeHint: narrativeHint(offerType),
  };
}

/** Rótulos de serviço sintéticos para preview quando ainda não há serviços selecionados. */
export function syntheticServicePreviewLabels(offerType: OfferType, userPrompt: string): string[] {
  const lower = userPrompt.toLowerCase();
  const bulletMatch = userPrompt.match(/(?:^|\n)\s*[-•*]\s*(.+)/gm);
  if (bulletMatch?.length) {
    return bulletMatch.slice(0, 3).map((m) => m.replace(/^\s*[-•*]\s*/, '').trim().slice(0, 60));
  }

  const defaults: Record<OfferType, string[]> = {
    consultoria: ['Diagnóstico e planejamento', 'Execução assistida', 'Acompanhamento e métricas'],
    agencia: ['Gestão de campanhas', 'Criativos e mídia', 'Relatórios de performance'],
    recorrente: ['Suporte mensal', 'Entregas recorrentes', 'SLA e revisões'],
    saas: ['Implantação', 'Licença e suporte', 'Treinamento da equipe'],
    evento: ['Material e logística', 'Facilitação ao vivo', 'Pós-evento'],
    generico: ['Escopo principal', 'Entregáveis', 'Suporte incluso'],
  };

  if (/desenvolvimento|web|site/.test(lower)) {
    return ['Discovery e UX', 'Desenvolvimento', 'Homologação e go-live'];
  }
  return defaults[offerType];
}
