import {
  inferLayoutContext,
  buildLayoutIntelligencePrompt,
} from '../layoutIntelligence.js';

export function buildLayoutSystemPrompt(
  userPrompt: string,
  allowedTypes: readonly string[],
): string {
  const context = inferLayoutContext(userPrompt);
  return buildLayoutIntelligencePrompt(context, allowedTypes);
}

export function buildLayoutUserPrompt(prompt: string): string {
  return `Com base na descrição abaixo, crie um layout de proposta ÚNICO — escolha elementos e cores que façam sentido para este negócio específico. Extraia prazos, valores e entregas mencionados.

Descrição do cliente:
${prompt.trim()}`;
}
