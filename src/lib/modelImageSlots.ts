import type { BuilderElement } from '../types/builder';

export interface ModelImageSlot {
  slotKey: string;
  elementId: string;
  elementType: string;
  propKey: string;
  label: string;
  url: string;
  arrayIndex?: number;
}

const IMAGE_PROPS: Record<string, { prop: string; label: string }[]> = {
  marketing_hero: [{ prop: 'backgroundImageUrl', label: 'Banner do hero' }],
  image: [{ prop: 'url', label: 'Imagem' }],
  card: [{ prop: 'imageUrl', label: 'Imagem do card' }],
  testimonial: [{ prop: 'avatarUrl', label: 'Avatar do depoimento' }],
  toast_notification: [{ prop: 'avatarUrl', label: 'Avatar' }],
  gallery: [{ prop: 'images', label: 'Galeria' }],
  image_carousel: [{ prop: 'images', label: 'Carrossel' }],
  slider: [{ prop: 'slides', label: 'Slider' }],
};

function isImageUrl(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith('http') || value.startsWith('https'));
}

function walkElements(
  elementos: BuilderElement[],
  out: ModelImageSlot[],
): void {
  for (const el of elementos) {
    const defs = IMAGE_PROPS[el.type];
    if (defs) {
      for (const { prop, label } of defs) {
        const val = el.props?.[prop];
        if (prop === 'images' && Array.isArray(val)) {
          val.forEach((url, i) => {
            if (isImageUrl(url)) {
              out.push({
                slotKey: `${el.id}:${prop}:${i}`,
                elementId: el.id,
                elementType: el.type,
                propKey: prop,
                label: `${label} ${i + 1}`,
                url,
                arrayIndex: i,
              });
            }
          });
        } else if (prop === 'slides' && Array.isArray(val)) {
          val.forEach((slide, i) => {
            const img = (slide as { image?: string })?.image;
            if (isImageUrl(img)) {
              out.push({
                slotKey: `${el.id}:slideImage:${i}`,
                elementId: el.id,
                elementType: el.type,
                propKey: 'slides',
                label: `${label} — slide ${i + 1}`,
                url: img,
                arrayIndex: i,
              });
            }
          });
        } else if (isImageUrl(val)) {
          out.push({
            slotKey: `${el.id}:${prop}`,
            elementId: el.id,
            elementType: el.type,
            propKey: prop,
            label,
            url: val as string,
          });
        }
      }
    }
    if (el.children?.length) walkElements(el.children, out);
  }
}

export function collectModelImageSlots(elementos: BuilderElement[]): ModelImageSlot[] {
  const out: ModelImageSlot[] = [];
  walkElements(elementos, out);
  return out;
}

export function hasModelImageSlots(elementos: BuilderElement[]): boolean {
  return collectModelImageSlots(elementos).length > 0;
}
