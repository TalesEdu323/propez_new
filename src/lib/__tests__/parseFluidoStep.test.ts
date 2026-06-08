import { describe, expect, it } from 'vitest';
import { parseFluidoStep } from '../parseFluidoStep';

describe('parseFluidoStep', () => {
  it('retorna undefined para valores vazios ou inválidos', () => {
    expect(parseFluidoStep(undefined)).toBeUndefined();
    expect(parseFluidoStep(null)).toBeUndefined();
    expect(parseFluidoStep('')).toBeUndefined();
    expect(parseFluidoStep('abc')).toBeUndefined();
    expect(parseFluidoStep(NaN)).toBeUndefined();
    expect(parseFluidoStep(0)).toBeUndefined();
  });

  it('arredonda floats e aceita strings numéricas', () => {
    expect(parseFluidoStep(4)).toBe(4);
    expect(parseFluidoStep('4')).toBe(4);
    expect(parseFluidoStep(4.5)).toBe(5);
    expect(parseFluidoStep('4.2')).toBe(4);
  });
});
