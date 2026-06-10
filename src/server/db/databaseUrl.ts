/**
 * Normaliza sslmode=require → verify-full (pg v8 warning; compatível com pg v9).
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizeDatabaseUrl(url: string): string {
  if (!url.includes('sslmode=require')) return url;
  return url.replace(/([?&])sslmode=require\b/, '$1sslmode=verify-full');
}

/** URL remota Neon/cloud com TLS explícito na query string. */
export function databaseUrlNeedsSsl(url: string): boolean {
  return (
    /sslmode=(require|verify-full|verify-ca|prefer)/.test(url) || url.includes('neon.tech')
  );
}
