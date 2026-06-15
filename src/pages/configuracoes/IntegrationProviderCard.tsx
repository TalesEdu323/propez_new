import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/apiClient';
import { toast, confirmAction } from '../../lib/feedback';

export interface IntegrationCredentialSummary {
  configured: boolean;
  source?: string;
  keyPrefix?: string | null;
  apiBaseUrl?: string;
}

interface Props {
  provider: 'prosync' | 'rubrica';
  title: string;
  badge: string;
  badgeClass: string;
  defaultBaseUrl: string;
  keyPlaceholder: string;
  credential?: IntegrationCredentialSummary;
  suiteEnabled: boolean;
  canSaveManual: boolean;
  loading: boolean;
  provisioning: boolean;
  onProvision: () => void;
  onRefresh: () => void;
}

function statusLabel(cred: IntegrationCredentialSummary | undefined, loading: boolean): string {
  if (loading) return 'Verificando…';
  if (!cred?.configured) return 'Não conectado';
  if (cred.source === 'manual') return 'Conectado (chave API)';
  if (cred.source === 'env_fallback') return 'Conectado (servidor)';
  if (cred.source === 'suite_token') return 'Conectado (suíte Taggo)';
  return 'Conectado';
}

export function IntegrationProviderCard({
  provider,
  title,
  badge,
  badgeClass,
  defaultBaseUrl,
  keyPlaceholder,
  credential,
  suiteEnabled,
  canSaveManual,
  loading,
  provisioning,
  onProvision,
  onRefresh,
}: Props) {
  const [apiBaseUrl, setApiBaseUrl] = useState(defaultBaseUrl);
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState<'save' | 'verify' | 'disconnect' | null>(null);

  useEffect(() => {
    if (credential?.apiBaseUrl) setApiBaseUrl(credential.apiBaseUrl);
    else if (!credential?.configured) setApiBaseUrl(defaultBaseUrl);
  }, [credential?.apiBaseUrl, credential?.configured, defaultBaseUrl]);

  const handleSave = async () => {
    setBusy('save');
    try {
      await api.put(`/api/integrations/credentials/${provider}`, {
        apiKey: apiKey.trim(),
        apiBaseUrl: apiBaseUrl.trim() || defaultBaseUrl,
      });
      setApiKey('');
      await onRefresh();
      toast.success('Credencial salva com sucesso.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar credencial');
    } finally {
      setBusy(null);
    }
  };

  const handleVerify = async () => {
    setBusy('verify');
    try {
      const body = apiKey.trim()
        ? { apiKey: apiKey.trim(), apiBaseUrl: apiBaseUrl.trim() || defaultBaseUrl }
        : {};
      const res = await api.post<{ ok: boolean; error?: string }>(
        `/api/integrations/credentials/${provider}/verify`,
        body,
      );
      if (!res.ok) toast.error(res.error || 'Falha na verificação');
      else toast.success('Conexão OK com o serviço.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao testar conexão');
    } finally {
      setBusy(null);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = await confirmAction({
      title: `Remover a conexão com ${title}?`,
      description: 'A integração será desconectada e as credenciais removidas.',
      confirmLabel: 'Desconectar',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;
    setBusy('disconnect');
    try {
      await api.delete(`/api/integrations/credentials/${provider}`);
      setApiKey('');
      setApiBaseUrl(defaultBaseUrl);
      await onRefresh();
      toast.success('Integração desconectada.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao desconectar');
    } finally {
      setBusy(null);
    }
  };

  const configured = credential?.configured ?? false;
  const statusClass = configured ? 'text-emerald-600' : 'text-zinc-400';

  return (
    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${badgeClass}`}
          >
            {badge}
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900">{title}</h4>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${statusClass}`}>
              Status: {statusLabel(credential, loading)}
            </p>
            {configured && credential?.keyPrefix && (
              <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">{credential.keyPrefix}…</p>
            )}
            {configured && credential?.apiBaseUrl && (
              <p className="text-[10px] text-zinc-400 mt-0.5 truncate max-w-[200px]">
                {credential.apiBaseUrl}
              </p>
            )}
          </div>
        </div>
      </div>

      {configured ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleVerify()}
            disabled={busy !== null}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
          >
            {busy === 'verify' ? 'Testando…' : 'Testar conexão'}
          </button>
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            disabled={busy !== null || credential?.source === 'env_fallback'}
            className="text-[10px] font-bold uppercase tracking-widest text-red-600 hover:text-red-700 disabled:opacity-50"
            title={
              credential?.source === 'env_fallback'
                ? 'Credencial definida no servidor (.env)'
                : undefined
            }
          >
            {busy === 'disconnect' ? 'Removendo…' : 'Desconectar'}
          </button>
        </div>
      ) : (
        <>
          {canSaveManual ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  URL do {title}
                </label>
                <input
                  type="url"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="glass-input px-3 py-2.5 text-xs font-medium w-full"
                  placeholder={defaultBaseUrl}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Chave API
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="glass-input px-3 py-2.5 text-xs font-medium w-full font-mono"
                  placeholder={keyPlaceholder}
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={busy !== null || !apiKey.trim()}
                  className="btn-primary text-[10px] uppercase tracking-widest py-2.5 px-4"
                >
                  {busy === 'save' ? 'Salvando…' : 'Salvar e testar'}
                </button>
                {suiteEnabled && (
                  <button
                    type="button"
                    onClick={onProvision}
                    disabled={provisioning || busy !== null}
                    className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border border-zinc-200 rounded-xl px-4 py-2.5 hover:border-zinc-400 disabled:opacity-50"
                  >
                    {provisioning ? 'Conectando…' : 'Via suíte Taggo'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-700">
              Cifra de credenciais indisponível no servidor. Defina JWT_SECRET com pelo menos 32
              caracteres na Vercel.
            </p>
          )}
        </>
      )}

      {credential?.source === 'env_fallback' && (
        <p className="text-[10px] text-zinc-400">
          Esta organização usa a chave global do servidor. Para chave própria, salve abaixo (após
          remover dependência do .env).
        </p>
      )}
    </div>
  );
}
