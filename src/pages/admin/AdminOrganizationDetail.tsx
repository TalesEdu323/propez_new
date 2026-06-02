import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import AdminPageShell from './AdminPageShell';
import { api } from '../../lib/apiClient';
import { formatBRL, formatDateBR } from '../../lib/format';
import { ColorPickerRow } from '../../components/builder/properties/ColorPickerRow';
import type { NavigateFn } from '../../types/navigation';

interface OrgDetail {
  organization: {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    whitelabelEnabled?: boolean;
    plan: string | null;
    billingCycle: string | null;
    trialEndsAt: string | null;
    planRenewsAt: string | null;
    stripeCustomerId: string | null;
    onboarded: boolean;
    createdAt: string;
    csNotes?: string;
    health?: { score: number; level: string; factors: string[] };
    mrrBrl?: number;
  };
  members: Array<{ name: string; email: string; role: string; lastLoginAt: string | null }>;
  payments: Array<{ status: string; amountCents: number; createdAt: string; paymentMethod: string }>;
  subscriptionEvents?: Array<{
    event_type: string;
    from_plan: string | null;
    to_plan: string | null;
    created_at: string;
  }>;
  productEvents?: Array<{ event_name: string; created_at: string }>;
  usageHistory?: Array<{
    month_key: string;
    propostas: number;
    ia_geracoes: number;
    rubrica_assinaturas: number;
  }>;
}

