import type { BuilderElementType } from '../../types/builder';

/** Widgets permitidos no mini-builder de cadastro de serviço. */
export const SERVICE_WIDGETS: ReadonlySet<BuilderElementType> = new Set([
  'heading',
  'paragraph',
  'divider',
  'spacer',
  'feature_grid',
  'icon_list',
  'timeline',
  'accordion',
  'tabs',
  'pricing',
  'marketing_pricing',
  'testimonial',
  'stats',
  'image',
  'card',
]);

export function isServiceWidget(type: BuilderElementType): boolean {
  return SERVICE_WIDGETS.has(type);
}
