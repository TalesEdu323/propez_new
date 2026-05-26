import { useCallback, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import type { NavigateFn } from '../../types/navigation';

export default function AdminAcquisition({ navigate }: { navigate: NavigateFn }) {
  const [overview, setOverview] = useState<{
    signups: { today: number; week: number; month: number };
    trialStarts: number;
    trialConverted: number;
    avgDaysToConvert: number;
  } | null>(null);
  const [funnel, setFunnel] = useState<{
    signups: number;
    emailVerified: number;
    onboarded: number;
    withProposal: number;
    paid: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [o, f] = await Promise.all([
        api.get('/api/admin/acquisition/overview'),
        api.get('/api/admin/acquisition/funnel'),
      ]);
      setOverview(o as typeof overview);
      setFunnel(f as typeof funnel);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const funnelData = funnel
    ? [
        { step: 'Signups', count: funnel.signups },
        { step: 'Email OK', count: funnel.emailVerified },
        { step: 'Onboarded', count: funnel.onboarded },
        { step: 'Proposta', count: funnel.withProposal },
        { step: 'Pago', count: funnel.paid },
      ]
    : [];

  const convRate =
    overview && overview.trialStarts > 0
      ? ((overview.trialConverted / overview.trialStarts) * 100).toFixed(1)
      : '0';

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-acquisition"
      title="Aquisição"
      subtitle="Signups, trials e funil de conversão."
      onRefresh={() => void load()}
    >
      {loading ? (
        <div className="apple-card p-12 text-center text-zinc-500">Carregando…</div>
      ) : (
        <>
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500">Signups hoje</p>
                <p className="text-2xl font-bold">{overview.signups.today}</p>
              </div>
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500">Signups (semana)</p>
                <p className="text-2xl font-bold">{overview.signups.week}</p>
              </div>
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500">Signups (mês)</p>
                <p className="text-2xl font-bold">{overview.signups.month}</p>
              </div>
              <div className="apple-card p-5">
                <p className="text-xs text-zinc-500">Trial → Pago</p>
                <p className="text-2xl font-bold">{convRate}%</p>
                <p className="text-xs text-zinc-400 mt-1">
                  média {overview.avgDaysToConvert.toFixed(0)} dias
                </p>
              </div>
            </div>
          )}

          <div className="apple-card p-6">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase mb-4">Funil</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="step" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#18181b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              CAC, LTV:CAC e payback requerem integração de marketing — em breve.
            </p>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
