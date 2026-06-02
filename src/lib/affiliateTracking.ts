const AFFILIATE_COOKIE = 'propez_ref';
const SESSION_COOKIE = 'propez_sid';
const COOKIE_MAX_AGE_DAYS = 90;

function setCookie(name: string, value: string): void {
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getOrCreateSessionId(): string {
  const existing = getCookie(SESSION_COOKIE);
  if (existing) return existing;
  const sid = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  setCookie(SESSION_COOKIE, sid);
  return sid;
}

export function captureAffiliateFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref')?.trim();
  if (ref) {
    setCookie(AFFILIATE_COOKIE, ref.toUpperCase());
    void fetch('/api/affiliate/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        affiliateCode: ref,
        sessionId: getOrCreateSessionId(),
        path: window.location.pathname,
      }),
    }).catch(() => {});
    return ref.toUpperCase();
  }
  return getAffiliateCode();
}

export function getAffiliateCode(): string | null {
  const code = getCookie(AFFILIATE_COOKIE);
  return code ? code.toUpperCase() : null;
}

export function getAffiliateSessionId(): string {
  return getOrCreateSessionId();
}

export function captureCouponFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const coupon = params.get('coupon')?.trim();
  return coupon ? coupon.toUpperCase() : null;
}

export function trackAffiliatePageView(): void {
  const code = getAffiliateCode();
  if (!code) return;
  void fetch('/api/affiliate/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      affiliateCode: code,
      sessionId: getOrCreateSessionId(),
      path: window.location.pathname,
    }),
  }).catch(() => {});
}

export async function validateCouponCode(
  code: string,
  plan?: string,
): Promise<{ valid: boolean; description?: string; error?: string }> {
  const params = new URLSearchParams({ code });
  if (plan) params.set('plan', plan);
  const res = await fetch(`/api/affiliate/validate?${params}`);
  const data = await res.json();
  return data;
}
