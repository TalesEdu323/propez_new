export interface BuildImagePromptInput {
  modelName?: string;
  serviceNames?: string[];
  brief?: string;
  globalPrompt?: string;
  slotPrompt?: string;
  slotLabel?: string;
  elementHint?: string;
}

const DEFAULT_SCENE = 'professional business scene';

function buildContextPrompt(input: BuildImagePromptInput): string {
  const parts: string[] = [];

  const brief = input.brief?.trim();
  if (brief) parts.push(brief);

  const modelName = input.modelName?.trim();
  if (modelName) parts.push(`proposal model: ${modelName}`);

  const services = (input.serviceNames ?? []).map((s) => s.trim()).filter(Boolean);
  if (services.length > 0) parts.push(`services: ${services.join(', ')}`);

  const hint = input.elementHint?.trim();
  if (hint) parts.push(hint);

  const slotLabel = input.slotLabel?.trim();
  if (slotLabel) parts.push(slotLabel);

  return parts.join(', ') || DEFAULT_SCENE;
}

/**
 * Monta o texto base enviado ao Pollinations.
 * Prioridade: slotPrompt > globalPrompt > contexto (brief + modelo + serviços + hint).
 */
export function buildImagePrompt(input: BuildImagePromptInput): string {
  const slotPrompt = input.slotPrompt?.trim();
  if (slotPrompt) return slotPrompt;

  const globalPrompt = input.globalPrompt?.trim();
  if (globalPrompt) return globalPrompt;

  return buildContextPrompt(input);
}

/** Sugestão de placeholder para o campo global no wizard. */
export function suggestGlobalImagePrompt(
  modelName?: string,
  serviceNames?: string[],
  brief?: string,
): string {
  if (brief?.trim()) return brief.trim();
  const parts: string[] = [];
  const name = modelName?.trim();
  if (name) parts.push(name);
  const services = (serviceNames ?? []).map((s) => s.trim()).filter(Boolean);
  if (services.length > 0) parts.push(`serviços: ${services.join(', ')}`);
  return parts.join(', ');
}
