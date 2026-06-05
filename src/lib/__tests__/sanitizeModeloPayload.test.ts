import { describe, expect, it } from 'vitest';
import { sanitizePageLayoutForApi, sanitizeWhatsappComprovante } from '../sanitizeModeloPayload';

describe('sanitizeModeloPayload', () => {
  it('sanitizeWhatsappComprovante mantém só dígitos até 20 chars', () => {
    expect(sanitizeWhatsappComprovante('(11) 99999-9999')).toBe('11999999999');
    expect(sanitizeWhatsappComprovante('+55 11 99999-9999')).toBe('5511999999999');
    expect(sanitizeWhatsappComprovante('')).toBeNull();
  });

  it('sanitizePageLayoutForApi remove maxContentWidth inválido', () => {
    const layout = sanitizePageLayoutForApi({
      widthMode: 'boxed',
      horizontalPadding: 60,
      maxContentWidth: 0,
    });
    expect(layout.maxContentWidth).toBeUndefined();
  });

  it('sanitizePageLayoutForApi preserva maxContentWidth positivo', () => {
    const layout = sanitizePageLayoutForApi({
      widthMode: 'boxed',
      horizontalPadding: 60,
      maxContentWidth: 960,
    });
    expect(layout.maxContentWidth).toBe(960);
  });
});
