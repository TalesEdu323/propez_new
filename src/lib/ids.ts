/**
 * Gerador de IDs único para a aplicação.
 * Usa crypto.randomUUID quando disponível, com fallback seguro.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const random = Math.random().toString(36).slice(2, 11);
  const time = Date.now().toString(36);
  return `${time}-${random}`;
}
