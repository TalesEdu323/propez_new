import { describe, expect, it } from 'vitest';
import type { BuilderElement } from '../../../../types/builder.js';
import { inferLayoutContext } from '../../../../lib/layoutContext.js';
import { getIaAllowedWidgets } from '../../../../lib/featureFlags.js';
import {
  hydrateGeneratedLayout,
  inferPageLayoutFromContext,
  rehydrateModelImages,
} from '../hydrateGeneratedLayout.js';

describe('hydrateGeneratedLayout', () => {
  const prompt =
    'Consultoria B2B 90 dias com diagnóstico, plano e acompanhamento. Investimento R$ 12.000.';

  it('insere service_stack quando ausente', async () => {
    const context = inferLayoutContext(prompt, false);
    const elementos: BuilderElement[] = [
      { id: '1', type: 'heading', props: { text: 'Proposta' } },
      { id: '2', type: 'pricing', props: { price: 'R$ 12.000' } },
      { id: '3', type: 'button', props: { text: 'Aprovar', proposalAction: 'approve' } },
    ];
    const result = await hydrateGeneratedLayout(elementos, {
      userPrompt: prompt,
      context,
      allowed: getIaAllowedWidgets('pro'),
    });
    const stack = result.find((el) => el.type === 'service_stack');
    expect(stack).toBeDefined();
    expect(stack?.props.mode).toBe('tabs');
    expect(Array.isArray(stack?.props.previewLabels)).toBe(true);
    expect((stack?.props.previewLabels as string[]).length).toBeGreaterThanOrEqual(2);
  });

  it('faz merge de defaults em heading sem texto', async () => {
    const context = inferLayoutContext(prompt, false);
    const elementos: BuilderElement[] = [
      { id: '1', type: 'heading', props: {} },
      { id: '2', type: 'paragraph', props: { text: 'Detalhes' } },
      { id: '3', type: 'paragraph', props: { text: 'Mais' } },
      { id: '4', type: 'service_stack', props: {} },
    ];
    const result = await hydrateGeneratedLayout(elementos, {
      userPrompt: prompt,
      context,
      allowed: getIaAllowedWidgets('pro'),
    });
    const heading = result.find((el) => el.type === 'heading');
    expect(heading?.props.text).toBeTruthy();
    expect(heading?.props.color).toBeTruthy();
  });

  it('inferPageLayoutFromContext retorna cores da paleta', () => {
    const context = inferLayoutContext(prompt, false);
    const layout = inferPageLayoutFromContext(context);
    expect(layout.primaryColor).toBe(context.palette.primary);
    expect(layout.backgroundColor).toBe(context.palette.bgLight);
  });

  it('rehydrateModelImages usa prompt por slot quando imagePrompts informado', async () => {
    const elementos: BuilderElement[] = [
      {
        id: 'img-1',
        type: 'image',
        props: { url: 'https://example.com/old.jpg' },
      },
    ];
    const slotKey = 'img-1:url';
    const result = await rehydrateModelImages(elementos, {
      offerType: 'saas',
      imageMode: 'generate',
      modelName: 'Modelo SaaS',
      serviceNames: ['Onboarding'],
      imagePrompts: { [slotKey]: 'Dashboard analytics em tela grande' },
      regenerate: [slotKey],
    });
    const url = decodeURIComponent(String(result[0].props.url ?? ''));
    expect(url).toContain('Dashboard analytics');
    expect(url).not.toContain('Modelo SaaS');
  });

  it('rehydrateModelImages aplica globalPrompt no hero', async () => {
    const elementos: BuilderElement[] = [
      {
        id: 'hero-1',
        type: 'marketing_hero',
        props: {
          title: 'Proposta Premium',
          backgroundImageUrl: 'https://example.com/old.jpg',
        },
      },
    ];
    const result = await rehydrateModelImages(elementos, {
      offerType: 'consultoria',
      imageMode: 'generate',
      modelName: 'Proposta Web 2025',
      serviceNames: ['SEO', 'Design'],
      globalPrompt: 'Equipe colaborando em escritório moderno',
      regenerate: 'all',
    });
    const url = decodeURIComponent(String(result[0].props.backgroundImageUrl ?? ''));
    expect(url).toContain('pollinations.ai');
    expect(url).toContain('Equipe colaborando');
  });

  it('rehydrateModelImages monta contexto com modelo e serviços sem globalPrompt', async () => {
    const elementos: BuilderElement[] = [
      {
        id: 'card-1',
        type: 'card',
        props: {
          title: 'Entrega mensal',
          imageUrl: 'https://example.com/old.jpg',
        },
      },
    ];
    const result = await rehydrateModelImages(elementos, {
      offerType: 'agencia',
      imageMode: 'generate',
      modelName: 'Proposta Agência',
      serviceNames: ['Branding', 'Ads'],
      regenerate: ['card-1:imageUrl'],
    });
    const url = decodeURIComponent(String(result[0].props.imageUrl ?? ''));
    expect(url).toContain('Proposta');
    expect(url).toContain('Branding');
  });
});
