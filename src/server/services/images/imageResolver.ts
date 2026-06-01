import type { BuilderElementType } from '../../../types/builder.js';
import type { OfferType } from '../../../lib/layoutContext.js';
import { searchPhoto } from './unsplashResolver.js';
import {
  buildPollinationsImageUrl,
  getDefaultSlotForElementType,
  type ImageSlot,
} from './pollinationsImageGenerator.js';
import { getSlotForElement } from './imageSlotCatalog.js';

export type LayoutImageMode = 'stock' | 'generate';

export function getLayoutImageMode(): LayoutImageMode {
  const mode = process.env.IA_LAYOUT_IMAGE_MODE?.trim().toLowerCase();
  return mode === 'generate' ? 'generate' : 'stock';
}

export interface ImageResolveContext {
  offerType: OfferType;
  layoutMode?: LayoutImageMode;
  organizationLogoUrl?: string | null;
  elementType?: BuilderElementType;
}

function resolveSlot(elementType?: BuilderElementType, propKey?: string): ImageSlot {
  if (elementType && propKey) {
    const mapped = getSlotForElement(elementType, propKey);
    if (mapped) return mapped;
  }
  if (elementType) return getDefaultSlotForElementType(elementType);
  return 'inline';
}

export function resolveGeneratePrompt(
  prompt: string,
  ctx: ImageResolveContext,
  slot?: ImageSlot,
): string {
  const effectiveSlot = slot ?? resolveSlot(ctx.elementType);
  return buildPollinationsImageUrl({
    prompt,
    offerType: ctx.offerType,
    slot: effectiveSlot,
  }).url;
}

export async function resolveStockQuery(
  query: string,
  offerType: OfferType,
): Promise<string> {
  return searchPhoto(query, offerType);
}

const IMAGE_PROP_KEYS = ['url', 'imageUrl', 'avatarUrl', 'logoUrl', 'backgroundImageUrl'] as const;

function applyResolvedUrl(
  out: Record<string, unknown>,
  resolvedUrl: string,
  elementType?: BuilderElementType,
): void {
  if (elementType === 'marketing_hero') {
    if (!out.backgroundImageUrl || out.backgroundImageUrl === '') {
      out.backgroundImageUrl = resolvedUrl;
    }
    return;
  }
  for (const key of IMAGE_PROP_KEYS) {
    if (key === 'backgroundImageUrl') continue;
    if (!out[key] || out[key] === '') {
      out[key] = resolvedUrl;
    }
  }
}

/**
 * Resolve imageSearchQuery / imageGeneratePrompt em props do elemento.
 */
