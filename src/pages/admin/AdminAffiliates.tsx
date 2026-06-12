import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Plus, X, Check, ExternalLink } from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { formatBRL } from '../../lib/format';
import type { NavigateFn } from '../../types/navigation';

interface AdminAffiliate {
  id: string;
  code: string;
  name: string;
  email: string | null;
  commissionPercent: number;
  status: string;
  defaultCouponId: string | null;
  notes: string;
  link?: string;
  clicks: number;
  views: number;
  signups: number;
  subscriptions: number;
  attributedMrrCents: number;
  commissionPendingCents: number;
  commissionPaidCents: number;
}

interface AdminCouponOption {
  id: string;
  code: string;
}

interface AffiliateDetail extends AdminAffiliate {
  link: string;
  events: Array<{
    id: string;
    eventType: string;
    organizationName: string | null;
    createdAt: string;
  }>;
  commissions: Array<{
    id: string;
    organizationName: string | null;
    commissionCents: number;
    status: string;
    createdAt: string;
    stripeInvoiceId: string;
  }>;
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  archived: 'bg-zinc-100 text-zinc-500',
};

export default function AdminAffiliates({ navigate }: { navigate: NavigateFn }) {
  const [rows, setRows] = useState<AdminAffiliate[]>([]);
  const [coupons, setCoupons] = useState<AdminCouponOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<AffiliateDetail | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    code: '',
    commissionPercent: 20,
    defaultCouponId: '',
    notes: '',
  });

  const load = useCallback(async () => {
    try {
      setError(null);
      const [affiliates, couponList] = await Promise.all([
        api.get<AdminAffiliate[]>('/api/admin/affiliates'),
        api.get<Array<{ id: string; code: string; status: string }>>('/api/admin/coupons'),
      ]);
      setRows(affiliates);
      setCoupons(
        (couponList ?? [])
          .filter((c) => c.status === 'active')
          .map((c) => ({ id: c.id, code: c.code })),
      );
    } catch (err) {
      console.error('[admin/affiliates]', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar afiliados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const appUrl = useMemo(() => window.location.origin, []);

  const copyLink = async (aff: AdminAffiliate) => {
    const link = aff.link ?? `${appUrl}/r/${aff.code}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(aff.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openDetail = async (id: string) => {
    try {
      const data = await api.get<AffiliateDetail>(`/api/admin/affiliates/${id}`);
      setDetail(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao carregar detalhe');
    }
  };

  const createAffiliate = async () => {
    setSaving(true);
    try {
      await api.post('/api/admin/affiliates', {
        name: form.name,
        email: form.email || null,
        code: form.code || undefined,
        commissionPercent: form.commissionPercent,
        defaultCouponId: form.defaultCouponId || null,
        notes: form.notes,
      });
      setShowForm(false);
      setForm({ name: '', email: '', code: '', commissionPercent: 20, defaultCouponId: '', notes: '' });
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar afiliado');
    } finally {
      setSaving(false);
    }
  };

  const markCommissionPaid = async (commissionId: string) => {
    const notes = window.prompt('Nota de pagamento (opcional):') ?? '';
    try {
      await api.patch(`/api/admin/affiliate-commissions/${commissionId}`, {
        status: 'paid',
        paidNotes: notes,
      });
      if (detail) void openDetail(detail.id);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao marcar comissão');
    }
  };

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-affiliates"
      title="Afiliados"
      subtitle="Parceiros, links de indicação, métricas e comissões"
      onRefresh={() => { setRefreshing(true); void load(); }}
      refreshing={refreshing || loading}
    >
      <div className="mb-6 flex justify-between items-center gap-4">
        <p className="text-sm text-zinc-500">
          {rows.length} afiliado{rows.length !== 1 ? 's' : ''} cadastrado{rows.length !== 1 ? 's' : ''}
        </p>
        <button type="button" onClick={() => setShowForm(true)} className="btn-primary text-sm inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo afiliado
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {showForm && (
        <div className="apple-card p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-zinc-900">Criar afiliado</h3>
            <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-zinc-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome</span>
              <input className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">E-mail</span>
              <input type="email" className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Código (opcional)</span>
              <input className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10 uppercase" placeholder="Auto-gerado" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Comissão (%)</span>
              <input type="number" min={0} max={100} className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: Number(e.target.value) })} />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Cupom padrão</span>
              <select className="mt-1 w-full h-11 px-3 rounded-xl border border-black/10" value={form.defaultCouponId} onChange={(e) => setForm({ ...form, defaultCouponId: e.target.value })}>
                <option value="">Nenhum</option>
                {coupons.map((c) => (
                  <option key={c.id} value={c.id}>{c.code}</option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Notas</span>
              <textarea className="mt-1 w-full p-3 rounded-xl border border-black/10" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="btn-secondary text-sm" onClick={() => setShowForm(false)}>Cancelar</button>
            <button type="button" className="btn-primary text-sm" disabled={!form.name || saving} onClick={() => void createAffiliate()}>
              {saving ? 'Salvando…' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Carregando…</p>
      ) : (
        <div className="apple-card overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-black/5 text-left text-zinc-500">
                <th className="p-4">Parceiro</th>
                <th className="p-4">Comissão</th>
                <th className="p-4">Cliques</th>
                <th className="p-4">Views</th>
                <th className="p-4">Cadastros</th>
                <th className="p-4">Assinaturas</th>
                <th className="p-4">Comissão pendente</th>
                <th className="p-4">Link</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 hover:bg-zinc-50/50">
                  <td className="p-4">
                    <div className="font-semibold text-zinc-900">{row.name}</div>
                    <div className="text-xs text-zinc-400 font-mono">{row.code}</div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_BADGE[row.status] ?? STATUS_BADGE.archived}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4">{row.commissionPercent}%</td>
                  <td className="p-4">{row.clicks}</td>
                  <td className="p-4">{row.views}</td>
                  <td className="p-4">{row.signups}</td>
                  <td className="p-4">{row.subscriptions}</td>
                  <td className="p-4 font-medium">{formatBRL(row.commissionPendingCents / 100)}</td>
                  <td className="p-4">
                    <button type="button" onClick={() => void copyLink(row)} className="inline-flex items-center gap-1 text-xs font-bold text-zinc-600 hover:text-zinc-900">
                      {copiedId === row.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === row.id ? 'Copiado' : 'Copiar'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button type="button" onClick={() => void openDetail(row.id)} className="text-xs font-bold text-zinc-900 hover:underline inline-flex items-center gap-1">
                      Detalhes <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-zinc-400">Nenhum afiliado cadastrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{detail.name}</h3>
                <p className="text-sm text-zinc-500 font-mono flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> {detail.link ?? `${appUrl}/r/${detail.code}`}
                </p>
              </div>
              <button type="button" onClick={() => setDetail(null)}><X className="w-5 h-5 text-zinc-400" /></button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                ['Cliques', detail.clicks],
                ['Views', detail.views],
                ['Cadastros', detail.signups],
                ['Assinaturas', detail.subscriptions],
              ].map(([label, val]) => (
                <div key={String(label)} className="p-3 rounded-xl bg-zinc-50">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">{label}</p>
                  <p className="text-xl font-bold">{val}</p>
                </div>
              ))}
            </div>

            <h4 className="font-bold text-sm mb-2">Comissões</h4>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {(detail.commissions ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-black/5 text-sm">
                  <div>
                    <p className="font-medium">{c.organizationName ?? 'Org'}</p>
                    <p className="text-xs text-zinc-400">{formatBRL(c.commissionCents / 100)} · {c.status}</p>
                  </div>
                  {c.status === 'pending' && (
                    <button type="button" className="text-xs font-bold text-emerald-700" onClick={() => void markCommissionPaid(c.id)}>
                      Marcar pago
                    </button>
                  )}
                </div>
              ))}
              {(detail.commissions ?? []).length === 0 && (
                <p className="text-zinc-400 text-sm">Nenhuma comissão registrada</p>
              )}
            </div>

            <h4 className="font-bold text-sm mb-2">Eventos recentes</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto text-sm">
              {(detail.events ?? []).map((ev) => (
                <div key={ev.id} className="flex justify-between py-2 border-b border-black/5">
                  <span className="font-medium capitalize">{ev.eventType}</span>
                  <span className="text-zinc-400 text-xs">{new Date(ev.createdAt).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
