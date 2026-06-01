import { useCallback, useEffect, useState } from 'react';
import { Check, X, ExternalLink } from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import type { NavigateFn } from '../../types/navigation';

interface ServiceRequestRow {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  adminNotes?: string | null;
  createdAt: string;
  organization: { id: string; name: string };
  user: { name: string; email: string };
}

const TYPE_LABELS: Record<string, string> = {
  whitelabel: 'Identidade visual',
  enterprise: 'Plano Business',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Recusada',
};

export default function AdminRequests({ navigate }: { navigate: NavigateFn }) {
  const [rows, setRows] = useState<ServiceRequestRow[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter === 'all' ? '' : `?status=${filter}`;
      const data = await api.get<ServiceRequestRow[]>(`/api/admin/requests${q}`);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string, action: 'approve' | 'reject', enableWhitelabel?: boolean) => {
    setBusyId(id);
    try {
      await api.patch(`/api/admin/requests/${id}`, {
        action,
        enableWhitelabel: enableWhitelabel ?? true,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-requests"
      title="Solicitações"
      subtitle="Whitelabel e plano Business — fila de aprovação."
      onRefresh={() => void load()}
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${
              filter === s ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-500'
            }`}
          >
            {s === 'all' ? 'Todas' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="apple-card p-12 text-center text-zinc-500">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="apple-card p-12 text-center text-zinc-500">Nenhuma solicitação.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="apple-card p-5 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-violet-600">
                    {TYPE_LABELS[row.type] ?? row.type}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </div>
                <p className="font-semibold text-zinc-900">{row.organization.name}</p>
                <p className="text-sm text-zinc-500">
                  {row.user.name} · {row.user.email}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {new Date(row.createdAt).toLocaleString('pt-BR')}
                </p>
                {row.payload.message && typeof row.payload.message === 'string' && (
                  <p className="text-sm text-zinc-600 mt-2">{row.payload.message}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('admin-organization-detail', { orgId: row.organization.id })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                >
                  Ver org <ExternalLink className="w-3.5 h-3.5" />
                </button>
                {row.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void review(row.id, 'approve', row.type === 'whitelabel')}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void review(row.id, 'reject')}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100"
                    >
                      <X className="w-3.5 h-3.5" /> Recusar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
