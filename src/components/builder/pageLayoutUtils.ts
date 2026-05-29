import type { CSSProperties } from 'react';
import type { BuilderPageLayout } from '../../types/builder';
import { DEFAULT_PAGE_LAYOUT } from '../../lib/pageLayout';
import { resolveThemeColors } from '../../lib/proposalTheme';

/** Padding lateral responsivo: até `horizontalPadding` no desktop, mínimo 16px no mobile. */
export function resolvePagePadding(layout?: BuilderPageLayout | null): string {
  const { widthMode, horizontalPadding } = layout ?? DEFAULT_PAGE_LAYOUT;
  if (widthMode === 'full') return '0px';
  const max = horizontalPadding ?? DEFAULT_PAGE_LAYOUT.horizontalPadding;
  return `clamp(16px, 5vw, ${max}px)`;
}

export function pageShellStyle(layout?: BuilderPageLayout | null): CSSProperties {
  const normalized = layout ?? DEFAULT_PAGE_LAYOUT;
  const theme = resolveThemeColors(normalized);
  const style: CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
  };

  if (normalized.backgroundImage) {
    style.backgroundImage = `url(${normalized.backgroundImage})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center';
    style.backgroundAttachment = 'fixed';
  }

  if (normalized.widthMode === 'boxed') {
    style.paddingLeft = resolvePagePadding(normalized);
    style.paddingRight = resolvePagePadding(normalized);
    if (normalized.maxContentWidth) {
      style.maxWidth = normalized.maxContentWidth;
      style.marginLeft = 'auto';
      style.marginRight = 'auto';
    }
  }

  return style;
}
