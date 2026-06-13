import type { BuilderViewport } from '../../types/builder';
import { gridColumns } from './viewportLayout';

export function gridColsClass(columns: string, viewport: BuilderViewport): string {
  const n = parseInt(columns || '2', 10) || 2;
  return gridColumns(viewport, n);
}

export function featureGridColsClass(columns: string, viewport: BuilderViewport): string {
  const n = parseInt(columns || '3', 10) || 3;
  return gridColumns(viewport, n);
}

export function blockSpacingStyle(padding?: string, margin?: string): { padding?: string; margin?: string } {
  return {
    padding: padding != null ? `${padding}px` : undefined,
    margin: margin != null && margin !== '0' ? `${margin}px` : undefined,
  };
}
