import type { PlanTier } from '../../../lib/featureFlags.js';
import { BUSINESS_ONLY_WIDGETS } from '../../../lib/featureFlags.js';
import type { LayoutContext } from '../../../lib/layoutContext.js';
import { buildCatalogPromptSection } from './elementCatalog.js';

export type { LayoutContext } from '../../../lib/layoutContext.js';
export { inferLayoutContext } from '../../../lib/layoutContext.js';

function filterArchetypeLine(line: string, allowed: Set<string>): string | null {
  const types = line.split('→').pop()?.trim().split(/\s*→\s*/) ?? [];
  const filtered = types.filter((t) => {
    const clean = t.replace(/\(.*\)/, '').trim();
    return allowed.has(clean);
  });
  if (filtered.length < 3) return null;
  return line.split('→')[0] + '→ ' + filtered.join(' → ');
}

function buildArchetypePatterns(allowedTypes: readonly string[]): string {
  const allowed = new Set(allowedTypes);
  const hasMarketing = BUSINESS_ONLY_WIDGETS.some((t) => allowed.has(t));

  const marketing = [
    'CONSULTORIA: marketing_hero → marketing_context → stats → feature_grid → service_stack → timeline → accordion → marketing_pricing → marketing_cta',
    'AGÊNCIA: marketing_hero → marketing_strategy → stats → service_stack → comparison_table → marketing_pricing → icon_list → accordion → marketing_cta',
    'RECORRENTE: marketing_context → icon_list → service_stack → feature_grid → timeline → pricing → accordion → marketing_cta',
    'SAAS/TECH: marketing_hero → marketing_context → feature_grid → stats → comparison_table → pricing → testimonial → marketing_cta',
  ];

  const pro = [
    'CONSULTORIA: heading → paragraph → stats → feature_grid → service_stack → timeline → accordion → pricing → button',
    'AGÊNCIA: heading → stats → feature_grid → service_stack → comparison_table → icon_list → pricing → accordion → button',
    'RECORRENTE: heading → icon_list → service_stack → feature_grid → timeline → pricing → accordion → button',
    'SAAS/TECH: heading → feature_grid → stats → service_stack → comparison_table → pricing → testimonial → button',
  ];

  const lines = (hasMarketing ? marketing : pro)
    .map((l) => filterArchetypeLine(l, allowed))
    .filter((l): l is string => !!l);

  if (lines.length === 0) {
    return 'Monte sequência narrativa única com 8–14 blocos usando apenas os tipos permitidos.';
  }

  return `Padrões de referência (inspiração — adapte ordem e tipos):\n${lines.join('\n')}`;
}

export function buildLayoutIntelligencePrompt(
  context: LayoutContext,
  allowedTypes: readonly string[],
  plan: PlanTier,
): string {
  const allowedSet = new Set(allowedTypes);
  const filteredSuggestions = context.suggestedElements.filter((t) => allowedSet.has(t));
  const catalog = buildCatalogPromptSection(allowedTypes);
  const archetypes = buildArchetypePatterns(allowedTypes);
  const hasMarketing = BUSINESS_ONLY_WIDGETS.some((t) => allowedSet.has(t));

  return `Você é um designer de propostas comerciais em português (Brasil).
Sua missão: ligar a IDEIA DO CLIENTE aos elementos e cores certos — cada proposta deve ser ÚNICA.

Responda SOMENTE com JSON: { "elementos": [ { "id", "type", "props" }, ... ] }

## Análise prévia
1. Segmento: ${context.offerType} | Tom: ${context.tone} | Plano IA: ${plan}${hasMarketing ? ' (blocos marketing premium disponíveis)' : ' (use heading, feature_grid, stats — sem marketing_*)'}
2. Paleta (${context.palette.label}):
   - primaryColor: ${context.palette.primary}
   - secondaryColor: ${context.palette.secondary}
   - accent: ${context.palette.accent}
   - bgColor claro: ${context.palette.bgLight}
3. Narrativa: ${context.narrativeHint}
4. Elementos prioritários: ${filteredSuggestions.join(', ')}

## Processo interno (não inclua na resposta)
1. Responda mentalmente às "perguntas" de cada elemento do catálogo usando o brief do usuário
2. Extraia prazos, valores R$, entregas, métricas → props concretos
3. Para imagens: prefira imageGeneratePrompt (cena descritiva fotorrealista) em marketing_hero, image, card, gallery, slider — nunca invente URLs http; imageSearchQuery só se não houver cena custom
4. Inclua service_stack (mode "stack" se recorrente, senão "tabs")
5. 8 a 14 elementos planos (sem children aninhados, exceto se inevitável)
6. Varie ordem entre gerações — não copie template fixo
7. proposalAction "approve" em CTAs finais e blocos de preço

## Tipos permitidos
${allowedTypes.join(', ')}

${catalog}

${archetypes}`;
}
