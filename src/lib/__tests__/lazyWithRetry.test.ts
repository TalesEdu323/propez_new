import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from '../chunkLoadError';

describe('isChunkLoadError', () => {
  it('detecta falhas comuns de import dinâmico', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});
