import { describe, expect, it } from 'vitest';
import {
  resolveContratoTextoForApi,
  sanitizePageLayoutForApi,
  sanitizeWhatsappComprovante,
  stripElementosForApi,
} from '../sanitizeModeloPayload';

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

  it('stripElementosForApi remove prompts internos e preserva URLs https', () => {
    const result = stripElementosForApi([
      {
        id: '1',
        type: 'image',
        props: {
          url: 'https://example.com/photo.jpg',
          imageGeneratePrompt: 'office scene',
          imageSearchQuery: 'office',
        },
      },
    ]);
    expect(result[0].props.url).toBe('https://example.com/photo.jpg');
    expect(result[0].props.imageGeneratePrompt).toBeUndefined();
    expect(result[0].props.imageSearchQuery).toBeUndefined();
  });

  it('resolveContratoTextoForApi omite texto quando contratoId está definido', () => {
    const templateId = '550e8400-e29b-41d4-a716-446655440000';
    expect(resolveContratoTextoForApi(templateId, 'Contrato longo duplicado...')).toBeNull();
    expect(resolveContratoTextoForApi(null, 'Texto inline')).toBe('Texto inline');
    expect(resolveContratoTextoForApi(undefined, '')).toBeNull();
  });
});
