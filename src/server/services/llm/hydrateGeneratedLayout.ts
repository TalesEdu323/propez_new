import type { Pool } from 'pg';
import type { BuilderElement, BuilderElementType, BuilderPageLayout } from '../../../types/builder.js';
import {
  syntheticServicePreviewLabels,
  type LayoutContext,
  type OfferType,
} from '../../../lib/layoutContext.js';
import { createId } from '../../../lib/ids.js';
import { DEFAULT_PROPS } from '../../builder/defaultPropsServer.js';
import {
  getLayoutImageMode,
  resolveElementImages,
  type ImageResolveContext,
  type LayoutImageMode,
} from '../images/imageResolver.js';

export interface HydrateLayoutOptions {
  userPrompt: string;
  context: LayoutContext;
  allowed: ReadonlySet<BuilderElementType>;
  organizationId?: string;
  pool?: Pool;
  imageMode?: LayoutImageMode;
  organizationLogoUrl?: string | null;
}

function deepMergeProps(
  type: BuilderElementType,
  aiProps: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = DEFAULT_PROPS[type] ?? {};
  const merged = { ...defaults, ...aiProps };

  if (Array.isArray(defaults.items) && Array.isArray(aiProps.items) && aiProps.items.length > 0) {
    merged.items = aiProps.items;
  }
  if (Array.isArray(defaults.features) && Array.isArray(aiProps.features) && aiProps.features.length > 0) {
    merged.features = aiProps.features;
  }
  if (Array.isArray(defaults.steps) && Array.isArray(aiProps.steps) && aiProps.steps.length > 0) {
    merged.steps = aiProps.steps;
  }
  if (Array.isArray(defaults.tabs) && Array.isArray(aiProps.tabs) && aiProps.tabs.length > 0) {
    merged.tabs = aiProps.tabs;
  }
  if (Array.isArray(defaults.services) && Array.isArray(aiProps.services) && aiProps.services.length > 0) {
    merged.services = aiProps.services;
  }

  return merged;
}

function applyPaletteToProps(
  type: BuilderElementType,
  props: Record<string, unknown>,
  context: LayoutContext,
): Record<string, unknown> {
  const { palette } = context;
  const out = { ...props };

  if (type.startsWith('marketing_')) {
    if (!out.primaryColor) out.primaryColor = palette.primary;
    if (!out.secondaryColor) out.secondaryColor = palette.secondary;
    if (!out.bgColor && type !== 'marketing_hero') out.bgColor = palette.bgLight;
  }

  if (type === 'pricing' || type === 'button') {
    if (!out.buttonColor && !out.bgColor) out.buttonColor = palette.primary;
    if (type === 'button' && !out.bgColor) out.bgColor = palette.primary;
  }

  if (type === 'heading' && !out.color) out.color = palette.secondary;
  if (type === 'paragraph' && !out.color) out.color = '#52525b';
  if (type === 'stats' && !out.bgColor) out.bgColor = palette.bgLight;
  if (type === 'feature_grid' && !out.bgColor) out.bgColor = palette.bgLight;
  if (type === 'timeline' && !out.color) out.color = palette.accent;

  return out;
}

function findCtaIndex(elementos: BuilderElement[]): number {
  return elementos.findIndex(
    (el) =>
      el.type === 'marketing_cta' ||
      (el.type === 'button' && el.props?.proposalAction === 'approve') ||
      el.type === 'pricing' ||
      el.type === 'marketing_pricing',
  );
}

function ensureServiceStack(
  elementos: BuilderElement[],
  context: LayoutContext,
  userPrompt: string,
): BuilderElement[] {
  const previewLabels = syntheticServicePreviewLabels(context.offerType, userPrompt);

  if (elementos.some((el) => el.type === 'service_stack')) {
    return elementos.map((el) => {
      if (el.type !== 'service_stack') return el;
      const mode = context.offerType === 'recorrente' ? 'stack' : 'tabs';
      return {
        ...el,
        props: {
          ...DEFAULT_PROPS.service_stack,
          ...el.props,
          mode: el.props?.mode ?? mode,
          previewLabels: (el.props?.previewLabels as string[] | undefined) ?? previewLabels,
        },
      };
    });
  }

  const mode = context.offerType === 'recorrente' ? 'stack' : 'tabs';
  const stackEl: BuilderElement = {
    id: createId(),
    type: 'service_stack',
    props: {
      ...DEFAULT_PROPS.service_stack,
      mode,
      title: 'Serviços incluídos',
      hint: 'No passo 1, selecione os serviços para preencher esta área automaticamente.',
      previewLabels,
    },
  };

  const ctaIdx = findCtaIndex(elementos);
  if (ctaIdx >= 0) {
    return [...elementos.slice(0, ctaIdx), stackEl, ...elementos.slice(ctaIdx)];
  }
  return [...elementos, stackEl];
}

