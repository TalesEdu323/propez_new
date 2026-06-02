export const DEFAULT_WIDTH_PCT = 0.22;
export const DEFAULT_HEIGHT_PCT = 0.12;

export const SIGNER_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F97316',
  '#14B8A6',
  '#6366F1',
  '#22C55E',
  '#EF4444',
] as const;

export function getSignerColorByIndex(index: number): string {
  return SIGNER_COLORS[index % SIGNER_COLORS.length] ?? SIGNER_COLORS[0];
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
