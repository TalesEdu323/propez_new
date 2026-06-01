import type { OfferType } from '../../../lib/layoutContext.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { url: string; expires: number }>();

const FALLBACK_BY_OFFER: Record<OfferType, string[]> = {
  consultoria: [
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop',
  ],
  agencia: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
  ],
  recorrente: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1200&auto=format&fit=crop',
  ],
  saas: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
  ],
  evento: [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505373877841-8d25f39c4662?q=80&w=1200&auto=format&fit=crop',
  ],
  generico: [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop',
  ],
};

const DEFAULT_FALLBACK =
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop';

function cacheKey(query: string): string {
  return query.trim().toLowerCase();
}

function getCached(query: string): string | null {
  const hit = cache.get(cacheKey(query));
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(cacheKey(query));
    return null;
  }
  return hit.url;
}

function setCache(query: string, url: string): void {
  cache.set(cacheKey(query), { url, expires: Date.now() + CACHE_TTL_MS });
}

export function getFallbackImageUrl(offerType: OfferType, index = 0): string {
  const list = FALLBACK_BY_OFFER[offerType] ?? FALLBACK_BY_OFFER.generico;
  return list[index % list.length] ?? DEFAULT_FALLBACK;
}

export async function searchPhoto(query: string, offerType: OfferType = 'generico'): Promise<string> {
  const q = query.trim();
  if (!q) return getFallbackImageUrl(offerType);

  const cached = getCached(q);
  if (cached) return cached;

  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) {
    return getFallbackImageUrl(offerType, q.length % 3);
  }

  try {
    const params = new URLSearchParams({
      query: q.slice(0, 80),
      per_page: '1',
      orientation: 'landscape',
    });
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${key}` },
    });
    if (!res.ok) return getFallbackImageUrl(offerType);
    const data = (await res.json()) as {
      results?: { urls?: { regular?: string } }[];
    };
    const url = data.results?.[0]?.urls?.regular;
    if (!url) return getFallbackImageUrl(offerType);
    setCache(q, url);
    return url;
  } catch {
    return getFallbackImageUrl(offerType);
  }
}

const IMAGE_PROP_KEYS = ['url', 'imageUrl', 'avatarUrl', 'logoUrl'] as const;

/**
 * Resolve imageSearchQuery → URLs em props do elemento (mutação em cópia).
 */
export async function resolveElementImages(
  props: Record<string, unknown>,
  offerType: OfferType,
): Promise<Record<string, unknown>> {
  const out = { ...props };

  const searchQuery = typeof out.imageSearchQuery === 'string' ? out.imageSearchQuery.trim() : '';
  if (searchQuery) {
    const resolved = await searchPhoto(searchQuery, offerType);
    for (const key of IMAGE_PROP_KEYS) {
      if (!out[key] || out[key] === '') {
        out[key] = resolved;
      }
    }
    delete out.imageSearchQuery;
  }

  for (const key of IMAGE_PROP_KEYS) {
    if (out[key] === '' || out[key] == null) {
      delete out[key];
    }
  }

  if (Array.isArray(out.images)) {
    const imgs = out.images as unknown[];
    const resolvedImages: string[] = [];
    for (let i = 0; i < imgs.length; i++) {
      const item = imgs[i];
      if (typeof item === 'string' && item.startsWith('http')) {
        resolvedImages.push(item);
      } else if (typeof item === 'object' && item && 'imageSearchQuery' in item) {
        const q = String((item as { imageSearchQuery: string }).imageSearchQuery);
        resolvedImages.push(await searchPhoto(q, offerType));
      } else if (typeof item === 'object' && item && 'image' in item) {
        const slide = item as { image?: string; imageSearchQuery?: string };
        if (slide.image?.startsWith('http')) {
          resolvedImages.push(slide.image);
        } else if (slide.imageSearchQuery) {
          resolvedImages.push(await searchPhoto(slide.imageSearchQuery, offerType));
        }
      } else if (typeof item === 'string' && item.length > 2 && !item.startsWith('http')) {
        resolvedImages.push(await searchPhoto(item, offerType));
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
        if (typeof s.imageSearchQuery === 'string') {
          s.image = await searchPhoto(s.imageSearchQuery, offerType);
          delete s.imageSearchQuery;
        } else if (!s.image || s.image === '') {
          s.image = await searchPhoto(String(s.title ?? 'business'), offerType);
        }
        return s;
      }),
    );
  }

  if (Array.isArray(out.features)) {
    out.features = await Promise.all(
      (out.features as Record<string, unknown>[]).map(async (f, i) => {
        const feat = { ...f };
        if (typeof feat.imageSearchQuery === 'string') {
          feat.image = await searchPhoto(feat.imageSearchQuery, offerType);
          delete feat.imageSearchQuery;
        } else if (feat.image === '' || feat.image == null) {
          feat.image = getFallbackImageUrl(offerType, i);
        }
        return feat;
      }),
    );
  }

  return out;
}
