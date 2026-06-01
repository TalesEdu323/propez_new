import { describe, expect, it } from 'vitest';
import { resolveElementImages } from '../imageResolver.js';

describe('imageResolver hero banner', () => {
  it('imageGeneratePrompt no marketing_hero vira backgroundImageUrl com dimensões hero', async () => {
    const props = await resolveElementImages(
      {
        title: 'Proposta exclusiva',
        imageGeneratePrompt: 'Modern corporate office at sunset',
      },
      { offerType: 'consultoria', layoutMode: 'generate', elementType: 'marketing_hero' },
    );

    expect(props.backgroundImageUrl).toMatch(/image\.pollinations\.ai/);
    expect(props.backgroundImageUrl).toContain('width=1920');
    expect(props.backgroundImageUrl).toContain('height=600');
    expect(props.imageGeneratePrompt).toBeUndefined();
  });

  it('injeta logo da org no hero', async () => {
    const props = await resolveElementImages(
      { title: 'Hero' },
      {
        offerType: 'generico',
        layoutMode: 'generate',
        elementType: 'marketing_hero',
        organizationLogoUrl: 'https://example.com/logo.png',
      },
    );

    expect(props.logoUrl).toBe('https://example.com/logo.png');
  });
});

describe('imageResolver', () => {
  it('getLayoutImageMode default stock', async () => {
    const { getLayoutImageMode } = await import('../imageResolver.js');
    delete process.env.IA_LAYOUT_IMAGE_MODE;
    expect(getLayoutImageMode()).toBe('stock');
  });
});
