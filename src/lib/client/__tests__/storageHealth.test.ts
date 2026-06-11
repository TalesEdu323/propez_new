import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearStorageHealthCache, fetchStorageHealth } from '../storageHealth.js';

describe('fetchStorageHealth', () => {
  afterEach(() => {
    clearStorageHealthCache();
    vi.unstubAllGlobals();
  });

  it('usa boot-check e lê storage mesmo com HTTP 503', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          ok: false,
          storage: { hasBlobToken: true, pdfMode: 'blob' },
        }),
      }),
    );

    await expect(fetchStorageHealth(true)).resolves.toEqual({
      hasBlobToken: true,
      pdfMode: 'blob',
    });
    expect(fetch).toHaveBeenCalledWith('/api/boot-check', {
      credentials: 'include',
      cache: 'no-store',
    });
  });

  it('retorna defaults em dev quando boot-check falha', async () => {
    vi.stubGlobal('import.meta', { env: { PROD: false } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('offline')),
    );

    await expect(fetchStorageHealth(true)).resolves.toEqual({
      hasBlobToken: false,
      pdfMode: 'disk',
    });
  });
});
