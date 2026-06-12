import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { formatBRL } from '../../lib/format';
import {
  type DateFilterState,
  type StatusBreakdown,
  type MonthBreakdown,
  MONTH_LABELS_LONG,
  aggregateByStatus,
  approvedRevenue,
  breakdownByMonthInYear,
  conversionPercent,
  filterPropostasInRange,
  getFilterRange,
} from '../../lib/dashboardStats';
import type { Proposta } from '../../lib/store';

const STATUS_META = [
  { key: 'pendente' as const, label: 'Pendentes', bar: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
  { key: 'aprovada' as const, label: 'Aprovadas', bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { key: 'recusada' as const, label: 'Recusadas', bar: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50' },
];

interface ProposalsChartProps {
  propostas: Proposta[];
  filter: DateFilterState;
}

function ComparisonBars({ stats, maxHeight = 140 }: { stats: StatusBreakdown; maxHeight?: number }) {
  const maxCount = Math.max(
    stats.pendente.count,
    stats.aprovada.count,
    stats.recusada.count,
    1,
  );

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end min-h-[160px] pt-2">
      {STATUS_META.map(({ key, label, bar, text, bg }) => {
        const bucket = stats[key];
        const height = Math.max(12, Math.round((bucket.count / maxCount) * maxHeight));
        return (
          <div key={key} className="flex flex-col items-center gap-2">
            <span className="text-lg sm:text-xl font-bold text-zinc-900 tabular-nums">{bucket.count}</span>
            <div
              className="w-full max-w-[88px] mx-auto flex items-end justify-center"
              style={{ height: maxHeight }}
            >
              <div
                className={`w-full rounded-t-xl ${bar} transition-all duration-500`}
                style={{ height }}
                title={`${label}: ${bucket.count}`}
              />
            </div>
            <div className={`text-center rounded-xl px-2 py-1.5 w-full ${bg}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${text}`}>{label}</p>
              <p className="text-xs font-semibold text-zinc-700 mt-0.5 tabular-nums">
                {formatBRL(bucket.value, { fractionDigits: 0 })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function YearMonthlyChart({ months }: { months: MonthBreakdown[] }) {
  const maxCount = Math.max(
    ...months.flatMap((m) => [
      m.stats.pendente.count,
      m.stats.aprovada.count,
      m.stats.recusada.count,
    ]),
    1,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider">
        {STATUS_META.map(({ label, bar }) => (
          <span key={label} className="flex items-center gap-1.5 text-zinc-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${bar}`} />
            {label}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
        <div className="flex items-end gap-1.5 sm:gap-2 min-w-[640px] h-[168px] pt-6">
          {months.map((m) => {
            const totalCount =
              m.stats.pendente.count + m.stats.aprovada.count + m.stats.recusada.count;
            const colHeight = 120;
            const scale = (n: number) => Math.max(n > 0 ? 4 : 0, Math.round((n / maxCount) * colHeight));

            return (
              <div key={m.month} className="flex-1 min-w-[44px] flex flex-col items-center gap-1.5">
                <span className="text-[9px] font-bold text-zinc-400 tabular-nums">{totalCount || ''}</span>
                <div className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden bg-zinc-100/80" style={{ height: colHeight }}>
                  {m.stats.aprovada.count > 0 && (
                    <div
                      className="bg-emerald-500 w-full"
                      style={{ height: scale(m.stats.aprovada.count) }}
                      title={`Aprovadas: ${m.stats.aprovada.count}`}
                    />
                  )}
                  {m.stats.pendente.count > 0 && (
                    <div
                      className="bg-amber-400 w-full"
                      style={{ height: scale(m.stats.pendente.count) }}
                      title={`Pendentes: ${m.stats.pendente.count}`}
                    />
                  )}
                  {m.stats.recusada.count > 0 && (
                    <div
                      className="bg-red-400 w-full"
                      style={{ height: scale(m.stats.recusada.count) }}
                      title={`Recusadas: ${m.stats.recusada.count}`}
                    />
                  )}
                </div>
                <span className="text-[10px] font-semibold text-zinc-500">{m.label}</span>
                {m.revenue > 0 && (
                  <span className="text-[9px] text-emerald-600 font-medium tabular-nums">
                    {formatBRL(m.revenue, { fractionDigits: 0 })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-zinc-400">
        Valores em verde abaixo de cada mês = faturamento de propostas aprovadas.
        Altura da coluna = quantidade por status (empilhado).
      </p>
    </div>
  );
}

export function ProposalsChart({ propostas, filter }: ProposalsChartProps) {
  const { start, end, label } = useMemo(() => getFilterRange(filter), [filter]);

  const filtered = useMemo(
    () => filterPropostasInRange(propostas, start, end),
    [propostas, start, end],
  );

  const stats = useMemo(() => aggregateByStatus(filtered), [filtered]);
  const revenue = approvedRevenue(stats);
  const conversion = conversionPercent(stats);

  const yearMonths = useMemo(() => {
    if (filter.mode !== 'year') return null;
    return breakdownByMonthInYear(propostas, filter.year);
  }, [filter.mode, filter.year, propostas]);

  const totalInPeriod = filtered.length;

  return (
    <div className="relative z-10 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-white shadow-lg shadow-zinc-900/15 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] block">
              Propostas no período
            </span>
            <span className="text-sm font-medium text-zinc-500">{label}</span>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Faturamento (aprovadas)</p>
          <p className="hero-stat !text-2xl md:!text-3xl">{formatBRL(revenue, { fractionDigits: 0 })}</p>
          <p className="text-xs text-zinc-500 mt-1">
            {totalInPeriod} proposta{totalInPeriod !== 1 ? 's' : ''} · {conversion}% conversão
          </p>
        </div>
      </div>

      {filter.mode === 'year' && yearMonths ? (
        <YearMonthlyChart months={yearMonths} />
      ) : (
        <ComparisonBars stats={stats} />
      )}
    </div>
  );
}

interface DateFilterControlsProps {
  filter: DateFilterState;
  onChange: (next: DateFilterState) => void;
}

export function DateFilterControls({ filter, onChange }: DateFilterControlsProps) {
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2];
  }, []);

  const setMode = (mode: DateFilterState['mode']) => onChange({ ...filter, mode });

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-100/80 rounded-xl w-full sm:w-fit">
        {(
          [
            ['month', 'Mês'],
            ['year', 'Ano'],
            ['custom', 'Personalizado'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter.mode === mode
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filter.mode === 'month' && (
          <>
            <select
              value={filter.month}
              onChange={(e) => onChange({ ...filter, month: Number(e.target.value) })}
              className="glass-input !w-auto !py-2 text-xs font-medium min-w-[130px]"
            >
              {MONTH_LABELS_LONG.map((name, i) => (
                <option key={name} value={i}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={filter.year}
              onChange={(e) => onChange({ ...filter, year: Number(e.target.value) })}
              className="glass-input !w-auto !py-2 text-xs font-medium min-w-[88px]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </>
        )}

        {filter.mode === 'year' && (
          <select
            value={filter.year}
            onChange={(e) => onChange({ ...filter, year: Number(e.target.value) })}
            className="glass-input !w-auto !py-2 text-xs font-medium min-w-[88px]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        )}

        {filter.mode === 'custom' && (
          <>
            <label className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
              De
              <input
                type="date"
                value={filter.customStart}
                onChange={(e) => onChange({ ...filter, customStart: e.target.value })}
                className="glass-input !w-auto !py-2 text-xs"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
              Até
              <input
                type="date"
                value={filter.customEnd}
                onChange={(e) => onChange({ ...filter, customEnd: e.target.value })}
                className="glass-input !w-auto !py-2 text-xs"
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
