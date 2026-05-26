import { useCallback, useEffect, useState } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { api } from '../../lib/apiClient';
import type { NavigateFn } from '../../types/navigation';

interface AdminAlert {
  id: string;
  alertType: string;
  severity: string;
  organizationId: string | null;
  title: string;
  body: string;
  createdAt: string;
}

export default function AdminAlertBell({ navigate }: { navigate: NavigateFn }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ alerts: AdminAlert[]; count: number }>('/api/admin/alerts');
      setAlerts(data.alerts);
      setCount(data.count);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const resolve = async (id: string) => {
    await api.post(`/api/admin/alerts/${id}/resolve`, {});
    void load();
  };

  const severityClass: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-black/5 hover:bg-zinc-50 transition-colors"
        aria-label="Alertas"
      >
        <Bell className="w-5 h-5 text-zinc-700" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-[min(100vw-2rem,380px)] max-h-[70vh] overflow-y-auto apple-card shadow-xl border border-black/5 p-3">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-sm font-semibold text-zinc-900">Atenção agora</span>
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-zinc-500 px-2 py-4">Nenhum alerta aberto.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li key={a.id} className="rounded-xl border border-black/5 p-3 bg-zinc-50/80">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-1 ${
                            severityClass[a.severity] ?? severityClass.info
                          }`}
                        >
                          {a.severity}
                        </span>
                        <p className="text-sm font-semibold text-zinc-900">{a.title}</p>
                        {a.body && <p className="text-xs text-zinc-500 mt-0.5">{a.body}</p>}
                        {a.organizationId && (
                          <button
                            type="button"
                            className="text-xs text-blue-600 mt-2 font-medium"
                            onClick={() => {
                              navigate('admin-organization-detail', { id: a.organizationId! });
                              setOpen(false);
                            }}
                          >
                            Ver organização
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void resolve(a.id)}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-white text-zinc-500"
                        title="Resolver"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
