/**
 * Tipos compartilhados do construtor (Builder).
 *
 * Esta versão usa uma união discriminada construída a partir de `BuilderElementType`
 * via mapped type, permitindo narrowing correto do campo `type` em `switch/case` e
 * em checagens de igualdade. Cada tipo mapeia para seu próprio shape de `props` via
 * `BuilderElementPropsMap`.
 *
 * Para evoluir rumo a tipagem estrita por tipo, substitua cada entrada do
 * `BuilderElementPropsMap` por uma interface dedicada (ex.: `HeadingProps`) e
 * atualize `defaultProps.ts` + `RenderElement.tsx` caso a caso.
 */

export type PageWidthMode = 'boxed' | 'full';

export interface BuilderPageLayout {
  widthMode: PageWidthMode;
  horizontalPadding: number;
  maxContentWidth?: number;
  /** Preset de tema visual da proposta */
  themePreset?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  backgroundImage?: string;
  logoUrl?: string;
  /** Efeito decorativo sobre o fundo da página */
  backgroundEffect?: 'none' | 'dots' | 'grid';
}

export type BuilderViewport = 'desktop' | 'tablet' | 'mobile';

export type SpacingPreset = 'compact' | 'normal' | 'spacious';

export type BuilderElementType =
  | 'heading' | 'paragraph' | 'button' | 'image' | 'logo'
  | 'divider' | 'spacer' | 'video' | 'card'
  | 'stats' | 'accordion' | 'animated_text'
  | 'funnel' | 'icon_list' | 'pricing' | 'testimonial' | 'timeline'
  | 'navbar' | 'slider' | 'feature_grid' | 'gallery' | 'grid' | 'container' | 'column'
  | 'countdown' | 'whatsapp_button' | 'tabs' | 'progress_bar' | 'star_rating'
  | 'google_map' | 'comparison_table' | 'image_carousel' | 'toast_notification'
  | 'marketing_hero' | 'marketing_context' | 'marketing_strategy' | 'marketing_services' | 'marketing_pricing' | 'marketing_cta'
  | 'service_stack'
  | 'projection_calculator' | 'metrics_table';

/** Lista canônica de tipos — usada no servidor sem importar defaultProps (React). */
export const BUILDER_ELEMENT_TYPES: readonly BuilderElementType[] = [
  'heading', 'paragraph', 'button', 'image', 'logo',
  'divider', 'spacer', 'video', 'card',
  'stats', 'accordion', 'animated_text',
  'funnel', 'icon_list', 'pricing', 'testimonial', 'timeline',
  'navbar', 'slider', 'feature_grid', 'gallery', 'grid', 'container', 'column',
  'countdown', 'whatsapp_button', 'tabs', 'progress_bar', 'star_rating',
  'google_map', 'comparison_table', 'image_carousel', 'toast_notification',
  'marketing_hero', 'marketing_context', 'marketing_strategy', 'marketing_services', 'marketing_pricing', 'marketing_cta',
  'service_stack',
  'projection_calculator', 'metrics_table',
];

export function isKnownBuilderElementType(type: string): type is BuilderElementType {
  return (BUILDER_ELEMENT_TYPES as readonly string[]).includes(type);
}

/**
 * Mapa de props por tipo. Hoje quase todas usam `Record<string, unknown>` para manter
 * compatibilidade com o DEFAULT_PROPS e o RenderElement atuais. Próximos passos:
 * substituir progressivamente por interfaces dedicadas (HeadingProps, ButtonProps, ...).
 */
export interface BuilderElementPropsMap {
  heading: Record<string, unknown>;
  paragraph: Record<string, unknown>;
  button: Record<string, unknown>;
  image: Record<string, unknown>;
  logo: Record<string, unknown>;
  divider: Record<string, unknown>;
  spacer: Record<string, unknown>;
  video: Record<string, unknown>;
  card: Record<string, unknown>;
  stats: Record<string, unknown>;
  accordion: Record<string, unknown>;
  animated_text: Record<string, unknown>;
  funnel: Record<string, unknown>;
  icon_list: Record<string, unknown>;
  pricing: Record<string, unknown>;
  testimonial: Record<string, unknown>;
  timeline: Record<string, unknown>;
  navbar: Record<string, unknown>;
  slider: Record<string, unknown>;
  feature_grid: Record<string, unknown>;
  gallery: Record<string, unknown>;
  grid: Record<string, unknown>;
  container: Record<string, unknown>;
  column: Record<string, unknown>;
  countdown: Record<string, unknown>;
  whatsapp_button: Record<string, unknown>;
  tabs: Record<string, unknown>;
  progress_bar: Record<string, unknown>;
  star_rating: Record<string, unknown>;
  google_map: Record<string, unknown>;
  comparison_table: Record<string, unknown>;
  image_carousel: Record<string, unknown>;
  toast_notification: Record<string, unknown>;
  marketing_hero: Record<string, unknown>;
  marketing_context: Record<string, unknown>;
  marketing_strategy: Record<string, unknown>;
  marketing_services: Record<string, unknown>;
  marketing_pricing: Record<string, unknown>;
  marketing_cta: Record<string, unknown>;
  service_stack: Record<string, unknown>;
  projection_calculator: Record<string, unknown>;
  metrics_table: Record<string, unknown>;
}

/**
 * Construtor da união discriminada. Cada variante tem `type: K` literal e
 * `props: BuilderElementPropsMap[K]`, permitindo que o TypeScript faça narrowing
 * correto quando se faz `if (el.type === 'heading')` ou `switch (el.type)`.
 */
export type BuilderElementOfType<K extends BuilderElementType> = {
  id: string;
  type: K;
  props: BuilderElementPropsMap[K];
  children?: BuilderElement[];
};

export type BuilderElement = {
  [K in BuilderElementType]: BuilderElementOfType<K>;
}[BuilderElementType];

export function isBuilderElement(value: unknown): value is BuilderElement {
  return !!value
    && typeof value === 'object'
    && 'id' in value
    && 'type' in value
    && 'props' in value;
}

/**
 * Type guard específico por tipo. Útil em locais onde precisamos estreitar
 * um `BuilderElement` genérico para uma variante concreta sem `switch`.
 */
export function isBuilderElementOfType<K extends BuilderElementType>(
  value: BuilderElement,
  type: K,
): value is Extract<BuilderElement, { type: K }> {
  return value.type === type;
}
