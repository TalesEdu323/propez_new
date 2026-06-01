import { describe, expect, it } from 'vitest';
import { hasWhiteLabel } from '../featureFlags';
import { resolveOrgBrand, relativeLuminance } from '../orgBrand';

describe('hasWhiteLabel', () => {
  it('retorna true quando whitelabelEnabled', () => {
    expect(hasWhiteLabel({ whitelabelEnabled: true })).toBe(true);
  });

  it('retorna false sem flag', () => {
    expect(hasWhiteLabel({ plan: 'business' })).toBe(false);
    expect(hasWhiteLabel({ whitelabelEnabled: false })).toBe(false);
    expect(hasWhiteLabel(null)).toBe(false);
  });
});

describe('resolveOrgBrand', () => {
  it('resolve branding quando whitelabelEnabled', () => {
    const brand = resolveOrgBrand({
      name: 'Acme',
      logoUrl: 'data:image/png;base64,x',
      primaryColor: '#336699',
      whitelabelEnabled: true,
    });
    expect(brand.isWhiteLabel).toBe(true);
    expect(brand.logoUrl).toBe('data:image/png;base64,x');
    expect(brand.primaryColor).toBe('#336699');
    expect(brand.orgName).toBe('Acme');
  });
});

describe('relativeLuminance', () => {
  it('cor escura tem luminância baixa', () => {
    expect(relativeLuminance('#000000')).toBeLessThan(0.1);
  });

  it('cor clara tem luminância alta', () => {
    expect(relativeLuminance('#ffffff')).toBeGreaterThan(0.9);
  });
});
