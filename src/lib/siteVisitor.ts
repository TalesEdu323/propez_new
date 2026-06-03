/** Garante cookie propez_vid (HttpOnly) e retorna visitorId do servidor. */
export async function ensureSiteVisitor(): Promise<string | null> {
  try {
    const res = await fetch('/api/site/visitor', { credentials: 'include' });
    if (!res.ok) return null;
    const data = (await res.json()) as { visitorId?: string };
    return data.visitorId ?? null;
  } catch {
    return null;
  }
}
