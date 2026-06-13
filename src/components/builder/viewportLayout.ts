import type { CSSProperties } from 'react';
import type { BuilderViewport } from '../../types/builder';

/** Grid column classes that respect builder preview viewport (not browser width). */
export function gridColumns(viewport: BuilderViewport, count: number): string {
  const n = Math.max(1, Math.min(6, count));
  if (viewport === 'mobile') return 'grid-cols-1';
  if (viewport === 'tablet') {
    if (n === 1) return 'grid-cols-1';
    return 'grid-cols-2';
  }
  switch (n) {
    case 1: return 'grid-cols-1';
    case 2: return 'grid-cols-1 sm:grid-cols-2';
    case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
    case 5: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5';
    default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6';
  }
}

export function galleryColsClass(columns: string | undefined, viewport: BuilderViewport): string {
  const n = columns ?? '3';
  if (viewport === 'mobile') {
    return n === '1' ? 'grid-cols-1' : 'grid-cols-2';
  }
  if (viewport === 'tablet') {
    if (n === '1') return 'grid-cols-1';
    if (n === '4') return 'grid-cols-2';
    return 'grid-cols-2';
  }
  if (n === '1') return 'grid-cols-1';
  if (n === '2') return 'grid-cols-2';
  if (n === '4') return 'grid-cols-2 md:grid-cols-4';
  return 'grid-cols-2 md:grid-cols-3';
}

export function stackDirection(viewport: BuilderViewport): string {
  if (viewport === 'mobile' || viewport === 'tablet') return 'flex-col';
  return 'flex-col sm:flex-row';
}

export function cardLayout(viewport: BuilderViewport): {
  root: string;
  media: string;
  body: string;
  gradient: string;
} {
  if (viewport === 'mobile' || viewport === 'tablet') {
    return {
      root: 'flex flex-col overflow-hidden',
      media: 'w-full h-64 relative overflow-hidden',
      body: 'p-6 w-full flex flex-col justify-center relative z-10',
      gradient: 'absolute inset-0 bg-gradient-to-t from-black/20 to-transparent',
    };
  }
  return {
    root: 'flex flex-col md:flex-row overflow-hidden',
    media: 'md:w-2/5 h-64 md:h-auto relative overflow-hidden',
    body: 'p-8 md:p-10 md:w-3/5 flex flex-col justify-center relative z-10',
    gradient: 'absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:bg-gradient-to-r',
  };
}

export function headingScale(
  viewport: BuilderViewport,
  sizes: { mobile: string; tablet: string; desktop: string },
): string {
  if (viewport === 'mobile') return sizes.mobile;
  if (viewport === 'tablet') return sizes.tablet;
  return sizes.desktop;
}

export function sectionPadding(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'py-12 px-4';
  if (viewport === 'tablet') return 'py-16 px-6';
  return 'py-24 px-8';
}

export function sectionPaddingCompact(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'py-8 px-4';
  if (viewport === 'tablet') return 'py-12 px-6';
  return 'py-24 px-8';
}

export function showNavbarLinks(viewport: BuilderViewport): string {
  if (viewport === 'mobile' || viewport === 'tablet') return 'hidden';
  return 'hidden md:flex items-center gap-8';
}

export function statsGridClass(viewport: BuilderViewport, itemCount: number): string {
  if (itemCount <= 1) return 'grid-cols-1';
  if (viewport === 'mobile') return 'grid-cols-1';
  if (viewport === 'tablet') return itemCount === 2 ? 'grid-cols-2' : 'grid-cols-2';
  if (itemCount === 2) return 'grid-cols-2';
  return 'grid-cols-2 md:grid-cols-3';
}

export function funnelStageStyle(viewport: BuilderViewport, widthPercent: number): CSSProperties {
  if (viewport === 'mobile') return { width: '100%' };
  return { width: `${widthPercent}%` };
}

export function cardPadding(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'p-6';
  if (viewport === 'tablet') return 'p-8';
  return 'p-10 md:p-12';
}

export function timelineMargin(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'ml-4';
  if (viewport === 'tablet') return 'ml-6';
  return 'ml-4 md:ml-10';
}

export function pricingCardPadding(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'p-6';
  if (viewport === 'tablet') return 'p-8';
  return 'p-12';
}

export function heroSectionClass(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'min-h-[420px] p-4';
  if (viewport === 'tablet') return 'min-h-[520px] p-6';
  return 'min-h-[600px] p-8';
}

export function navbarPadding(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'py-4 px-4';
  if (viewport === 'tablet') return 'py-4 px-6';
  return 'py-5 px-8';
}

export function funnelPadding(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'py-8 px-4';
  if (viewport === 'tablet') return 'py-10 px-6';
  return 'py-12 px-8';
}

export function outputGridClass(viewport: BuilderViewport, count: number): string {
  if (viewport === 'mobile') return count <= 2 ? 'grid-cols-2' : 'grid-cols-2';
  if (viewport === 'tablet') return count <= 2 ? 'grid-cols-2' : 'grid-cols-2';
  return count <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4';
}

export function calculatorSliderGrid(viewport: BuilderViewport): string {
  if (viewport === 'mobile' || viewport === 'tablet') return 'grid-cols-1';
  return 'grid-cols-1 md:grid-cols-2';
}

export function calculatorPadding(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'px-4 py-4';
  if (viewport === 'tablet') return 'px-6 py-5';
  return 'px-6 py-5 sm:px-8';
}

export function countdownLayout(viewport: BuilderViewport): {
  gap: string;
  box: string;
  value: string;
  padding: string;
} {
  if (viewport === 'mobile') {
    return { gap: 'gap-3', box: 'w-14 h-16', value: 'text-2xl', padding: 'p-6' };
  }
  if (viewport === 'tablet') {
    return { gap: 'gap-5', box: 'w-20 h-24', value: 'text-4xl', padding: 'p-8' };
  }
  return { gap: 'gap-6 md:gap-10', box: 'w-20 h-24 md:w-28 md:h-32', value: 'text-4xl md:text-6xl', padding: 'p-10' };
}

export function comparisonTableMinWidth(viewport: BuilderViewport): string {
  if (viewport === 'mobile') return 'min-w-[280px]';
  if (viewport === 'tablet') return 'min-w-[480px]';
  return 'min-w-[320px] sm:min-w-[600px]';
}
