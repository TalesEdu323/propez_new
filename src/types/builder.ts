/**
 * Tipos compartilhados do construtor (Builder).
 *
 * Esta é uma versão pragmática que mantém compatibilidade imediata com o código
 * existente, permitindo refino gradual para união discriminada por tipo sem
 * precisar migrar DEFAULT_PROPS e RenderElement de uma só vez.
 */

export type BuilderElementType =
  | 'heading' | 'paragraph' | 'button' | 'image'
  | 'divider' | 'spacer' | 'video' | 'card'
  | 'stats' | 'accordion' | 'animated_text'
  | 'funnel' | 'icon_list' | 'pricing' | 'testimonial' | 'timeline'
  | 'navbar' | 'slider' | 'feature_grid' | 'gallery' | 'grid' | 'container' | 'column'
  | 'countdown' | 'whatsapp_button' | 'tabs' | 'progress_bar' | 'star_rating'
  | 'google_map' | 'comparison_table' | 'image_carousel' | 'toast_notification'
  | 'marketing_hero' | 'marketing_context' | 'marketing_strategy' | 'marketing_services' | 'marketing_pricing' | 'marketing_cta';

export interface BuilderElement {
  id: string;
  type: BuilderElementType;
  props: Record<string, unknown>;
  children?: BuilderElement[];
}

export function isBuilderElement(value: unknown): value is BuilderElement {
  return !!value
    && typeof value === 'object'
    && 'id' in value
    && 'type' in value
    && 'props' in value;
}
