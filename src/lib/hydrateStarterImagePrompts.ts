import type { BuilderElement } from '../types/builder';
import { buildImagePrompt, suggestGlobalImagePrompt } from './buildImagePrompt';

export const AUTO_IMAGE_PROMPT = '__auto__';

export interface HydrateStarterImagePromptsOptions {
  modelName?: string;
  serviceNames?: string[];
  brief?: string;
  globalPrompt?: string;
}

function promptForSlot(
  options: HydrateStarterImagePromptsOptions,
  slotLabel: string,
  elementHint?: string,
  slotPrompt?: string,
): string {
  return buildImagePrompt({
    modelName: options.modelName,
    serviceNames: options.serviceNames,
    brief: options.brief,
    globalPrompt: options.globalPrompt ?? suggestGlobalImagePrompt(options.modelName, options.serviceNames, options.brief),
    slotPrompt,
    slotLabel,
    elementHint,
  });
}

function needsHydration(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  return t === AUTO_IMAGE_PROMPT || t === 'auto' || t === 'pending';
}

function walk(list: BuilderElement[], options: HydrateStarterImagePromptsOptions): BuilderElement[] {
  return list.map((el) => {
    const props = { ...(el.props ?? {}) } as Record<string, unknown>;
    const elementHint = String(props.title ?? props.text ?? props.badge ?? '').trim() || undefined;

    if (el.type === 'marketing_hero' && needsHydration(props.imageGeneratePrompt)) {
      props.imageGeneratePrompt = promptForSlot(options, 'Banner do hero', elementHint);
    }
    if (el.type === 'image' && needsHydration(props.imageGeneratePrompt)) {
      props.imageGeneratePrompt = promptForSlot(options, 'Imagem', elementHint);
    }
    if (el.type === 'card' && needsHydration(props.imageGeneratePrompt)) {
      props.imageGeneratePrompt = promptForSlot(options, 'Imagem do card', elementHint);
    }
    if (
      (el.type === 'testimonial' || el.type === 'toast_notification') &&
      needsHydration(props.imageGeneratePrompt)
    ) {
      props.imageGeneratePrompt = `professional portrait, ${promptForSlot(options, 'Avatar', elementHint)}`;
    }

    if (Array.isArray(props.images)) {
      props.images = (props.images as unknown[]).map((item, i) => {
        if (typeof item === 'object' && item && 'imageGeneratePrompt' in item) {
          const q = String((item as { imageGeneratePrompt: string }).imageGeneratePrompt);
          if (!needsHydration(q)) return item;
          const base = promptForSlot(options, `Galeria ${i + 1}`, elementHint);
          return { imageGeneratePrompt: `${base}, variation ${i + 1}` };
        }
        if (typeof item === 'string' && needsHydration(item)) {
          const base = promptForSlot(options, `Galeria ${i + 1}`, elementHint);
          return { imageGeneratePrompt: `${base}, variation ${i + 1}` };
        }
        return item;
      });
    }

    const children = el.children?.length ? walk(el.children, options) : el.children;
    return { ...el, props, children };
  });
}

/** Preenche imageGeneratePrompt nos slots marcados com AUTO_IMAGE_PROMPT. */
export function hydrateStarterImagePrompts(
  elementos: BuilderElement[],
  options: HydrateStarterImagePromptsOptions,
): BuilderElement[] {
  return walk(elementos, options);
}
