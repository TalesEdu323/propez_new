import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Activity } from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import type { NavigateFn } from '../../types/navigation';

export default function AdminOperations({ navigate }: { navigate: NavigateFn }) {
  const [data, setData] = useState<{
    uptimePct30d: number;
    avgLatencyMs: number;
    topErrors: { route: string; count: number }[];
    supportDashboardUrl: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/api/admin/operations/overview');
      setData(d as typeof data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pingHealth = async () => {
    await api.post('/api/admin/operations/snapshot-health', {});
    void load();
  };

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-operations"
      title="Operações e Suporte"
      subtitle="Uptime, erros e fila de CS."
      onRefresh={() => void load()}
    >
      {loading ? (
        <div className="apple-card p-12 text-center text-zinc-500">Carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="apple-card p-6">
              <p className="text-xs text-zinc-500 uppercase">Uptime (30d)</p>
              <p className="text-3xl font-bold mt-2">
                {(data?.uptimePct30d ?? 100).toFixed(2)}%
              </p>
              <button
                type="button"
                onClick={() => void pingHealth()}
                className="mt-4 text-xs font-semibold text-blue-600"
              >
                Registrar health check agora
              </button>
            </div>
            <div className="apple-card p-6">
              <p className="text-xs text-zinc-500 uppercase">Latência média (DB)</p>
              <p className="text-3xl font-bold mt-2">{data?.avgLatencyMs?.toFixed(0) ?? '—'} ms</p>
            </div>
            <div className="apple-card p-6">
              <p className="text-xs text-zinc-500 uppercase flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" /> Suporte
              </p>
              {data?.supportDashboardUrl ? (
                <a
                  href={data.supportDashboardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
                >
                  Abrir painel externo <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <p className="text-sm text-zinc-500 mt-3">
                  Configure SUPPORT_DASHBOARD_URL no .env para link do Intercom/Zendesk.
                </p>
              )}
            </div>
          </div>

          <div className="apple-card p-6">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase mb-4">Erros 5xx (7d)</h2>
            {!data?.topErrors?.length ? (
              <p className="text-sm text-zinc-500">Nenhum erro registrado.</p>
            ) : (
              <ul className="space-y-2">
                {data.topErrors.map((e) => (
                  <li key={e.route} className="flex justify-between text-sm">
                    <code className="text-zinc-600">{e.route}</code>
                    <span className="font-semibold text-red-600">{e.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="apple-card p-6 bg-zinc-50">
            <h2 className="text-sm font-semibold text-zinc-700 mb-2">NPS / Tickets / CSAT</h2>
            <p className="text-sm text-zinc-500">
              Integração com ferramenta de suporte em planejamento. Use a aba Retenção para fila
              proxy (health score + pagamentos falhos).
            </p>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
