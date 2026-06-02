import { describe, expect, it } from 'vitest';
import { normalizePageLayout } from '../pageLayout';
import { hydrateStarterImagePrompts } from '../hydrateStarterImagePrompts';
import {
  STARTER_TEMPLATES,
  applyStarterTemplate,
  countStarterImagePrompts,
} from '../../data/starterTemplates';
import type { BuilderElement } from '../../types/builder';

describe('normalizePageLayout backgroundEffect', () => {
  it('preserva dots e grid', () => {
    expect(normalizePageLayout({ widthMode: 'full', horizontalPadding: 0, backgroundEffect: 'dots' }).backgroundEffect).toBe('dots');
    expect(normalizePageLayout({ widthMode: 'full', horizontalPadding: 0, backgroundEffect: 'grid' }).backgroundEffect).toBe('grid');
  });

  it('ignora valor inválido', () => {
    expect(normalizePageLayout({ backgroundEffect: 'invalid' }).backgroundEffect).toBeUndefined();
  });
});

describe('hydrateStarterImagePrompts', () => {
  it('inclui modelName e serviceNames nos prompts', () => {
    const applied = applyStarterTemplate('starter-consultoria');
    expect(applied).not.toBeNull();
    const hydrated = hydrateStarterImagePrompts(applied!.elementos, {
      modelName: 'Proposta Acme',
      serviceNames: ['SEO', 'Design'],
    });
    const hero = hydrated.find((e) => e.type === 'marketing_hero');
    const prompt = String(hero?.props.imageGeneratePrompt ?? '');
    expect(prompt).toContain('Proposta Acme');
    expect(prompt).toContain('SEO');
    expect(prompt).toContain('Design');
  });
});

describe('STARTER_TEMPLATES premium', () => {
  it('expõe exatamente 4 templates', () => {
    expect(STARTER_TEMPLATES).toHaveLength(4);
  });

  it('cada template tem navbar e marketing_hero', () => {
    for (const t of STARTER_TEMPLATES) {
      const types = t.elementos.map((e) => e.type);
      expect(types[0]).toBe('navbar');
      expect(types).toContain('marketing_hero');
      expect(t.pageLayout?.backgroundEffect).toBe('dots');
    }
  });

  const expectedSlots: Record<string, number> = {
    'starter-consultoria': 3,
    'starter-agencia': 6,
    'starter-saas': 4,
    'starter-recorrente': 3,
  };

  it('contagem de slots imageGeneratePrompt por template', () => {
    for (const t of STARTER_TEMPLATES) {
      expect(countStarterImagePrompts(t.elementos)).toBe(expectedSlots[t.id]);
    }
  });

  it('starter-consultoria reproduz seções Vortex', () => {
    const t = STARTER_TEMPLATES.find((x) => x.id === 'starter-consultoria')!;
    const labels = t.elementos
      .map((e) => e.props.sectionLabel)
      .filter((l): l is string => typeof l === 'string' && l.length > 0);
    expect(labels.some((l) => l.includes('01'))).toBe(true);
    expect(labels.some((l) => l.includes('05'))).toBe(true);
    expect(t.elementos.some((e) => e.type === 'tabs')).toBe(true);
    expect(t.elementos.some((e) => e.type === 'funnel')).toBe(true);
  });
});

describe('hasModelImageSlots com prompts pendentes', () => {
  it('detecta slots antes da resolução', async () => {
    const { hasModelImageSlots } = await import('../modelImageSlots');
    const els: BuilderElement[] = [
      {
        id: '1',
        type: 'marketing_hero',
        props: { imageGeneratePrompt: '__auto__' },
      },
    ];
    expect(hasModelImageSlots(els)).toBe(true);
  });
});