export default function AdminOrganizationDetail({
  navigate,
  orgId,
}: {
  navigate: NavigateFn;
  orgId: string;
}) {
  const [data, setData] = useState<OrgDetail | null>(null);
  const [csNotes, setCsNotes] = useState('');
  const [whitelabelEnabled, setWhitelabelEnabled] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#18181b');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.get<OrgDetail>(`/api/admin/organizations/${orgId}`);
      setData(d);
      setCsNotes((d.organization as { csNotes?: string }).csNotes ?? '');
      setWhitelabelEnabled(d.organization.whitelabelEnabled === true);
      setPrimaryColor(d.organization.primaryColor ?? '#18181b');
      setSecondaryColor(d.organization.secondaryColor ?? '');
      setLogoUrl(d.organization.logoUrl ?? null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/admin/organizations/${orgId}`, { csNotes });
    } finally {
      setSaving(false);
    }
  };

  const saveBrand = async () => {
    setSavingBrand(true);
    try {
      await api.patch(`/api/admin/organizations/${orgId}`, {
        whitelabelEnabled,
        logoUrl,
        primaryColor: primaryColor || null,
        secondaryColor: secondaryColor || null,
      });
      await load();
    } finally {
      setSavingBrand(false);
    }
  };

  const confirmDeleteOrg = async () => {
    if (!data) return;
    if (deleteConfirm.trim() !== data.organization.name.trim()) {
      alert('Digite o nome da organização exatamente como aparece acima.');
      return;
    }
    setDeleting(true);
    try {
      await api.delete(`/api/admin/organizations/${orgId}`);
      navigate('admin-organizations');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir organização');
    } finally {
      setDeleting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const healthColor: Record<string, string> = {
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
  };

  return (
    <AdminPageShell
      navigate={navigate}
      current="admin-organizations"
      title={data?.organization.name ?? 'Organização'}
      subtitle="Detalhe, health score e timeline."
      onRefresh={() => void load()}
    >
      <button
        type="button"
        onClick={() => navigate('admin-organizations')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {loading ? (
        <div className="apple-card p-12 text-center text-zinc-500">Carregando…</div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="apple-card p-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-zinc-500">Plano</p>
                <p className="font-semibold capitalize">{data.organization.plan ?? 'free'}</p>
              </div>
              <div>
                <p className="text-zinc-500">MRR</p>
                <p className="font-semibold">{formatBRL(data.organization.mrrBrl ?? 0)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Criada em</p>
                <p className="font-semibold">{formatDateBR(data.organization.createdAt)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Renovação</p>
                <p className="font-semibold">
                  {data.organization.planRenewsAt
                    ? formatDateBR(data.organization.planRenewsAt)
                    : '—'}
                </p>
              </div>
            </div>

            <div className="apple-card p-6">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">Membros</h3>
              <ul className="space-y-2">
                {data.members.map((m) => (
                  <li key={m.email} className="flex justify-between text-sm">
                    <span>
                      {m.name} <span className="text-zinc-400">({m.role})</span>
                    </span>
                    <span className="text-zinc-400">
                      {m.lastLoginAt ? formatDateBR(m.lastLoginAt) : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="apple-card p-6">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">Pagamentos</h3>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {data.payments.map((p, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className={p.status === 'failed' ? 'text-red-600' : ''}>
                      {p.status} · {p.paymentMethod}
                    </span>
                    <span>{formatBRL(p.amountCents / 100)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {data.subscriptionEvents && data.subscriptionEvents.length > 0 && (
              <div className="apple-card p-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">Assinatura</h3>
                <ul className="space-y-2 text-sm">
                  {data.subscriptionEvents.map((e, i) => (
                    <li key={i}>
                      <span className="font-medium">{e.event_type}</span>{' '}
                      {e.from_plan} → {e.to_plan}{' '}
                      <span className="text-zinc-400">{formatDateBR(e.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {data.organization.health && (
              <div className="apple-card p-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-2">Health Score</h3>
                <span
                  className={`inline-block px-4 py-2 rounded-2xl text-2xl font-bold ${
                    healthColor[data.organization.health.level] ?? healthColor.yellow
                  }`}
                >
                  {data.organization.health.score}
                </span>
                <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                  {data.organization.health.factors.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="apple-card p-6">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-3">Identidade visual</h3>
              <label className="flex items-center gap-2 text-sm mb-4">
                <input
                  type="checkbox"
                  checked={whitelabelEnabled}
                  onChange={(e) => setWhitelabelEnabled(e.target.checked)}
                />
                Whitelabel ativo
              </label>
              <div className="mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="h-12 object-contain mb-2" />
                ) : null}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs" />
              </div>
              <ColorPickerRow label="Cor primária" value={primaryColor} onChange={setPrimaryColor} />
              {secondaryColor !== '' && (
                <div className="mt-3">
                  <ColorPickerRow label="Cor secundária" value={secondaryColor} onChange={setSecondaryColor} />
                </div>
              )}
              <button
                type="button"
                disabled={savingBrand}
                onClick={() => void saveBrand()}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold w-full justify-center"
              >
                <Save className="w-4 h-4" /> Salvar identidade
              </button>
            </div>

            <div className="apple-card p-6">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-2">Notas CS</h3>
              <textarea
                value={csNotes}
                onChange={(e) => setCsNotes(e.target.value)}
                rows={5}
                className="w-full text-sm border border-black/5 rounded-xl p-3 bg-zinc-50"
                placeholder="Anotações internas…"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveNotes()}
                className="mt-3 flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-semibold"
              >
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>

            {data.usageHistory && (
              <div className="apple-card p-6">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase mb-2">Uso</h3>
                <ul className="text-xs space-y-2">
                  {data.usageHistory.map((u) => (
                    <li key={u.month_key}>
                      {u.month_key}: {u.propostas} propostas, {u.ia_geracoes} IA,{' '}
                      {u.rubrica_assinaturas} rubrica
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="apple-card p-6 border border-red-100 bg-red-50/30">
              <h3 className="text-sm font-semibold text-red-700 uppercase mb-2">Zona de perigo</h3>
              <p className="text-xs text-zinc-600 mb-3">
                Excluir apaga propostas, clientes, membros e dados vinculados. Assinaturas Stripe
                serão canceladas.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirm('');
                  setShowDeleteModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold w-full justify-center"
              >
                <Trash2 className="w-4 h-4" /> Excluir organização
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteModal && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="apple-card p-6 w-full max-w-md border border-red-100">
            <h3 className="text-lg font-bold text-red-700 mb-1">Excluir organização</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Digite <strong>{data.organization.name}</strong> para confirmar a exclusão permanente.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full px-3 py-2.5 border border-black/5 rounded-xl text-sm bg-zinc-50 mb-4"
              placeholder="Nome da organização"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-semibold text-zinc-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDeleteOrg()}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
