import type { Proposta } from './store';

export type DateFilterMode = 'month' | 'year' | 'custom';

export type PropostaStatus = Proposta['status'];

export interface DateFilterState {
  mode: DateFilterMode;
  year: number;
  /** 0 = janeiro */
  month: number;
  customStart: string;
  customEnd: string;
}

export interface StatusBucket {
  count: number;
  value: number;
}

export interface StatusBreakdown {
  pendente: StatusBucket;
  aprovada: StatusBucket;
  recusada: StatusBucket;
}

export interface MonthBreakdown {
  month: number;
  label: string;
  stats: StatusBreakdown;
  revenue: number;
}

export const MONTH_LABELS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

export const MONTH_LABELS_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseProposalDate(iso: string): Date {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

export function defaultDateFilterState(): DateFilterState {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${y}-${pad(m + 1)}-01`;
  const end = `${y}-${pad(m + 1)}-${pad(now.getDate())}`;
  return {
    mode: 'month',
    year: y,
    month: m,
    customStart: start,
    customEnd: end,
  };
}

export function getFilterRange(filter: DateFilterState): { start: Date; end: Date; label: string } {
  if (filter.mode === 'month') {
    const start = startOfDay(new Date(filter.year, filter.month, 1));
    const end = endOfDay(new Date(filter.year, filter.month + 1, 0));
    return {
      start,
      end,
      label: `${MONTH_LABELS_LONG[filter.month]} ${filter.year}`,
    };
  }

  if (filter.mode === 'year') {
    const start = startOfDay(new Date(filter.year, 0, 1));
    const end = endOfDay(new Date(filter.year, 11, 31));
    return {
      start,
      end,
      label: String(filter.year),
    };
  }

  const startRaw = filter.customStart ? new Date(`${filter.customStart}T00:00:00`) : new Date();
  const endRaw = filter.customEnd ? new Date(`${filter.customEnd}T23:59:59`) : new Date();
  let start = startOfDay(startRaw);
  let end = endOfDay(endRaw);
  if (start > end) [start, end] = [end, start];

  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    start,
    end,
    label: `${fmt(start)} – ${fmt(end)}`,
  };
}

export function filterPropostasInRange(
  propostas: Proposta[],
  start: Date,
  end: Date,
): Proposta[] {
  const t0 = start.getTime();
  const t1 = end.getTime();
  return propostas.filter((p) => {
    const t = parseProposalDate(p.data_criacao).getTime();
    return t >= t0 && t <= t1;
  });
}

export function emptyBreakdown(): StatusBreakdown {
  return {
    pendente: { count: 0, value: 0 },
    aprovada: { count: 0, value: 0 },
    recusada: { count: 0, value: 0 },
  };
}

export function aggregateByStatus(propostas: Proposta[]): StatusBreakdown {
  const stats = emptyBreakdown();
  for (const p of propostas) {
    const bucket = stats[p.status];
    bucket.count += 1;
    bucket.value += p.valor ?? 0;
  }
  return stats;
}

export function approvedRevenue(stats: StatusBreakdown): number {
  return stats.aprovada.value;
}

export function conversionPercent(stats: StatusBreakdown): number {
  const total = stats.pendente.count + stats.aprovada.count + stats.recusada.count;
  if (total === 0) return 0;
  return Math.round((stats.aprovada.count / total) * 100);
}

export function breakdownByMonthInYear(
  propostas: Proposta[],
  year: number,
): MonthBreakdown[] {
  return MONTH_LABELS_SHORT.map((label, month) => {
    const start = startOfDay(new Date(year, month, 1));
    const end = endOfDay(new Date(year, month + 1, 0));
    const slice = filterPropostasInRange(propostas, start, end);
    const stats = aggregateByStatus(slice);
    return {
      month,
      label,
      stats,
      revenue: approvedRevenue(stats),
    };
  });
}

export function paidInRange(propostas: Proposta[], start: Date, end: Date): number {
  return filterPropostasInRange(propostas, start, end)
    .filter((p) => p.pago)
    .reduce((acc, p) => acc + (p.valor ?? 0), 0);
}

export function pendingPaymentInRange(propostas: Proposta[], start: Date, end: Date): number {
  return filterPropostasInRange(propostas, start, end)
    .filter((p) => p.status === 'aprovada' && !p.pago)
    .reduce((acc, p) => acc + (p.valor ?? 0), 0);
}
