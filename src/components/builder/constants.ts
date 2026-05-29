import type { BuilderViewport, SpacingPreset } from '../../types/builder';
import { DEFAULT_PAGE_LAYOUT } from '../../lib/pageLayout';

export { DEFAULT_PAGE_LAYOUT };

export interface OptionItem<V extends string = string> {
  label: string;
  value: V;
}

export const ALIGN_OPTIONS: OptionItem[] = [
  { label: 'Esq', value: 'left' },
  { label: 'Centro', value: 'center' },
  { label: 'Dir', value: 'right' },
];

export const ANIMATION_OPTIONS: OptionItem[] = [
  { label: 'Nenhuma', value: 'none' },
  { label: 'Fade Up', value: 'fade-up' },
  { label: 'Pulse', value: 'pulse' },
  { label: 'Bounce', value: 'bounce' },
  { label: 'Scale In', value: 'scale' },
];

export const PAGE_PADDING_PRESETS = [
  { label: 'Estreita', value: 32 },
  { label: 'Padrão', value: 60 },
  { label: 'Larga', value: 80 },
] as const;

export const VIEWPORT_WIDTHS: Record<BuilderViewport, number | null> = {
  desktop: null,
  tablet: 768,
  mobile: 390,
};

export const VIEWPORT_LABELS: Record<BuilderViewport, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Celular',
};

export const SPACING_PRESET_VALUES: Record<SpacingPreset, { padding: string; margin: string }> = {
  compact: { padding: '8', margin: '0' },
  normal: { padding: '16', margin: '0' },
  spacious: { padding: '32', margin: '0' },
};

export function spacingPresetFromProps(padding?: string, margin?: string): SpacingPreset {
  const p = parseInt(padding ?? '16', 10);
  const m = parseInt(margin ?? '0', 10);
  if (p <= 8 && m === 0) return 'compact';
  if (p >= 32 || m >= 16) return 'spacious';
  return 'normal';
}
