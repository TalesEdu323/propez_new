import { describe, expect, it } from 'vitest';
import type { BuilderElement } from '../../../../types/builder.js';
import { inferLayoutContext } from '../../../../lib/layoutContext.js';
import { getIaAllowedWidgets } from '../../../../lib/featureFlags.js';
import {
  hydrateGeneratedLayout,
  inferPageLayoutFromContext,
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
});
