/**
 * Utilitários de formatação compartilhados.
 * Centralizam regras de moeda e data para evitar duplicação e divergência.
 */

export interface FormatBRLOptions {
  fractionDigits?: number;
  compact?: boolean;
}

const brlFormatterCache = new Map<string, Intl.NumberFormat>();

function getBRLFormatter(fractionDigits: number, compact: boolean): Intl.NumberFormat {
  const key = `${fractionDigits}:${compact ? '1' : '0'}`;
  let formatter = brlFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      ...(compact ? { notation: 'compact' } : {}),
    });
    brlFormatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatBRL(value: number | string | null | undefined, options: FormatBRLOptions = {}): string {
  const fractionDigits = options.fractionDigits ?? 2;
  const numeric = typeof value === 'string' ? Number(value) : value ?? 0;
  const safe = Number.isFinite(numeric) ? numeric : 0;
  return getBRLFormatter(fractionDigits, options.compact ?? false).format(safe as number);
}

export type DateVariant = 'short' | 'long' | 'datetime';

export function formatDateBR(value: string | Date | null | undefined, variant: DateVariant = 'short'): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  switch (variant) {
    case 'long':
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    case 'datetime':
      return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    case 'short':
    default:
      return date.toLocaleDateString('pt-BR');
  }
}
