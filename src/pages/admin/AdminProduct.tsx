import { useCallback, useEffect, useState } from 'react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import type { NavigateFn } from '../../types/navigation';

export default function AdminProduct({ navigate }: { navigate: NavigateFn }) {
  const [activity, setActivity] = useState<{
    dau: number;
    wau: number;
    mau: number;
    stickiness: number;
  } | null>(null);
  const [activation, setActivation] = useState<{
    totalRecentOrgs: number;
    activated: number;
    activationRate: number;
  } | null>(null);
  const [adoption, setAdoption] = useState<{
    events: { name: string; count: number }[];
    usageThisMonth: { metric: string; total: number }[];
  } | null>(null);
  const [byPlan, setByPlan] = useState<{ plans: { plan: string; avgPropostas: number }[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [a, act, ad, bp] = await Promise.all([
        api.get('/api/admin/product/activity'),
        api.get('/api/admin/product/activation'),
        api.get('/api/admin/product/adoption'),
        api.get('/api/admin/product/by-plan'),
      ]);
      setActivity(a as typeof activity);
      setActivation(act as typeof activation);
      setAdoption(ad as typeof adoption);
      setByPlan(bp as typeof byPlan);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-product"
      title="Uso do Produto"
      subtitle="DAU/WAU/MAU, ativação e adoption."
      onRefresh={() => void load()}
    >
      {loading ? (
        <div className="apple-card p-12 text-center text-zinc-500">Carregando…</div>
      ) : (
        <>
          {activity && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500">DAU</p>
                <p className="text-2xl font-bold">{activity.dau}</p>
              </div>
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500">WAU</p>
                <p className="text-2xl font-bold">{activity.wau}</p>
              </div>
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500">MAU</p>
                <p className="text-2xl font-bold">{activity.mau}</p>
              </div>
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500">Stickiness (DAU/MAU)</p>
                <p className="text-2xl font-bold">{activity.stickiness.toFixed(1)}%</p>
              </div>
            </div>
          )}

          {activation && (
            <div className="apple-card p-6">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase mb-2">Ativação (14 dias)</h2>
              <p className="text-3xl font-bold">{activation.activationRate.toFixed(1)}%</p>
              <p className="text-sm text-zinc-500 mt-1">
                {activation.activated} de {activation.totalRecentOrgs} orgs recentes com onboarding + 1ª
                proposta enviada
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {adoption && (
              <div className="apple-card p-6">
                <h2 className="text-sm font-semibold text-zinc-500 uppercase mb-4">Eventos (30d)</h2>
                <ul className="space-y-2">
                  {adoption.events.map((e) => (
                    <li key={e.name} className="flex justify-between text-sm">
                      <span className="text-zinc-600">{e.name}</span>
                      <span className="font-semibold">{e.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {byPlan && (
              <div className="apple-card p-6">
                <h2 className="text-sm font-semibold text-zinc-500 uppercase mb-4">
                  Propostas/mês por plano
                </h2>
                <ul className="space-y-2">
                  {byPlan.plans.map((p) => (
                    <li key={p.plan} className="flex justify-between text-sm">
                      <span className="capitalize">{p.plan}</span>
                      <span className="font-semibold">{p.avgPropostas.toFixed(1)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