export async function resolveElementImages(
  props: Record<string, unknown>,
  ctx: ImageResolveContext,
): Promise<Record<string, unknown>> {
  const out = { ...props };
  const mode = ctx.layoutMode ?? getLayoutImageMode();
  const elementType = ctx.elementType;

  if (elementType === 'marketing_hero' && ctx.organizationLogoUrl && !out.logoUrl) {
    out.logoUrl = ctx.organizationLogoUrl;
  }

  const generatePrompt =
    typeof out.imageGeneratePrompt === 'string' ? out.imageGeneratePrompt.trim() : '';
  const searchQuery =
    typeof out.imageSearchQuery === 'string' ? out.imageSearchQuery.trim() : '';

  let resolvedUrl: string | null = null;
  const heroSlot = elementType === 'marketing_hero' ? 'hero_banner' : undefined;

  if (generatePrompt && mode === 'generate') {
    resolvedUrl = resolveGeneratePrompt(generatePrompt, ctx, heroSlot);
    delete out.imageGeneratePrompt;
  } else if (searchQuery) {
    resolvedUrl = await resolveStockQuery(searchQuery, ctx.offerType);
    delete out.imageSearchQuery;
  } else if (generatePrompt) {
    resolvedUrl = await resolveStockQuery(generatePrompt, ctx.offerType);
    delete out.imageGeneratePrompt;
  }

  if (resolvedUrl) {
    applyResolvedUrl(out, resolvedUrl, elementType);
  }

  for (const key of IMAGE_PROP_KEYS) {
    if (out[key] === '' || out[key] == null) {
      delete out[key];
    }
  }

  const carouselSlot: ImageSlot =
    elementType === 'slider' || elementType === 'image_carousel' ? 'carousel' : 'gallery';

  if (Array.isArray(out.images)) {
    const imgs = out.images as unknown[];
    const resolvedImages: string[] = [];
    for (let i = 0; i < imgs.length; i++) {
      const item = imgs[i];
      if (typeof item === 'string' && item.startsWith('http')) {
        resolvedImages.push(item);
      } else if (typeof item === 'object' && item && 'imageGeneratePrompt' in item) {
        const q = String((item as { imageGeneratePrompt: string }).imageGeneratePrompt);
        resolvedImages.push(
          mode === 'generate'
            ? resolveGeneratePrompt(q, ctx, carouselSlot)
            : await resolveStockQuery(q, ctx.offerType),
        );
      } else if (typeof item === 'object' && item && 'imageSearchQuery' in item) {
        const q = String((item as { imageSearchQuery: string }).imageSearchQuery);
        resolvedImages.push(await resolveStockQuery(q, ctx.offerType));
      } else if (typeof item === 'object' && item && 'image' in item) {
        const slide = item as {
          image?: string;
          imageSearchQuery?: string;
          imageGeneratePrompt?: string;
        };
        if (slide.image?.startsWith('http') || slide.image?.startsWith('/api/')) {
          resolvedImages.push(slide.image);
        } else if (slide.imageGeneratePrompt && mode === 'generate') {
          resolvedImages.push(resolveGeneratePrompt(slide.imageGeneratePrompt, ctx, carouselSlot));
        } else if (slide.imageSearchQuery) {
          resolvedImages.push(await resolveStockQuery(slide.imageSearchQuery, ctx.offerType));
        } else if (slide.imageGeneratePrompt) {
          resolvedImages.push(await resolveStockQuery(slide.imageGeneratePrompt, ctx.offerType));
        }
      } else if (typeof item === 'string' && item.length > 2 && !item.startsWith('http')) {
        resolvedImages.push(await resolveStockQuery(item, ctx.offerType));
      }
    }
    if (resolvedImages.length > 0) {
      out.images = resolvedImages;
    }
  }

  if (Array.isArray(out.slides)) {
    out.slides = await Promise.all(
      (out.slides as Record<string, unknown>[]).map(async (slide) => {
        const s = { ...slide };
        if (typeof s.imageGeneratePrompt === 'string' && mode === 'generate') {
          s.image = resolveGeneratePrompt(String(s.imageGeneratePrompt), ctx, 'carousel');
          delete s.imageGeneratePrompt;
        } else if (typeof s.imageSearchQuery === 'string') {
          s.image = await resolveStockQuery(String(s.imageSearchQuery), ctx.offerType);
          delete s.imageSearchQuery;
        } else if (typeof s.imageGeneratePrompt === 'string') {
          s.image = await resolveStockQuery(String(s.imageGeneratePrompt), ctx.offerType);
          delete s.imageGeneratePrompt;
        } else if (!s.image || s.image === '') {
          s.image = await resolveStockQuery(String(s.title ?? 'business'), ctx.offerType);
        }
        return s;
      }),
    );
  }

  if (Array.isArray(out.features)) {
    out.features = await Promise.all(
      (out.features as Record<string, unknown>[]).map(async (f, i) => {
        const feat = { ...f };
        if (typeof feat.imageGeneratePrompt === 'string' && mode === 'generate') {
          feat.image = resolveGeneratePrompt(String(feat.imageGeneratePrompt), ctx, 'inline');
          delete feat.imageGeneratePrompt;
        } else if (typeof feat.imageSearchQuery === 'string') {
          feat.image = await resolveStockQuery(String(feat.imageSearchQuery), ctx.offerType);
          delete feat.imageSearchQuery;
        } else if (feat.image === '' || feat.image == null) {
          const { getFallbackImageUrl } = await import('./unsplashResolver.js');
          feat.image = getFallbackImageUrl(ctx.offerType, i);
        }
        return feat;
      }),
    );
  }

  return out;
}

export { searchPhoto, getFallbackImageUrl } from './unsplashResolver.js';
