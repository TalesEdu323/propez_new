import type { PlanTier } from '../../../../lib/featureFlags.js';
import { BUSINESS_ONLY_WIDGETS, getIaAllowedWidgets } from '../../../../lib/featureFlags.js';
import {
  inferLayoutContext,
  buildLayoutIntelligencePrompt,
} from '../layoutIntelligence.js';

export function buildLayoutSystemPrompt(
  userPrompt: string,
  plan: PlanTier,
): string {
  const allowed = getIaAllowedWidgets(plan);
  const allowedTypes = [...allowed];
  const hasMarketing = BUSINESS_ONLY_WIDGETS.some((t) => allowed.has(t));
  const context = inferLayoutContext(userPrompt, hasMarketing);
  return buildLayoutIntelligencePrompt(context, allowedTypes, plan);
}

export function buildLayoutUserPrompt(prompt: string, companyName?: string | null): string {
  const companyLine = companyName?.trim()
    ? `\nEmpresa contratada: ${companyName.trim()}`
    : '';

  return `Com base na descrição abaixo, crie um layout de proposta ÚNICO — escolha elementos e cores que façam sentido para este negócio. Extraia prazos, valores e entregas mencionados. Preencha todos os textos com conteúdo real derivado do brief (não deixe placeholders genéricos).${companyLine}

Descrição:
${prompt.trim()}`;
}
