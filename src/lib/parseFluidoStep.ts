/** Converte fluidoStep da URL/params em inteiro de passo do wizard (>= 1). */
export function parseFluidoStep(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  const step = Math.round(n);
  return step >= 1 ? step : undefined;
}
