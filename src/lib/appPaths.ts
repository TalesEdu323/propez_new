/** Base URL do painel autenticado (rotas internas via ?route=). */
export const APP_BASE_PATH = '/app';

export function appPath(search = ''): string {
  if (!search) return APP_BASE_PATH;
  return search.startsWith('?') ? `${APP_BASE_PATH}${search}` : `${APP_BASE_PATH}?${search}`;
}
