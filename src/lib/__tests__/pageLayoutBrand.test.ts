import { describe, expect, it } from 'vitest';
import { mergeOrgBrandIntoPageLayout, normalizePageLayout } from '../pageLayout';

describe('mergeOrgBrandIntoPageLayout', () => {
  it('mescla logo e cores quando whitelabel e layout vazio', () => {
    const layout = normalizePageLayout({ widthMode: 'boxed', horizontalPadding: 60 });
    const merged = mergeOrgBrandIntoPageLayout(layout, {
      isWhiteLabel: true,
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
    });
    expect(merged.logoUrl).toBe('https://example.com/logo.png');
    expect(merged.primaryColor).toBe('#ff0000');
    expect(merged.secondaryColor).toBe('#00ff00');
  });

  it('não sobrescreve valores já definidos no layout', () => {
    const layout = normalizePageLayout({
      primaryColor: '#111111',
      logoUrl: 'https://custom/logo.png',
    });
    const merged = mergeOrgBrandIntoPageLayout(layout, {
      isWhiteLabel: true,
      logoUrl: 'https://org/logo.png',
      primaryColor: '#ff0000',
      secondaryColor: null,
    });
    expect(merged.primaryColor).toBe('#111111');
    expect(merged.logoUrl).toBe('https://custom/logo.png');
  });

  it('ignora branding quando não é whitelabel', () => {
    const layout = normalizePageLayout({});
    const merged = mergeOrgBrandIntoPageLayout(layout, {
      isWhiteLabel: false,
      logoUrl: 'https://org/logo.png',
      primaryColor: '#ff0000',
      secondaryColor: null,
    });
    expect(merged.logoUrl).toBeUndefined();
    expect(merged.primaryColor).toBeUndefined();
  });
});
