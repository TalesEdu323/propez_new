const CHUNK_RELOAD_KEY = 'propez:chunk-reload';
const CHUNK_RELOAD_COUNT_KEY = 'propez:chunk-reload-count';
const MAX_CHUNK_RELOADS = 2;

const CHUNK_LOAD_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Expected a JavaScript-or-Wasm module script|Loading chunk \d+ failed|Loading CSS chunk \d+ failed|ChunkLoadError|Unable to preload CSS|dynamically imported module/i;

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return CHUNK_LOAD_ERROR.test(msg);
}

export function clearChunkReloadFlag(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  sessionStorage.removeItem(CHUNK_RELOAD_COUNT_KEY);
}

function getChunkReloadCount(): number {
  if (typeof window === 'undefined') return MAX_CHUNK_RELOADS;
  const raw = sessionStorage.getItem(CHUNK_RELOAD_COUNT_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Recarrega a página após deploy quando um chunk lazy ficou stale (até MAX_CHUNK_RELOADS vezes). */
export function reloadOnceOnChunkError(): boolean {
  if (typeof window === 'undefined') return false;
  const count = getChunkReloadCount();
  if (count >= MAX_CHUNK_RELOADS) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
  sessionStorage.setItem(CHUNK_RELOAD_COUNT_KEY, String(count + 1));
  const url = new URL(window.location.href);
  url.searchParams.set('_chunk', String(Date.now()));
  window.location.replace(url.toString());
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
