import type { BuilderElement } from '../types/builder';

function hasPromptInProps(props: Record<string, unknown>): boolean {
  if (typeof props.imageGeneratePrompt === 'string' && props.imageGeneratePrompt.trim()) {
    return true;
  }
  if (Array.isArray(props.images)) {
    for (const item of props.images) {
      if (
        typeof item === 'object' &&
        item &&
        'imageGeneratePrompt' in item &&
        String((item as { imageGeneratePrompt: string }).imageGeneratePrompt).trim()
      ) {
        return true;
      }
    }
  }
  if (Array.isArray(props.slides)) {
    for (const slide of props.slides) {
      if (
        typeof slide === 'object' &&
        slide &&
        'imageGeneratePrompt' in slide &&
        String((slide as { imageGeneratePrompt: string }).imageGeneratePrompt).trim()
      ) {
        return true;
      }
    }
  }
  if (Array.isArray(props.features)) {
    for (const feat of props.features) {
      if (
        typeof feat === 'object' &&
        feat &&
        'imageGeneratePrompt' in feat &&
        String((feat as { imageGeneratePrompt: string }).imageGeneratePrompt).trim()
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Verifica se algum elemento ainda tem prompts de imagem não resolvidos. */
export function hasUnresolvedImagePrompts(list: BuilderElement[]): boolean {
  for (const el of list) {
    const props = (el.props ?? {}) as Record<string, unknown>;
    if (hasPromptInProps(props)) return true;
    if (el.children?.length && hasUnresolvedImagePrompts(el.children)) return true;
  }
  return false;
}
