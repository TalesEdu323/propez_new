import type { BuilderPageLayout } from '../types/builder.js';

export const DEFAULT_PAGE_LAYOUT: BuilderPageLayout = {
  widthMode: 'boxed',
  horizontalPadding: 60,
};

export function normalizePageLayout(raw: unknown): BuilderPageLayout {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PAGE_LAYOUT };
  const o = raw as Record<string, unknown>;
  const widthMode = o.widthMode === 'full' ? 'full' : 'boxed';
  const horizontalPadding = typeof o.horizontalPadding === 'number'
    ? Math.min(120, Math.max(0, o.horizontalPadding))
    : DEFAULT_PAGE_LAYOUT.horizontalPadding;
  const maxContentWidth = typeof o.maxContentWidth === 'number' ? o.maxContentWidth : undefined;
  const themePreset = typeof o.themePreset === 'string' ? o.themePreset : undefined;
  const primaryColor = typeof o.primaryColor === 'string' ? o.primaryColor : undefined;
  const secondaryColor = typeof o.secondaryColor === 'string' ? o.secondaryColor : undefined;
  const backgroundColor = typeof o.backgroundColor === 'string' ? o.backgroundColor : undefined;
  const textColor = typeof o.textColor === 'string' ? o.textColor : undefined;
  const backgroundImage = typeof o.backgroundImage === 'string' ? o.backgroundImage : undefined;
  const logoUrl = typeof o.logoUrl === 'string' ? o.logoUrl : undefined;
  return {
    widthMode,
    horizontalPadding,
    ...(maxContentWidth != null ? { maxContentWidth } : {}),
    ...(themePreset ? { themePreset } : {}),
    ...(primaryColor ? { primaryColor } : {}),
    ...(secondaryColor ? { secondaryColor } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(textColor ? { textColor } : {}),
    ...(backgroundImage ? { backgroundImage } : {}),
    ...(logoUrl ? { logoUrl } : {}),
  };
}
