import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Ticket } from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { formatDateBR } from '../../lib/format';
import type { NavigateFn } from '../../types/navigation';

interface AdminCoupon {
  id: string;
  code: string;
  name: string;
  discountType: 'percent' | 'free_months' | 'trial_days';
  discountValue: number;
  duration: string;
  durationInMonths: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  appliesToPlans: string[] | null;
  status: string;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  percent: 'Desconto %',
  free_months: 'Meses grátis',
  trial_days: 'Dias de trial',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-zinc-100 text-zinc-500',
};

function describeCoupon(c: AdminCoupon): string {
  if (c.discountType === 'percent') {
    const dur =
      c.duration === 'forever' ? 'para sempre' :
      c.duration === 'repeating' ? `${c.durationInMonths ?? 1} meses` : '1x';
    return `${c.discountValue}% off · ${dur}`;
  }
  if (c.discountType === 'free_months') {
    return `${c.discountValue} ${c.discountValue === 1 ? 'mês grátis' : 'meses grátis'}`;
  }
  return `${c.discountValue} dias de trial`;
}

export default function AdminCoupons({ navigate }: { navigate: NavigateFn }) {
  const [rows, setRows] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    discountType: 'percent' as 'percent' | 'free_months' | 'trial_days',
    discountValue: 20,
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationInMonths: 3,
    maxRedemptions: '',
    expiresAt: '',
    appliesPro: true,
    appliesBusiness: true,
  });

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get<AdminCoupon[]>('/api/admin/coupons');
      setRows(data);
    } catch (err) {
      console.error('[admin/coupons]', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar cupons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createCoupon = async () => {
    setSaving(true);
    try {
      const appliesToPlans: string[] = [];
      if (form.appliesPro) appliesToPlans.push('pro');
      if (form.appliesBusiness) appliesToPlans.push('business');

      await api.post('/api/admin/coupons', {
        code: form.code.toUpperCase(),
        name: form.name || form.code.toUpperCase(),
        discountType: form.discountType,
        discountValue: form.discountValue,
        duration: form.discountType === 'percent' ? form.duration : undefined,
        durationInMonths: form.discountType === 'percent' && form.duration === 'repeating' ? form.durationInMonths : null,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        appliesToPlans: appliesToPlans.length > 0 ? appliesToPlans : null,
      });
      setShowForm(false);
      setForm({
        code: '', name: '', discountType: 'percent', discountValue: 20,
        duration: 'once', durationInMonths: 3, maxRedemptions: '', expiresAt: '',
        appliesPro: true, appliesBusiness: true,
      });
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar cupom');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    if (!window.confirm('Desativar este cupom?')) return;
    try {
      await api.patch(`/api/admin/coupons/${id}`, { action: 'deactivate' });
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao desativar');
    }
  };

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-coupons"
      title="Cupons"
      subtitle="Descontos percentuais, meses grátis e trial — sincronizados com Stripe"
      onRefresh={() => { setRefreshing(true); void load(); }}
      refreshing={refreshing || loading}
    >
      <div className="mb-6 flex justify-between items-center gap-4">
        <p className="text-sm text-zinc-500 flex items-center gap-2">
          <Ticket className="w-4 h-4" />
          {rows.filter((r) => r.status === 'active').length} cupons ativos
        </p>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary text-sm inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo cupom
        </button>
      </div>

      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

      {showForm && (
        <div className="apple-card p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-zinc-900">Criar cupom</h3>
            <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-zinc-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Código</span>
              <input className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10 uppercase font-mono" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LAUNCH50" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome interno</span>
              <input className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Tipo</span>
              <select className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as typeof form.discountType })}>
                <option value="percent">Desconto %</option>
                <option value="free_months">Meses grátis</option>
                <option value="trial_days">Dias de trial</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                {form.discountType === 'percent' ? 'Percentual (%)' : form.discountType === 'free_months' ? 'Meses grátis' : 'Dias de trial'}
              </span>
              <input type="number" min={1} max={form.discountType === 'percent' ? 100 : form.discountType === 'trial_days' ? 90 : 12} className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} />
            </label>
            {form.discountType === 'percent' && (
              <>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Duração</span>
                  <select className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value as typeof form.duration })}>
                    <option value="once">Uma vez</option>
                    <option value="repeating">Recorrente</option>
                    <option value="forever">Para sempre</option>
                  </select>
                </label>
                {form.duration === 'repeating' && (
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Meses de recorrência</span>
                    <input type="number" min={1} max={36} className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.durationInMonths} onChange={(e) => setForm({ ...form, durationInMonths: Number(e.target.value) })} />
                  </label>
                )}
              </>
            )}
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Limite de usos</span>
              <input type="number" min={1} className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" placeholder="Ilimitado" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Expira em</span>
              <input type="datetime-local" className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </label>
            <div className="block md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Planos</span>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.appliesPro} onChange={(e) => setForm({ ...form, appliesPro: e.target.checked })} /> Pro
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.appliesBusiness} onChange={(e) => setForm({ ...form, appliesBusiness: e.target.checked })} /> Business
                </label>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-xl bg-zinc-50 text-sm text-zinc-600">
            Preview: <strong>{form.code || 'CODIGO'}</strong> — {describeCoupon({
              ...form,
              id: '', name: form.name, durationInMonths: form.durationInMonths,
              maxRedemptions: null, redemptionCount: 0, expiresAt: null,
              appliesToPlans: null, status: 'active', createdAt: '',
            } as AdminCoupon)}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="button" className="btn-primary text-sm" disabled={!form.code || saving} onClick={() => void createCoupon()}>
              {saving ? 'Criando no Stripe…' : 'Criar cupom'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Carregando…</p>
      ) : (
        <div className="apple-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left text-zinc-500">
                <th className="p-4">Código</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Benefício</th>
                <th className="p-4">Usos</th>
                <th className="p-4">Validade</th>
                <th className="p-4">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 hover:bg-zinc-50/50">
                  <td className="p-4 font-mono font-bold">{row.code}</td>
                  <td className="p-4">{TYPE_LABEL[row.discountType] ?? row.discountType}</td>
                  <td className="p-4">{describeCoupon(row)}</td>
                  <td className="p-4">
                    {row.redemptionCount}
                    {row.maxRedemptions != null ? ` / ${row.maxRedemptions}` : ''}
                  </td>
                  <td className="p-4">{row.expiresAt ? formatDateBR(row.expiresAt) : '—'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[row.status] ?? STATUS_BADGE.inactive}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {row.status === 'active' && (
                      <button type="button" onClick={() => void deactivate(row.id)} className="text-xs font-bold text-red-600 hover:underline">
                        Desativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-zinc-400">Nenhum cupom criado</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