async function hydrateElement(
  el: BuilderElement,
  context: LayoutContext,
  imageCtx: ImageResolveContext,
): Promise<BuilderElement> {
  let props = deepMergeProps(el.type, (el.props ?? {}) as Record<string, unknown>);
  props = applyPaletteToProps(el.type, props, context);
  props = await resolveElementImages(props, { ...imageCtx, elementType: el.type });

  const children = el.children
    ? await Promise.all(el.children.map((c) => hydrateElement(c, context, imageCtx)))
    : undefined;

  return {
    ...el,
    props,
    ...(children && children.length > 0 ? { children } : {}),
  };
}

function buildImageCtx(options: HydrateLayoutOptions): ImageResolveContext {
  return {
    offerType: options.context.offerType,
    layoutMode: options.imageMode ?? getLayoutImageMode(),
    organizationLogoUrl: options.organizationLogoUrl,
  };
}

export async function hydrateGeneratedLayout(
  elementos: BuilderElement[],
  options: HydrateLayoutOptions,
): Promise<BuilderElement[]> {
  const imageCtx = buildImageCtx(options);
  let list = ensureServiceStack(elementos, options.context, options.userPrompt);
  list = await Promise.all(list.map((el) => hydrateElement(el, options.context, imageCtx)));
  return list;
}

/** Re-hidrata apenas imagens (sem service_stack / paleta). */
export async function rehydrateModelImages(
  elementos: BuilderElement[],
  options: {
    offerType: OfferType;
    imageMode?: LayoutImageMode;
    organizationLogoUrl?: string | null;
    brief?: string;
    regenerate?: 'all' | string[];
  },
): Promise<BuilderElement[]> {
  const prepared = prepareRegenerate(elementos, options.regenerate, options.brief);
  const imageCtx: ImageResolveContext = {
    offerType: options.offerType,
    layoutMode: options.imageMode ?? 'generate',
    organizationLogoUrl: options.organizationLogoUrl,
  };

  async function walk(el: BuilderElement): Promise<BuilderElement> {
    let props = { ...(el.props ?? {}) } as Record<string, unknown>;
    props = await resolveElementImages(props, { ...imageCtx, elementType: el.type });
    const children = el.children
      ? await Promise.all(el.children.map((c) => walk(c)))
      : undefined;
    return { ...el, props, ...(children?.length ? { children } : {}) };
  }

  return Promise.all(prepared.map(walk));
}

function prepareRegenerate(
  elementos: BuilderElement[],
  regenerate: 'all' | string[] | undefined,
  brief?: string,
): BuilderElement[] {
  const regenerateAll = regenerate === 'all';
  const keys = Array.isArray(regenerate) ? new Set(regenerate) : null;
  if (!regenerateAll && (!keys || keys.size === 0)) return elementos;

  function shouldRegenerate(slotKey: string): boolean {
    if (regenerateAll) return true;
    return keys!.has(slotKey);
  }

  function walk(list: BuilderElement[]): BuilderElement[] {
    return list.map((el) => {
      const props = { ...(el.props ?? {}) } as Record<string, unknown>;
      const fallbackPrompt =
        brief?.trim() ||
        String(props.title ?? props.text ?? props.badge ?? 'professional business scene');

      if (shouldRegenerate(`${el.id}:backgroundImageUrl`) && el.type === 'marketing_hero') {
        delete props.backgroundImageUrl;
        props.imageGeneratePrompt = fallbackPrompt;
      }
      if (shouldRegenerate(`${el.id}:url`) && el.type === 'image') {
        delete props.url;
        props.imageGeneratePrompt = fallbackPrompt;
      }
      if (shouldRegenerate(`${el.id}:imageUrl`) && el.type === 'card') {
        delete props.imageUrl;
        props.imageGeneratePrompt = fallbackPrompt;
      }
      if (
        shouldRegenerate(`${el.id}:avatarUrl`) &&
        (el.type === 'testimonial' || el.type === 'toast_notification')
      ) {
        delete props.avatarUrl;
        props.imageGeneratePrompt = `professional portrait, ${fallbackPrompt}`;
      }

      if (Array.isArray(props.images)) {
        props.images = (props.images as unknown[]).map((item, i) => {
          if (!shouldRegenerate(`${el.id}:images:${i}`)) return item;
          return { imageGeneratePrompt: `${fallbackPrompt}, variation ${i + 1}` };
        });
      }

      if (Array.isArray(props.slides)) {
        props.slides = (props.slides as Record<string, unknown>[]).map((slide, i) => {
          if (!shouldRegenerate(`${el.id}:slideImage:${i}`)) return slide;
          return {
            ...slide,
            image: undefined,
            imageGeneratePrompt: String(slide.title ?? fallbackPrompt),
          };
        });
      }

      const children = el.children?.length ? walk(el.children) : el.children;
      return { ...el, props, children };
    });
  }

  return walk(elementos);
}

export function inferPageLayoutFromContext(context: LayoutContext): BuilderPageLayout {
  const { palette, offerType, tone } = context;
  const themePreset =
    offerType === 'agencia' || tone === 'criativo'
      ? 'creative'
      : offerType === 'saas'
        ? 'tech'
        : 'professional';

  return {
    widthMode: 'boxed',
    horizontalPadding: 60,
    themePreset,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    backgroundColor: palette.bgLight,
    textColor: palette.secondary,
  };
}
