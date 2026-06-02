const SAFE_IMAGE_PROTOCOLS = /^(https?:|data:|blob:)/i;

export function isSafeImageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('imageGeneratePrompt:') || trimmed.startsWith('imagegenerateprompt:')) {
    return false;
  }
  return SAFE_IMAGE_PROTOCOLS.test(trimmed);
}

export function pickSafeImageUrl(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (isSafeImageUrl(c)) return c;
  }
  return undefined;
}
