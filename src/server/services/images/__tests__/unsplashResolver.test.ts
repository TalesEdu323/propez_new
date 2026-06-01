import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFallbackImageUrl, searchPhoto } from '../unsplashResolver.js';

describe('unsplashResolver', () => {
  const originalKey = process.env.UNSPLASH_ACCESS_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.UNSPLASH_ACCESS_KEY;
    } else {
      process.env.UNSPLASH_ACCESS_KEY = originalKey;
    }
    vi.unstubAllGlobals();
  });

  it('retorna fallback quando não há API key', async () => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    const url = await searchPhoto('equipe escritorio', 'consultoria');
    expect(url).toMatch(/^https:\/\/images\.unsplash\.com/);
    expect(url).toBe(getFallbackImageUrl('consultoria', 'equipe escritorio'.length % 3));
  });

  it('getFallbackImageUrl varia por offerType', () => {
    const a = getFallbackImageUrl('agencia', 0);
    const b = getFallbackImageUrl('saas', 0);
    expect(a).not.toBe(b);
  });

  it('usa API quando configurada', async () => {
    process.env.UNSPLASH_ACCESS_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [{ urls: { regular: 'https://images.unsplash.com/photo-test' } }],
        }),
      }),
    );
    const url = await searchPhoto('marketing team', 'agencia');
    expect(url).toBe('https://images.unsplash.com/photo-test');
  });
});
