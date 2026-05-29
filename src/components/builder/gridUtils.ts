import type { BuilderViewport } from '../../types/builder';

export function gridColsClass(columns: string, viewport: BuilderViewport): string {
  const n = columns || '2';
  if (viewport === 'mobile') return 'grid-cols-1';
  if (viewport === 'tablet') {
    if (n === '1') return 'grid-cols-1';
    return 'grid-cols-1 md:grid-cols-2';
  }
  switch (n) {
    case '1': return 'grid-cols-1';
    case '2': return 'grid-cols-1 md:grid-cols-2';
    case '3': return 'grid-cols-1 md:grid-cols-3';
    case '4': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    case '5': return 'grid-cols-1 md:grid-cols-5';
    case '6': return 'grid-cols-1 md:grid-cols-6';
    default: return 'grid-cols-1 md:grid-cols-2';
  }
}

export function featureGridColsClass(columns: string, viewport: BuilderViewport): string {
  const n = columns || '3';
  if (viewport === 'mobile') return 'grid-cols-1';
  if (viewport === 'tablet') {
    return n === '1' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2';
  }
  switch (n) {
    case '1': return 'grid-cols-1';
    case '2': return 'grid-cols-1 md:grid-cols-2';
    case '4': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    default: return 'grid-cols-1 md:grid-cols-3';
  }
}

export function blockSpacingStyle(padding?: string, margin?: string): { padding?: string; margin?: string } {
  return {
    padding: padding != null ? `${padding}px` : undefined,
    margin: margin != null && margin !== '0' ? `${margin}px` : undefined,
  };
}
