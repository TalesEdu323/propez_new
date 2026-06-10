/**
 * SSL para scripts CLI que instanciam pg.Pool diretamente.
 */
export function databaseUrlNeedsSsl(url) {
  return (
    /sslmode=(require|verify-full|verify-ca|prefer)/.test(url) || url.includes('neon.tech')
  );
}

export function poolSslOption(url) {
  return databaseUrlNeedsSsl(url) ? { rejectUnauthorized: false } : undefined;
}
