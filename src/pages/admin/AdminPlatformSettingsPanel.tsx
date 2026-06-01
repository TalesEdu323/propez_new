import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/apiClient';
import { invalidateRequestConfigCache, type RequestConfigMap } from '../../lib/requestConfig';

export function AdminPlatformSettingsPanel() {
  const [configs, setConfigs] = useState<RequestConfigMap | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api.get<RequestConfigMap>('/api/admin/platform-settings');
    setConfigs(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!configs) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.patch<RequestConfigMap>('/api/admin/platform-settings', configs);
      setConfigs(updated);
      invalidateRequestConfigCache();
      setMessage('Configurações salvas.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (!configs) {
    return <div className="apple-card p-6 text-zinc-500 text-sm">Carregando formulários…</div>;
  }

  const blocks: { key: keyof RequestConfigMap; title: string }[] = [
    { key: 'whitelabel', title: 'Solicitação de identidade visual' },
    { key: 'enterprise', title: 'Solicitação plano Business / Enterprise' },
  ];

  return (
    <div className="apple-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-900">Formulários de solicitação</h3>
        <p className="text-sm text-zinc-500 mt-1">
          Escolha formulário nativo no Propez ou URL externa em popup (ex.: ProSync, Typeform).
        </p>
      </div>

      {blocks.map(({ key, title }) => (
        <div key={key} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-4">
          <h4 className="text-sm font-bold text-zinc-900">{title}</h4>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`mode-${key}`}
                checked={configs[key].mode === 'native'}
                onChange={() =>
                  setConfigs({ ...configs, [key]: { ...configs[key], mode: 'native' } })
                }
              />
              Formulário nativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`mode-${key}`}
                checked={configs[key].mode === 'external'}
                onChange={() =>
                  setConfigs({ ...configs, [key]: { ...configs[key], mode: 'external' } })
                }
              />
              URL externa (popup)
            </label>
          </div>
          {configs[key].mode === 'external' && (
            <input
              type="url"
              value={configs[key].externalUrl ?? ''}
              onChange={(e) =>
                setConfigs({
                  ...configs,
                  [key]: { ...configs[key], externalUrl: e.target.value || null },
                })
              }
              placeholder="https://..."
              className="glass-input w-full px-4 py-3 text-sm"
            />
          )}
        </div>
      ))}

      {message && <p className="text-sm text-zinc-600">{message}</p>}

      <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary">
        {saving ? 'Salvando…' : 'Salvar configurações'}
      </button>
    </div>
  );
}
