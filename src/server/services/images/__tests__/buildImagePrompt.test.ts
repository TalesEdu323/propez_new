import { describe, expect, it } from 'vitest';
import { buildImagePrompt, suggestGlobalImagePrompt } from '../buildImagePrompt.js';

describe('buildImagePrompt', () => {
  it('prioriza slotPrompt sobre global e contexto', () => {
    expect(
      buildImagePrompt({
        slotPrompt: 'Equipe em reunião estratégica',
        globalPrompt: 'Global',
        modelName: 'Modelo X',
      }),
    ).toBe('Equipe em reunião estratégica');
  });

  it('usa globalPrompt quando slotPrompt ausente', () => {
    expect(
      buildImagePrompt({
        globalPrompt: 'Banner moderno para consultoria',
        modelName: 'Modelo X',
      }),
    ).toBe('Banner moderno para consultoria');
  });

  it('monta contexto com modelo, serviços e hint', () => {
    const prompt = buildImagePrompt({
      modelName: 'Proposta Web',
      serviceNames: ['SEO', 'Social Media'],
      elementHint: 'Transforme seu negócio',
      slotLabel: 'Banner do hero',
    });
    expect(prompt).toContain('Proposta Web');
    expect(prompt).toContain('SEO');
    expect(prompt).toContain('Social Media');
    expect(prompt).toContain('Transforme seu negócio');
    expect(prompt).toContain('Banner do hero');
  });

  it('inclui brief no contexto quando sem prompts customizados', () => {
    const prompt = buildImagePrompt({
      brief: 'Consultoria B2B premium',
      modelName: 'Modelo A',
    });
    expect(prompt).toContain('Consultoria B2B premium');
    expect(prompt).toContain('Modelo A');
  });

  it('fallback para cena padrão', () => {
    expect(buildImagePrompt({})).toBe('professional business scene');
  });
});

describe('suggestGlobalImagePrompt', () => {
  it('prefere brief', () => {
    expect(suggestGlobalImagePrompt('Modelo', ['SEO'], 'Brief IA')).toBe('Brief IA');
  });

  it('monta nome + serviços', () => {
    expect(suggestGlobalImagePrompt('Proposta Padrão', ['Dev Web', 'Design'])).toBe(
      'Proposta Padrão, serviços: Dev Web, Design',
    );
  });
});
