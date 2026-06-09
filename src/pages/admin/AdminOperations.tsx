import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Activity, Inbox, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { formatDateBR } from '../../lib/format';
import { AdminPlatformSettingsPanel } from './AdminPlatformSettingsPanel';
import type { NavigateFn } from '../../types/navigation';

interface ApiErrorLog {
  id: string;
  routePattern: string;
  requestPath: string;
  method: string;
  statusCode: number;
  errorMessage: string | null;
  errorDetail: Record<string, unknown> | null;
  userId: string | null;
  organizationId: string | null;
  durationMs: number | null;
  createdAt: string;
}

function ErrorLogRow({ log }: { log: ApiErrorLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = Boolean(log.errorDetail && Object.keys(log.errorDetail).length > 0);

  return (
    <div className="border border-zinc-100 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => hasDetail && setExpanded((v) => !v)}
        className={`w-full text-left px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs ${
          hasDetail ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <span className="text-zinc-400 shrink-0 w-36">
          {formatDateBR(log.createdAt, 'datetime')}
        </span>
        <span className="font-mono text-zinc-500 shrink-0">{log.method}</span>
        <span className="font-mono text-zinc-700 truncate flex-1" title={log.requestPath}>
          {log.requestPath.split('?')[0]}
        </span>
        <span className="text-red-600 font-semibold shrink-0">{log.statusCode}</span>
        {log.durationMs != null && (
          <span className="text-zinc-400 shrink-0">{log.durationMs} ms</span>
        )}
        {hasDetail && (
          <span className="text-zinc-400 shrink-0">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        )}
      </button>
      <div className="px-3 pb-2.5 space-y-1">
        {log.errorMessage && (
          <p className="text-sm text-red-700 font-medium">{log.errorMessage}</p>
        )}
        {(log.organizationId || log.userId) && (
          <p className="text-xs text-zinc-400">
            {log.organizationId && <>Org: <code>{log.organizationId}</code></>}
            {log.organizationId && log.userId && ' · '}
            {log.userId && <>User: <code>{log.userId}</code></>}
          </p>
        )}
      </div>
      {expanded && hasDetail && (
        <pre className="mx-3 mb-3 p-3 bg-zinc-900 text-zinc-100 text-xs rounded-lg overflow-x-auto max-h-48">
          {JSON.stringify(log.errorDetail, null, 2)}
        </pre>
      )}
    </div>
  );
}

function RouteErrorPanel({ route, count }: { route: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ApiErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{ logs: ApiErrorLog[] }>(
        `/api/admin/operations/error-logs?route=${encodeURIComponent(route)}&days=7&limit=50`,
      );
      setLogs(data.logs);
      setLoaded(true);
    } catch {
      setError('Não foi possível carregar os logs.');
    } finally {
      setLoading(false);
    }
  }, [route]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded) void loadLogs();
  };

  return (
    <li className="border border-zinc-100 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-zinc-50 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
          )}
          <code className="text-zinc-600 truncate">{route}</code>
        </span>
        <span className="font-semibold text-red-600 shrink-0">{count}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-100 bg-zinc-50/80 px-4 py-3 space-y-2">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando logs…
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && loaded && logs.length === 0 && (
            <p className="text-sm text-zinc-500 py-2">
              Nenhum log detalhado nos últimos 7 dias. Logs passam a ser registrados após o deploy
              desta atualização — o contador acima inclui erros anteriores.
            </p>
          )}
          {!loading &&
            logs.map((log) => (
              <ErrorLogRow key={log.id} log={log} />
            ))}
          {open && loaded && !loading && (
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="text-xs font-semibold text-blue-600 mt-1"
            >
              Atualizar logs
            </button>
          )}
        </div>
      )}
    </li>
  );
}

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
            <h2 className="text-sm font-semibold text-zinc-500 uppercase mb-1">Erros 5xx (7d)</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Clique em uma rota para ver os logs detalhados (horário, path, mensagem e stack).
            </p>
            {!data?.topErrors?.length ? (
              <p className="text-sm text-zinc-500">Nenhum erro registrado.</p>
            ) : (
              <ul className="space-y-2">
                {data.topErrors.map((e) => (
                  <RouteErrorPanel key={e.route} route={e.route} count={e.count} />
                ))}
              </ul>
            )}
          </div>

          <AdminPlatformSettingsPanel />

          <div className="apple-card p-6 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                <Inbox className="w-4 h-4" /> Fila de solicitações
              </h2>
              <p className="text-sm text-zinc-500 mt-1">Whitelabel e plano Business aguardando aprovação.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('admin-requests')}
              className="btn-primary text-xs uppercase tracking-widest"
            >
              Abrir fila
            </button>
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
