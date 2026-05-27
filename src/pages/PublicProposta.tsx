/**
 * Página pública de visualização de proposta em `/p/:token`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, ApiError } from '../lib/apiClient';
import { RenderElement } from '../components/builder/RenderElement';
import { PropezWatermark } from './visualizarProposta/PropezWatermark';
import { shouldShowWatermark } from '../lib/featureFlags';
import { flowHasStep, parseProposalFlow } from '../types/proposalFlow';
import type { BuilderElement } from '../types/builder';
import type { ProposalFlowConfig } from '../types/proposalFlow';
import { ProposalDecisionDock } from './publicProposta/ProposalDecisionDock';
import { PublicSignStep } from './publicProposta/PublicSignStep';
import { PublicPayStep } from './publicProposta/PublicPayStep';

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
  rubricaStatus?: string | null;
  rubricaSigningUrl?: string | null;
  clienteContratoRecebidoAt?: string | null;
  contratoConcluidoAt?: string | null;
  fluxo?: ProposalFlowConfig;
  chavePix?: string | null;
  linkPagamento?: string | null;
}

interface PublicOrg {
  id: string;
  name: string;
  cnpj: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  plan: 'free' | 'pro' | 'business';
}

interface JourneyInfo {
  fluxo: ProposalFlowConfig;
  contractPhase: string;
  canPay: boolean;
}

interface PublicResponse {
  proposta: PublicProposta;
  organization: PublicOrg;
  journey?: JourneyInfo;
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
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [dockVisible, setDockVisible] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await api.get<PublicResponse>(`/api/public/propostas/${encodeURIComponent(token)}`, {
      skipRefresh: true,
    });
    setData(res);
    setClientName(res.proposta.cliente_nome ?? '');
  }, [token]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('rubrica') === 'done') {
      void load();
    }
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          if (err.status === 404) setError('Proposta não encontrada ou link expirado.');
          else if (err.status === 410) setError('Este link público não está mais disponível.');
          else setError(`Não foi possível carregar a proposta (${err.status}).`);
        } else {
          setError('Não foi possível carregar a proposta. Tente novamente mais tarde.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el || data?.proposta.status !== 'pendente') return;
    const obs = new IntersectionObserver(
      ([entry]) => setDockVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [data?.proposta.status, data?.proposta.elementos.length]);

  const proposta = data?.proposta;
  const org = data?.organization;
  const fluxo = useMemo(
    () => parseProposalFlow(proposta?.fluxo ?? data?.journey?.fluxo),
    [proposta?.fluxo, data?.journey?.fluxo],
  );
  const isDecided = proposta?.status === 'aprovada' || proposta?.status === 'recusada';
  const showSign = isDecided && proposta?.status === 'aprovada' && flowHasStep(fluxo, 'sign');
  const showPay =
    isDecided &&
    proposta?.status === 'aprovada' &&
    flowHasStep(fluxo, 'pay') &&
    (data?.journey?.canPay ?? (!flowHasStep(fluxo, 'sign') || !!proposta?.contratoConcluidoAt));

  const scrollToDecision = () => {
    anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setDockVisible(true);
  };

  const handleProposalAction = () => {
    setDockVisible(true);
    scrollToDecision();
  };

  const decide = async (action: 'approve' | 'reject') => {
    if (!clientName.trim() || !clientEmail.trim()) {
      setDecisionError('Informe nome e e-mail.');
      return;
    }
    if (action === 'approve' && !clientDoc.trim()) {
      setDecisionError('Informe CPF ou CNPJ para aprovação.');
      return;
    }
    setIsSubmitting(true);
    setDecisionError(null);
    try {
      const res = await api.post<{ proposta: PublicProposta; journey?: JourneyInfo }>(
        `/api/public/propostas/${encodeURIComponent(token)}/decision`,
        {
          action,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientDocument: action === 'approve' ? clientDoc.trim() : undefined,
        },
        { skipRefresh: true },
      );
      setData((prev) => (prev ? { ...prev, proposta: res.proposta, journey: res.journey } : prev));
      setFormOpen(false);
    } catch (err) {
      setDecisionError(err instanceof ApiError ? err.message : 'Erro ao enviar decisão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReceipt = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post<{ proposta: PublicProposta; journey?: JourneyInfo }>(
        `/api/public/propostas/${encodeURIComponent(token)}/confirm-receipt`,
        {},
        { skipRefresh: true },
      );
      setData((prev) => (prev ? { ...prev, proposta: res.proposta, journey: res.journey } : prev));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Não foi possível confirmar o recebimento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-500">
        Carregando proposta...
      </div>
    );
  }

  if (error || !proposta || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6">
        <div className="glass-panel p-10 rounded-3xl text-center max-w-md">
          <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-900 mb-3 tracking-tight">Ops</h2>
          <p className="text-zinc-500 text-sm">{error ?? 'Proposta indisponível.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white relative font-sans">
      <AnimatePresence mode="wait">
        {proposta.elementos.length === 0 ? (
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Esta proposta está vazia.</p>
          </div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            {proposta.elementos.map((el) => (
              <RenderElement
                key={el.id}
                element={el}
                previewMode
                onProposalAction={proposta.status === 'pendente' ? handleProposalAction : undefined}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={anchorRef} id="proposal-decision-anchor" className="min-h-[30vh] flex flex-col justify-end pb-4 sm:pb-8">
        {proposta.status === 'pendente' && !dockVisible && (
          <p className="text-center text-sm text-zinc-400 px-6 py-12">
            Role até o final da proposta ou toque em &quot;Aprovar proposta&quot; no conteúdo para abrir as opções.
          </p>
        )}

        {proposta.status === 'aprovada' && (
          <>
            {showSign && (
              <PublicSignStep
                proposta={proposta}
                fluxo={fluxo}
                orgName={org.name}
                publicToken={token}
                onConfirmReceipt={confirmReceipt}
                confirming={isSubmitting}
              />
            )}
            {showPay && (
              <PublicPayStep
                valor={proposta.valor}
                chavePix={data.proposta.chavePix}
                linkPagamento={data.proposta.linkPagamento}
              />
            )}
            {!showSign && !showPay && (
              <div className="max-w-lg mx-auto my-12 p-6 rounded-2xl bg-emerald-50 text-emerald-800 text-center font-medium">
                Proposta aprovada. Obrigado!
              </div>
            )}
          </>
        )}

        {proposta.status === 'recusada' && (
          <div className="max-w-lg mx-auto my-12 p-6 rounded-2xl bg-red-50 text-red-700 text-center font-medium">
            Proposta recusada.
          </div>
        )}

        {shouldShowWatermark(proposta.creatorPlan as 'free' | 'pro' | 'business' | undefined) && (
          <PropezWatermark />
        )}
      </div>

      {proposta.status === 'pendente' && (
        <ProposalDecisionDock
          orgName={org.name}
          visible={dockVisible}
          onApprove={() => { setFormOpen('approve'); }}
          onReject={() => { setFormOpen('reject'); }}
          disabled={isSubmitting}
        />
      )}

      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setFormOpen(false)}
          >
            <motion.div
              initial={{ y: 40, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 40, scale:  0.98 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">
                {formOpen === 'approve' ? 'Confirmar aprovação' : 'Confirmar recusa'}
              </h3>
              <p className="text-sm text-zinc-500 mb-6">Precisamos confirmar alguns dados para registrar sua decisão.</p>
              <div className="space-y-3">
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome completo" className="glass-input" />
                <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Email" type="email" className="glass-input" />
                {formOpen === 'approve' && (
                  <input value={clientDoc} onChange={(e) => setClientDoc(e.target.value)} placeholder="CPF/CNPJ" className="glass-input" />
                )}
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <button type="button" onClick={() => setFormOpen(false)} className="px-5 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50">
                  Cancelar
                </button>
                <button type="button" onClick={() => decide(formOpen)} disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Enviando...' : formOpen === 'approve' ? 'Aprovar' : 'Recusar'}
                </button>
              </div>
              {decisionError && <p className="mt-3 text-sm text-red-600">{decisionError}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
