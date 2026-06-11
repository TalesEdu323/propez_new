import { describe, expect, it, vi } from 'vitest';
import { isChunkLoadError } from '../chunkLoadError';

describe('isChunkLoadError', () => {
  it('detecta falhas comuns de import dinâmico', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});

describe('lazyWithRetry', () => {
  it('retenta import até obter sucesso', async () => {
    vi.useFakeTimers();
    const { lazyWithRetry } = await import('../lazyWithRetry');
    const factory = vi
      .fn<() => Promise<{ default: () => null }>>()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce({ default: () => null });

    const load = lazyWithRetry(factory);
    const promise = (load as unknown as { _payload: { _result: Promise<unknown> } })._payload._result;
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ default: expect.any(Function) });
    expect(factory).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
