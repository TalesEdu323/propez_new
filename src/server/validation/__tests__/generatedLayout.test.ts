import { describe, expect, it } from 'vitest';
import { getAllowedWidgets, getIaAllowedWidgets } from '../../../lib/featureFlags.js';
import { validateGeneratedLayout } from '../generatedLayout.js';

describe('validateGeneratedLayout', () => {
  it('aceita service_stack com getIaAllowedWidgets no plano Pro', () => {
    const allowed = getIaAllowedWidgets('pro');
    const raw = {
      elementos: [
        { id: 'a1', type: 'heading', props: { text: 'Título' } },
        { id: 'a2', type: 'service_stack', props: { mode: 'tabs', title: 'Serviços' } },
        { id: 'a3', type: 'pricing', props: { title: 'Plano', price: 'R$ 1.000' } },
        { id: 'a4', type: 'button', props: { text: 'Aprovar', proposalAction: 'approve' } },
      ],
    };
    const result = validateGeneratedLayout(raw, allowed);
    expect(result.some((el) => el.type === 'service_stack')).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('remove service_stack com getAllowedWidgets comercial apenas', () => {
    const allowed = getAllowedWidgets('pro');
    const raw = {
      elementos: [
        { id: 'a1', type: 'heading', props: { text: 'Título' } },
        { id: 'a2', type: 'service_stack', props: { mode: 'tabs' } },
        { id: 'a3', type: 'paragraph', props: { text: 'Corpo' } },
        { id: 'a4', type: 'button', props: { text: 'CTA' } },
      ],
    };
    const result = validateGeneratedLayout(raw, allowed);
    expect(result.some((el) => el.type === 'service_stack')).toBe(false);
  });
});
