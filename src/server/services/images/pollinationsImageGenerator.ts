import type { OfferType } from '../../../lib/layoutContext.js';
import {
  buildSlotPrompt,
  getDefaultSlotForElementType,
  getSlotDimensions,
  type ImageSlot,
} from './imageSlotCatalog.js';

const BASE_SUFFIX =
  ', professional corporate photography, hyper-realistic, highly detailed, 8k resolution, cinematic lighting, photorealistic, award-winning photo, shot on 35mm lens, realistic skin texture, no drawing, no cartoon';

const NICHE_SUFFIX: Record<OfferType, string> = {
  consultoria: ', business executive style, modern boardroom, corporate team meeting',
  saas: ', modern tech office, SaaS dashboard on screen, software team collaboration',
  agencia: ', creative agency studio, marketing team at work, vibrant professional workspace',
  recorrente: ', customer success team, professional support environment, ongoing partnership',
  evento: ', professional conference, corporate event venue, keynote presentation',
  generico: '',
};

export interface PollinationsImageInput {
  prompt: string;
  offerType?: OfferType;
  slot?: ImageSlot;
  width?: number;
  height?: number;
  seed?: number;
}

export interface PollinationsImageResult {
  url: string;
  width: number;
  height: number;
  seed: number;
}

function clampDim(value: number | undefined, fallback: number): number {
  const n = value ?? fallback;
  return Math.min(1920, Math.max(400, n));
}

function getDefaultWidth(): number {
  const env = Number(process.env.POLLINATIONS_IMAGE_WIDTH);
  return Number.isFinite(env) && env > 0 ? clampDim(env, 1024) : 1024;
}

function getDefaultHeight(): number {
  const env = Number(process.env.POLLINATIONS_IMAGE_HEIGHT);
  return Number.isFinite(env) && env > 0 ? clampDim(env, 768) : 768;
}

export function buildRealismPrompt(
  prompt: string,
  offerType: OfferType = 'generico',
  slot?: ImageSlot,
): string {
  const niche = NICHE_SUFFIX[offerType] ?? '';
  const withSlot = slot ? buildSlotPrompt(prompt, slot, offerType) : prompt.trim();
  return `${withSlot}${niche}${BASE_SUFFIX}`;
}

export function buildPollinationsImageUrl(input: PollinationsImageInput): PollinationsImageResult {
  const slotDims = input.slot ? getSlotDimensions(input.slot) : null;
  const width = clampDim(input.width ?? slotDims?.width, getDefaultWidth());
  const height = clampDim(input.height ?? slotDims?.height, getDefaultHeight());
  const seed = input.seed ?? Math.floor(Math.random() * 1_000_000);
  const fullPrompt = buildRealismPrompt(input.prompt, input.offerType ?? 'generico', input.slot);

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model: 'flux',
    nologo: 'true',
    seed: String(seed),
  });

  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
  if (apiKey) params.set('key', apiKey);

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?${params.toString()}`;

  return { url, width, height, seed };
}

export { getDefaultSlotForElementType, type ImageSlot } from './imageSlotCatalog.js';
