const CHUNK_RELOAD_KEY = 'propez:chunk-reload';

const CHUNK_LOAD_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Expected a JavaScript-or-Wasm module script/i;

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return CHUNK_LOAD_ERROR.test(msg);
}

export function clearChunkReloadFlag(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
}

/** Recarrega a página uma vez após deploy quando um chunk lazy ficou stale. */
export function reloadOnceOnChunkError(): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  window.location.reload();
  return true;
}

export function registerChunkLoadRecovery(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) return;
    if (reloadOnceOnChunkError()) {
      event.preventDefault();
    }
  });

  // Após atualização do service worker, recarrega para pegar bundles novos.
  let swRefreshing = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (swRefreshing) return;
    swRefreshing = true;
    window.location.reload();
  });
}
