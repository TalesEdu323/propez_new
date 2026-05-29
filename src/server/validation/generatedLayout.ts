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

  if (elementos.length < 3) {
    throw new LayoutValidationError('Poucos blocos gerados. Tente uma descrição mais detalhada.');
  }

  return elementos;
}
