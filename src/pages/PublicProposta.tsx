/**
 * Página pública de visualização de proposta em `/p/:token`.
 *
 * Usa `/api/public/propostas/:token` (sem autenticação) para exibir a proposta
 * e registrar decisão (aprovar/recusar) do cliente final.
 */
import { useEffect, useMemo, useState } from 'react';
import { FileText, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, ApiError } from '../lib/apiClient';
import { RenderElement } from '../components/builder/RenderElement';
import { PropezWatermark } from './visualizarProposta/PropezWatermark';
import { shouldShowWatermark } from '../lib/featureFlags';
import type { BuilderElement } from '../types/builder';

interface PublicProposta {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  servicos: string[];
  valor: number;
  status: 'pendente' | 'aprovada' | 'recusada';
  elementos: BuilderElement[];
  contratoTexto?: string | null;
  creatorPlan?: string | null;
  pago: boolean;
  data_criacao: string;
}

interface PublicOrg {
  id: string;
  name: string;
  cnpj: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  plan: 'free' | 'pro' | 'business';
}

interface PublicResponse {
  proposta: PublicProposta;
  organization: PublicOrg;
}

interface Props {
  token: string;
}

export default function PublicProposta({ token }: Props) {
  const [data, setData] = useState<PublicResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [formOpen, setFormOpen] = useState<false | 'approve' | 'reject'>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<PublicResponse>(`/api/public/propostas/${encodeURIComponent(token)}`, {
          skipRefresh: true,
        });
        if (cancelled) return;
        setData(res);
        setClientName(res.proposta.cliente_nome ?? '');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError('Proposta não encontrada ou link expirado.');
        } else {
          setError('Não foi possível carregar a proposta. Tente novamente mais tarde.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const proposta = data?.proposta;
  const org = data?.organization;

  const isDecided = useMemo(() => proposta?.status === 'aprovada' || proposta?.status === 'recusada', [proposta?.status]);

  async function decide(action: 'approve' | 'reject') {
    if (!proposta) return;
    setIsSubmitting(true);
    try {
      const updated = await api.post<PublicProposta>(
        `/api/public/propostas/${encodeURIComponent(token)}/decision`,
        {
          action,
          clientName: clientName || undefined,
          clientEmail: clientEmail || undefined,
          clientDocument: clientDoc || undefined,
        },
        { skipRefresh: true },
      );
      setData((prev) => (prev ? { ...prev, proposta: updated } : prev));
      setFormOpen(false);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Erro ao registrar decisão.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbf9] text-zinc-500">
        Carregando proposta...
      </div>
    );
  }

  if (error || !proposta || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfbf9] px-6">
        <div className="glass-panel p-10 rounded-3xl text-center max-w-md">
          <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-900 mb-3 tracking-tight">Ops</h2>
          <p className="text-zinc-500 text-sm">{error ?? 'Proposta indisponível.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbf9] relative overflow-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-200/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-100/20 rounded-full blur-[120px]" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-white/70 border-b border-black/[0.04]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org.logoUrl ? (
              <img src={org.logoUrl} alt={org.name} className="w-8 h-8 rounded-xl object-cover" />
            ) : (
              <div className="w-8 h-8 bg-zinc-900 rounded-xl text-white font-bold flex items-center justify-center">
                {(org.name || 'P').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm font-semibold text-zinc-900 tracking-tight">{org.name}</div>
              <div className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase">Proposta</div>
            </div>
          </div>
          <div className="hidden sm:block text-xs text-zinc-400">Para: <span className="text-zinc-900 font-medium">{proposta.cliente_nome || 'Cliente'}</span></div>
        </div>
      </header>

      <div className="pt-24 px-4 pb-16 relative z-10">
        <AnimatePresence mode="wait">
          {proposta.elementos.length === 0 ? (
            <motion.div key="empty" className="flex items-center justify-center h-[calc(100vh-12rem)]">
              <div className="apple-card text-center">
                <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Esta proposta está vazia.</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pb-8"
            >
              <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-black/[0.03]">
                {proposta.elementos.map((el) => (
                  <RenderElement key={el.id} element={el} previewMode={true} />
                ))}
              </div>

              {!isDecided && (
                <div className="max-w-5xl mx-auto mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => setFormOpen('approve')}
                    disabled={isSubmitting}
                    className="btn-primary"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Aprovar proposta
                  </button>
                  <button
                    onClick={() => setFormOpen('reject')}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-2xl font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-all flex items-center gap-2 justify-center"
                  >
                    <XCircle className="w-4 h-4" /> Recusar
                  </button>
                </div>
              )}

              {isDecided && (
                <div className="max-w-5xl mx-auto mt-8">
                  <div className={`rounded-2xl p-6 text-center font-medium ${
                    proposta.status === 'aprovada'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {proposta.status === 'aprovada'
                      ? 'Proposta aprovada. O responsável dará sequência ao contrato.'
                      : 'Proposta recusada.'}
                  </div>
                </div>
              )}

              {shouldShowWatermark(proposta.creatorPlan as 'free' | 'pro' | 'business' | undefined) && <PropezWatermark />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setFormOpen(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">
                {formOpen === 'approve' ? 'Confirmar aprovação' : 'Confirmar recusa'}
              </h3>
              <p className="text-sm text-zinc-500 mb-6">Precisamos confirmar alguns dados para registrar sua decisão.</p>
              <div className="space-y-3">
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                  className="glass-input"
                />
                <input
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="glass-input"
                />
                {formOpen === 'approve' && (
                  <input
                    value={clientDoc}
                    onChange={(e) => setClientDoc(e.target.value)}
                    placeholder="CPF/CNPJ"
                    className="glass-input"
                  />
                )}
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <button
                  onClick={() => setFormOpen(false)}
                  className="px-5 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => decide(formOpen)}
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Enviando...' : formOpen === 'approve' ? 'Aprovar' : 'Recusar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
