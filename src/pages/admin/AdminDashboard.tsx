import { useCallback, useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Users,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { formatBRL } from '../../lib/format';
import type { NavigateFn } from '../../types/navigation';

interface RevenueOverview {
  mrrBrl: number;
  mrrMomPct: number;
  arrCents: number;
  arpuCents: number;
  activePaidOrgs: number;
  nrr: number;
  logoChurnRate: number;
  trialToPaidRate: number;
  mrrByPlan: Record<string, number>;
  failedPayments: { last7Days: number; last30Days: number };
  dunning: { pastDueCount: number; pastDueMrrCents: number; mrrDivergence: boolean };
}

interface MrrPoint {
  date: string;
  mrrCents: number;
  estimated?: boolean;
}

interface MrrBreakdown {
  newMrrCents: number;
  expansionCents: number;
  contractionCents: number;
  churnCents: number;
  reactivationCents: number;
}

function KpiCard({
  label,
  value,
  hint,
  delta,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  icon: React.ReactNode;
}) {
  const up = delta !== undefined && delta >= 0;
  return (
    <div className="apple-card p-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-[11px] font-semibold uppercase tracking-[0.12em]">
          {label}
        </span>
        <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              up ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(delta).toFixed(1)}% MoM
          </span>
        )}
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
    </div>
  );
}

export default function AdminDashboard({ navigate }: { navigate: NavigateFn }) {
  const [revenue, setRevenue] = useState<RevenueOverview | null>(null);
  const [history, setHistory] = useState<MrrPoint[]>([]);
  const [breakdown, setBreakdown] = useState<MrrBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [rev, hist, br] = await Promise.all([
        api.get<RevenueOverview>('/api/admin/revenue/overview'),
        api.get<{ points: MrrPoint[] }>('/api/admin/revenue/mrr-history?months=12'),
        api.get<MrrBreakdown>('/api/admin/revenue/mrr-breakdown?period=month'),
      ]);
      setRevenue(rev);
      setHistory(
        hist.points.map((p) => ({
          ...p,
          date: new Date(p.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          mrrBrl: p.mrrCents / 100,
        })),
      );
      setBreakdown(br);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const planChart = revenue
    ? Object.entries(revenue.mrrByPlan).map(([plan, mrr]) => ({ plan, mrr }))
    : [];

  const breakdownChart = breakdown
    ? [
        { name: 'Novo', value: breakdown.newMrrCents / 100 },
        { name: 'Expansão', value: breakdown.expansionCents / 100 },
        { name: 'Contração', value: breakdown.contractionCents / 100 },
        { name: 'Churn', value: breakdown.churnCents / 100 },
        { name: 'Reativação', value: breakdown.reactivationCents / 100 },
      ]
    : [];

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-dashboard"
      title="Command Center"
      subtitle="Receita, retenção e alertas em tempo real."
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      refreshing={refreshing}
    >
      {loading && (
        <div className="apple-card p-12 text-center text-zinc-500">Carregando…</div>
      )}
      {error && !loading && (
        <div className="apple-card p-6 border border-red-100 bg-red-50/40 text-red-700">{error}</div>
      )}

      {revenue && !loading && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard
              label="MRR"
              value={formatBRL(revenue.mrrBrl)}
              delta={revenue.mrrMomPct}
              icon={<DollarSign className="w-4 h-4" />}
            />
            <KpiCard
              label="Clientes ativos"
              value={String(revenue.activePaidOrgs)}
              icon={<Users className="w-4 h-4" />}
            />
            <KpiCard
              label="Churn (logo)"
              value={`${revenue.logoChurnRate.toFixed(1)}%`}
              hint="este mês"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KpiCard
              label="NRR"
              value={`${revenue.nrr.toFixed(0)}%`}
              hint={revenue.nrr >= 100 ? 'saudável' : 'atenção'}
              icon={<Percent className="w-4 h-4" />}
            />
            <KpiCard
              label="Trial → Pago"
              value={`${revenue.trialToPaidRate.toFixed(1)}%`}
              icon={<Percent className="w-4 h-4" />}
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="apple-card p-6">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Evolução MRR (12 meses)
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v: number) => [formatBRL(v), 'MRR']} />
                    <Line type="monotone" dataKey="mrrBrl" stroke="#18181b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="apple-card p-6">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                MRR por plano
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={planChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [formatBRL(v), 'MRR']} />
                    <Bar dataKey="mrr" fill="#18181b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="apple-card p-6 lg:col-span-2">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">
                Breakdown MRR (mês)
              </h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdownChart} layout="vertical">
                    <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Bar dataKey="value" fill="#71717a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="apple-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
                Financeiro
              </h2>
              <div>
                <p className="text-xs text-zinc-500">ARR</p>
                <p className="text-xl font-bold">{formatBRL(revenue.arrCents / 100)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">ARPU</p>
                <p className="text-xl font-bold">{formatBRL(revenue.arpuCents / 100)}</p>
              </div>
              <div className="pt-2 border-t border-black/5">
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Falhas de pagamento
                </p>
                <p className="text-sm font-semibold mt-1">
                  {revenue.failedPayments.last7Days} (7d) · {revenue.failedPayments.last30Days} (30d)
                </p>
              </div>
              {revenue.dunning.pastDueCount > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-sm text-amber-800">
                  {revenue.dunning.pastDueCount} assinatura(s) em atraso no Stripe
                  {revenue.dunning.mrrDivergence && ' · divergência MRR local vs Stripe'}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </AdminPageShell>
  );
}
