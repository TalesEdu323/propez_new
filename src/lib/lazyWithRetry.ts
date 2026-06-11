import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError } from './chunkLoadError';

const DEFAULT_RETRIES = 3;
const DEFAULT_DELAY_MS = 800;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * lazy() com retentativas automáticas para falhas transitórias de rede ou chunks stale pós-deploy.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries = DEFAULT_RETRIES,
  delayMs = DEFAULT_DELAY_MS,
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        const canRetry = isChunkLoadError(err) || attempt < retries - 1;
        if (!canRetry) break;
        await wait(delayMs * (attempt + 1));
      }
    }
    throw lastError;
  });
}
