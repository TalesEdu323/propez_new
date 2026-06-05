import { z } from 'zod';
import type { BuilderElement, BuilderElementType } from '../../types/builder.js';
import { isKnownBuilderElementType } from '../../types/builder.js';
import { createId } from '../../lib/ids.js';

type RawElement = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  children?: RawElement[];
};

const elementSchema: z.ZodType<RawElement> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    type: z.string(),
    props: z.record(z.string(), z.unknown()).optional().default({}),
    children: z.array(elementSchema).optional(),
  }),
);

const layoutResponseSchema = z.object({
  elementos: z.array(elementSchema).min(1).max(20),
});

const FALLBACK_BLOCKS: Array<{ type: BuilderElementType; props: Record<string, unknown> }> = [
  { type: 'heading', props: { text: 'Sua proposta' } },
  { type: 'paragraph', props: { text: 'Descreva aqui o escopo, prazos e benefícios da sua oferta.' } },
  { type: 'button', props: { text: 'Aprovar proposta', proposalAction: 'approve' } },
];

function buildFallbackElements(
  allowed: ReadonlySet<BuilderElementType>,
  existing: BuilderElement[],
): BuilderElement[] {
  const result = [...existing];
  for (const block of FALLBACK_BLOCKS) {
    if (result.length >= 3) break;
    if (!allowed.has(block.type)) continue;
    if (result.some((el) => el.type === block.type)) continue;
    result.push({
      id: createId(),
      type: block.type,
      props: { ...block.props },
    } as BuilderElement);
  }
  return result;
}

function cloneElement(
  el: RawElement,
  allowed: ReadonlySet<BuilderElementType>,
): BuilderElement | null {
  if (!isKnownBuilderElementType(el.type)) return null;
  const type = el.type;
  if (!allowed.has(type)) return null;

  const props = { ...(el.props ?? {}) };

  const children = el.children
    ?.map((c) => cloneElement(c, allowed))
    .filter((c): c is BuilderElement => c !== null);

  return {
    id: createId(),
    type,
    props,
    ...(children && children.length > 0 ? { children } : {}),
  } as BuilderElement;
}

export class LayoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LayoutValidationError';
  }
}

export function validateGeneratedLayout(
  raw: unknown,
  allowedWidgets: ReadonlySet<BuilderElementType>,
): BuilderElement[] {
  const parsed = layoutResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new LayoutValidationError('Formato de layout inválido. Tente reformular sua descrição.');
  }

  const elementos = parsed.data.elementos
    .map((el) => cloneElement(el, allowedWidgets))
    .filter((el): el is BuilderElement => el !== null);

  const withFallback =
    elementos.length >= 3 ? elementos : buildFallbackElements(allowedWidgets, elementos);

  if (withFallback.length < 2) {
    throw new LayoutValidationError('Poucos blocos gerados. Tente uma descrição mais detalhada.');
  }

  return withFallback;
}
