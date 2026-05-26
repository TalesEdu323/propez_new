import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Building2, ExternalLink } from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { formatBRL, formatDateBR } from '../../lib/format';
import type { NavigateFn } from '../../types/navigation';

interface AdminOrg {
  id: string;
  name: string;
  cnpj: string | null;
  plan: string | null;
  billingCycle: string | null;
  trialEndsAt: string | null;
  planStartedAt: string | null;
  planRenewsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  onboarded: boolean;
  createdAt: string;
  memberCount: number;
  mrr: number;
  status: 'active' | 'trial' | 'inactive';
}

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-zinc-100 text-zinc-600',
  pro: 'bg-amber-100 text-amber-700',
  business: 'bg-violet-100 text-violet-700',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-amber-100 text-amber-700',
  inactive: 'bg-zinc-100 text-zinc-500',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa',
  trial: 'Trial',
  inactive: 'Inativa',
};

export default function AdminOrganizations({ navigate }: { navigate: NavigateFn }) {
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<AdminOrg[]>('/api/admin/organizations');
      setOrgs(data);
    } catch (err) {
      console.error('[admin/orgs] erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar organizações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orgs.filter((o) => {
      if (planFilter !== 'all' && (o.plan ?? 'free') !== planFilter) return false;
      if (!q) return true;
      return (
        o.name.toLowerCase().includes(q) ||
        (o.cnpj ?? '').toLowerCase().includes(q) ||
        (o.stripeCustomerId ?? '').toLowerCase().includes(q)
      );
    });
  }, [orgs, query, planFilter]);

  const totalMrr = filtered.reduce((sum, o) => sum + (o.status !== 'inactive' ? o.mrr : 0), 0);

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-organizations"
      title="Organizações"
      subtitle={`${orgs.length} organizações cadastradas • MRR filtrado ${formatBRL(totalMrr)}`}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
      <div className="apple-card p-4 md:p-5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, CNPJ ou customer Stripe…"
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'free', 'pro', 'business'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                planFilter === p
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-50 text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {p === 'all' ? 'Todos' : p}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="apple-card p-12 flex items-center justify-center text-zinc-500">
          Carregando organizações…
        </div>
      )}

      {error && !loading && (
        <div className="apple-card p-6 border border-red-100 bg-red-50/40 text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="apple-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50/60 text-zinc-500 text-[11px] uppercase tracking-wider">
                  <th className="text-left font-semibold px-5 py-3">Organização</th>
                  <th className="text-left font-semibold px-5 py-3">Plano</th>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                  <th className="text-right font-semibold px-5 py-3">Membros</th>
                  <th className="text-right font-semibold px-5 py-3">MRR</th>
                  <th className="text-left font-semibold px-5 py-3">Renova em</th>
                  <th className="text-left font-semibold px-5 py-3">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                      Nenhuma organização encontrada com os filtros atuais.
                    </td>
                  </tr>
                )}
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-t border-black/[0.04] hover:bg-zinc-50/40 cursor-pointer"
                    onClick={() => navigate('admin-organization-detail', { id: o.id })}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900">{o.name}</div>
                          {o.cnpj && (
                            <div className="text-xs text-zinc-500">CNPJ {o.cnpj}</div>
                          )}
                          {o.stripeCustomerId && (
                            <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                              <ExternalLink className="w-3 h-3" />
                              {o.stripeCustomerId}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          PLAN_BADGE[(o.plan ?? 'free').toLowerCase()] ?? PLAN_BADGE.free
                        }`}
                      >
                        {o.plan ?? 'free'}
                        {o.billingCycle && (
                          <span className="ml-1 opacity-70">
                            • {o.billingCycle === 'yearly' ? 'anual' : 'mensal'}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          STATUS_BADGE[o.status]
                        }`}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{o.memberCount}</td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {formatBRL(o.mrr)}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">
                      {o.planRenewsAt ? formatDateBR(o.planRenewsAt) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">
                      {formatDateBR(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
