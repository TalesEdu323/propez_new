export type PdfStorageMode = 'blob' | 'bytea' | 'disk';

export type StorageHealth = {
  hasBlobToken: boolean;
  pdfMode: PdfStorageMode;
};

let cache: { at: number; data: StorageHealth } | null = null;
const CACHE_TTL_MS = 60_000;

const DEFAULT: StorageHealth = { hasBlobToken: false, pdfMode: 'disk' };

export async function fetchStorageHealth(force = false): Promise<StorageHealth> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }
  try {
    const res = await fetch('/api/health', { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return DEFAULT;
    const json = (await res.json()) as { storage?: Partial<StorageHealth> };
    const data: StorageHealth = {
      hasBlobToken: Boolean(json.storage?.hasBlobToken),
      pdfMode: json.storage?.pdfMode ?? DEFAULT.pdfMode,
    };
    cache = { at: Date.now(), data };
    return data;
  } catch {
    return DEFAULT;
  }
}

export function clearStorageHealthCache(): void {
  cache = null;
}

/** Upload direto ao Blob só em produção com token configurado no servidor. */
export async function shouldUseClientBlobUpload(): Promise<boolean> {
  if (!import.meta.env.PROD) return false;
  const health = await fetchStorageHealth();
  return health.hasBlobToken && health.pdfMode === 'blob';
}
