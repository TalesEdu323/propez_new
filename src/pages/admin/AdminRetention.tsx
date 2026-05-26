import { useCallback, useEffect, useState } from 'react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { formatBRL } from '../../lib/format';
import type { NavigateFn } from '../../types/navigation';

interface RetentionOverview {
  monthlyLogoChurn: number;
  monthlyRevenueChurnCents: number;
  upgradesThisMonth: number;
  downgradesThisMonth: number;
  activeByPlan: { plan: string; count: number }[];
}

interface Cohort {
  month: string;
  size: number;
  retained: number;
  retentionPct: number;
}

interface AtRiskOrg {
  id: string;
  name: string;
  plan: string | null;
  mrrCents: number;
  health: { score: number; level: string; factors: string[] };
}

export default function AdminRetention({ navigate }: { navigate: NavigateFn }) {
  const [overview, setOverview] = useState<RetentionOverview | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, c, r] = await Promise.all([
        api.get<RetentionOverview>('/api/admin/retention/overview'),
        api.get<{ cohorts: Cohort[] }>('/api/admin/retention/cohorts?months=12'),
        api.get<{ organizations: AtRiskOrg[] }>('/api/admin/retention/at-risk'),
      ]);
      setOverview(o);
      setCohorts(c.cohorts);
      setAtRisk(r.organizations);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const healthColor: Record<string, string> = {
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
  };

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-retention"
      title="Retenção e Churn"
      subtitle="Cohorts, expansão e clientes em risco."
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      refreshing={refreshing}
    >
      {loading ? (
        <div className="apple-card p-12 text-center text-zinc-500">Carregando…</div>
      ) : (
        <>
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500 uppercase">Churn logo (mês)</p>
                <p className="text-2xl font-bold mt-1">{overview.monthlyLogoChurn}</p>
              </div>
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500 uppercase">Churn receita</p>
                <p className="text-2xl font-bold mt-1">
                  {formatBRL(overview.monthlyRevenueChurnCents / 100)}
                </p>
              </div>
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500 uppercase">Upgrades</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{overview.upgradesThisMonth}</p>
              </div>
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500 uppercase">Downgrades</p>
                <p className="text-2xl font-bold mt-1 text-amber-600">{overview.downgradesThisMonth}</p>
              </div>
            </div>
          )}

          <div className="apple-card p-6 overflow-x-auto">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase mb-4">Cohort (retenção por safra)</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-black/5">
                  <th className="pb-2 pr-4">Safra</th>
                  <th className="pb-2 pr-4">Entradas</th>
                  <th className="pb-2 pr-4">Retidos</th>
                  <th className="pb-2">%</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.month} className="border-b border-black/[0.03]">
                    <td className="py-2.5 font-medium">{c.month}</td>
                    <td className="py-2.5">{c.size}</td>
                    <td className="py-2.5">{c.retained}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.retentionPct >= 70
                            ? 'bg-green-100 text-green-700'
                            : c.retentionPct >= 40
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {c.retentionPct.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="apple-card p-6">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase mb-4">Clientes em risco</h2>
            {atRisk.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum cliente em zona de risco.</p>
            ) : (
              <div className="space-y-2">
                {atRisk.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => navigate('admin-organization-detail', { id: o.id })}
                    className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border border-black/5 hover:bg-zinc-50 text-left"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900">{o.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {o.plan ?? 'free'} · {formatBRL(o.mrrCents / 100)} MRR
                      </p>
                      {o.health.factors[0] && (
                        <p className="text-xs text-zinc-400 mt-1">{o.health.factors[0]}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold ${
                        healthColor[o.health.level] ?? healthColor.yellow
                      }`}
                    >
                      {o.health.score}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
