export function isBlobUrl(urlOrPath: string): boolean {
  return urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://');
}

export function isAllowedBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'blob.vercel-storage.com' || host.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}
