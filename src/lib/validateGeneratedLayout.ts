import { z } from 'zod';
import type { BuilderElement, BuilderElementType } from '../types/builder';
import { DEFAULT_PROPS } from '../components/builder/defaultProps';
import { createId } from './ids';

const ALL_TYPES = Object.keys(DEFAULT_PROPS) as BuilderElementType[];

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

function mergeProps(type: BuilderElementType, props: Record<string, unknown>): Record<string, unknown> {
  const defaults = DEFAULT_PROPS[type] ?? {};
  return { ...defaults, ...props };
}

function cloneElement(
  el: RawElement,
  allowed: ReadonlySet<BuilderElementType>,
): BuilderElement | null {
  if (!ALL_TYPES.includes(el.type as BuilderElementType)) return null;
  const type = el.type as BuilderElementType;
  if (!allowed.has(type)) return null;

  const props = mergeProps(type, (el.props ?? {}) as Record<string, unknown>);

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
