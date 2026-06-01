import type { BuilderElementType } from '../../../types/builder.js';
import type { OfferType } from '../../../lib/layoutContext.js';

export type ImageSlot =
  | 'hero_banner'
  | 'card'
  | 'inline'
  | 'avatar'
  | 'gallery'
  | 'carousel';

export interface SlotDimensions {
  width: number;
  height: number;
}

const SLOT_DIMENSIONS: Record<ImageSlot, SlotDimensions> = {
  hero_banner: { width: 1920, height: 600 },
  card: { width: 1200, height: 800 },
  inline: { width: 1024, height: 768 },
  avatar: { width: 512, height: 512 },
  gallery: { width: 800, height: 800 },
  carousel: { width: 1280, height: 400 },
};

const ELEMENT_PROP_SLOTS: Partial<Record<BuilderElementType, Record<string, ImageSlot>>> = {
  marketing_hero: { backgroundImageUrl: 'hero_banner' },
  image: { url: 'inline' },
  card: { imageUrl: 'card' },
  testimonial: { avatarUrl: 'avatar' },
  toast_notification: { avatarUrl: 'avatar' },
  gallery: { images: 'gallery' },
  image_carousel: { images: 'carousel' },
  slider: { slides: 'carousel' },
};

const SLOT_PROMPT_HINT: Record<ImageSlot, string> = {
  hero_banner: ', wide cinematic banner, negative space for text overlay, professional cover photo',
  card: ', landscape card image, clean composition',
  inline: ', editorial photo, balanced composition',
  avatar: ', professional headshot portrait, neutral background, square crop',
  gallery: ', high quality stock photo, square composition',
  carousel: ', wide horizontal banner strip, panoramic professional photo',
};

export function getSlotDimensions(slot: ImageSlot): SlotDimensions {
  return SLOT_DIMENSIONS[slot];
}

export function getSlotForElement(
  elementType: BuilderElementType,
  propKey: string,
): ImageSlot | null {
  const map = ELEMENT_PROP_SLOTS[elementType];
  if (!map) return null;
  return map[propKey] ?? null;
}

export function buildSlotPrompt(
  basePrompt: string,
  slot: ImageSlot,
  _offerType?: OfferType,
): string {
  const hint = SLOT_PROMPT_HINT[slot] ?? '';
  return `${basePrompt.trim()}${hint}`;
}

export function getDefaultSlotForElementType(elementType: BuilderElementType): ImageSlot {
  if (elementType === 'marketing_hero') return 'hero_banner';
  if (elementType === 'card') return 'card';
  if (elementType === 'testimonial' || elementType === 'toast_notification') return 'avatar';
  if (elementType === 'gallery') return 'gallery';
  if (elementType === 'slider' || elementType === 'image_carousel') return 'carousel';
  return 'inline';
}
