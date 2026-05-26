import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, CreditCard, Save, X } from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { formatBRL, formatDateBR } from '../../lib/format';
import type { NavigateFn } from '../../types/navigation';

interface AdminSubscription {
  organizationId: string;
  organizationName: string;
  plan: string | null;
  billingCycle: string | null;
  status: 'active' | 'trial' | 'inactive';
  mrr: number;
  planStartedAt: string | null;
  planRenewsAt: string | null;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'business', label: 'Business' },
];

const CYCLE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-amber-100 text-amber-700',
  inactive: 'bg-zinc-100 text-zinc-500',
};

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-zinc-100 text-zinc-600',
  pro: 'bg-amber-100 text-amber-700',
  business: 'bg-violet-100 text-violet-700',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativa',
  trial: 'Trial',
  inactive: 'Inativa',
};

export default function AdminSubscriptions({ navigate }: { navigate: NavigateFn }) {
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AdminSubscription | null>(null);
  const [form, setForm] = useState({
    plan: 'free',
    billingCycle: '',
    planRenewsAt: '',
    trialEndsAt: '',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<AdminSubscription[]>('/api/admin/subscriptions');
      setSubs(data);
    } catch (err) {
      console.error('[admin/subs] erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar assinaturas');
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

  const openEdit = (sub: AdminSubscription) => {
    setEditing(sub);
    setForm({
      plan: (sub.plan ?? 'free') as string,
      billingCycle: sub.billingCycle ?? '',
      planRenewsAt: sub.planRenewsAt ? sub.planRenewsAt.slice(0, 10) : '',
      trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.slice(0, 10) : '',
    });
  };

  const closeEdit = () => {
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/api/admin/organizations/${editing.organizationId}`, {
        plan: form.plan,
        billingCycle: form.billingCycle === '' ? null : form.billingCycle,
        planRenewsAt: form.planRenewsAt
          ? new Date(form.planRenewsAt).toISOString()
          : null,
        trialEndsAt: form.trialEndsAt
          ? new Date(form.trialEndsAt).toISOString()
          : null,
      });
      await load();
      setEditing(null);
    } catch (err) {
      console.error('[admin/subs/save] erro:', err);
      alert(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter(
      (s) =>
        s.organizationName.toLowerCase().includes(q) ||
        (s.stripeCustomerId ?? '').toLowerCase().includes(q) ||
        (s.stripeSubscriptionId ?? '').toLowerCase().includes(q),
    );
  }, [subs, query]);

  const totalMrr = filtered.reduce((sum, s) => sum + s.mrr, 0);
  const activeCount = filtered.filter((s) => s.status === 'active').length;

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-subscriptions"
      title="Assinaturas"
      subtitle={`${activeCount} ativas • MRR filtrado ${formatBRL(totalMrr)}`}
      onRefresh={handleRefresh}
      refreshing={refreshing}
    >
      <div className="apple-card p-4 md:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por organização, customer ou subscription ID…"
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </div>
      </div>

      {loading && (
        <div className="apple-card p-12 flex items-center justify-center text-zinc-500">
          Carregando assinaturas…
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
                  <th className="text-right font-semibold px-5 py-3">MRR</th>
                  <th className="text-left font-semibold px-5 py-3">Próx. ciclo</th>
                  <th className="text-left font-semibold px-5 py-3">Stripe</th>
                  <th className="text-right font-semibold px-5 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-500">
                      Nenhuma assinatura encontrada.
                    </td>
                  </tr>
                )}
                {filtered.map((s) => (
                  <tr
                    key={s.organizationId}
                    className="border-t border-black/[0.04] hover:bg-zinc-50/40"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900">
                            {s.organizationName}
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            criada {formatDateBR(s.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          PLAN_BADGE[(s.plan ?? 'free').toLowerCase()] ?? PLAN_BADGE.free
                        }`}
                      >
                        {s.plan ?? 'free'}
                        {s.billingCycle && (
                          <span className="ml-1 opacity-70">
                            • {s.billingCycle === 'yearly' ? 'anual' : 'mensal'}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          STATUS_BADGE[s.status]
                        }`}
                      >
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {formatBRL(s.mrr)}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">
                      {s.planRenewsAt
                        ? formatDateBR(s.planRenewsAt)
                        : s.trialEndsAt
                          ? `Trial até ${formatDateBR(s.trialEndsAt)}`
                          : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[11px] text-zinc-400 font-mono">
                      {s.stripeSubscriptionId ?? s.stripeCustomerId ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openEdit(s)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-zinc-900 text-white hover:bg-zinc-800 transition-all"
                      >
                        Ajustar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
          onClick={closeEdit}
        >
          <div
            className="apple-card bg-white w-full max-w-lg p-6 md:p-8 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">
                  Ajustar assinatura
                </h2>
                <p className="text-sm text-zinc-500 mt-1">
                  {editing.organizationName}
                </p>
              </div>
              <button
                onClick={closeEdit}
                className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Plano
                </label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  className="mt-1.5 w-full px-3 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Ciclo
                </label>
                <select
                  value={form.billingCycle}
                  onChange={(e) =>
                    setForm({ ...form, billingCycle: e.target.value })
                  }
                  className="mt-1.5 w-full px-3 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm"
                >
                  {CYCLE_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Renova em
                  </label>
                  <input
                    type="date"
                    value={form.planRenewsAt}
                    onChange={(e) =>
                      setForm({ ...form, planRenewsAt: e.target.value })
                    }
                    className="mt-1.5 w-full px-3 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    Trial até
                  </label>
                  <input
                    type="date"
                    value={form.trialEndsAt}
                    onChange={(e) =>
                      setForm({ ...form, trialEndsAt: e.target.value })
                    }
                    className="mt-1.5 w-full px-3 py-2.5 bg-zinc-50 border border-black/5 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={closeEdit}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-100 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
