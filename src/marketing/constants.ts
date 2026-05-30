/** Rotas de marketing (exceto `/`, tratada por HomeRoute). */
export const MARKETING_PATHS = [
  '/sobre-nos',
  '/planos',
  '/blog',
  '/login',
  '/cadastro',
  '/termos',
  '/privacidade',
  '/newsletter/unsubscribe',
] as const;

export function isMarketingPath(pathname: string): boolean {
  if (pathname === '/') return false;
  if (MARKETING_PATHS.includes(pathname as (typeof MARKETING_PATHS)[number])) return true;
  if (pathname.startsWith('/blog/')) return true;
  return false;
}

export const WHATSAPP_URL =
  import.meta.env.VITE_WHATSAPP_URL || 'https://wa.me/5511999999999';
