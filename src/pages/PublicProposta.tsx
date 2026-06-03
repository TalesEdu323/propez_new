/**
 * Página pública de visualização de proposta em `/p/:token`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api, apiFetch, ApiError } from '../lib/apiClient';
import { friendlySignaturePrepareError } from '../lib/signatureErrors';
import { RenderElement } from '../components/builder/RenderElement';
import type { ProposalDecision } from '../components/builder/RenderElement';
import { PageShell } from '../components/builder/PageShell';
import { normalizePageLayout, mergeOrgBrandIntoPageLayout } from '../lib/pageLayout';
import { PropezWatermark } from './visualizarProposta/PropezWatermark';
import { shouldShowWatermark } from '../lib/featureFlags';
import { resolveOrgBrand } from '../lib/orgBrand';
import { PublicOrgHeader } from './publicProposta/PublicOrgHeader';
import { flowHasStep, getContractSignPhase, parseProposalFlow } from '../types/proposalFlow';
import { resolveSigningPath } from '../lib/publicProposalUrls';
import type { BuilderElement } from '../types/builder';
import type { ProposalFlowConfig } from '../types/proposalFlow';
import { ProposalDecisionDock } from './publicProposta/ProposalDecisionDock';
import { PublicSignStep } from './publicProposta/PublicSignStep';
import {
  ContractPreparingOverlay,
  type ContractPrepareOverlayState,
} from '../components/publicProposta/ContractPreparingOverlay';

interface PublicProposta {
  id: string;
  cliente_id: string | null;
  cliente_nome: string;
  clienteEmail?: string;
  servicos: string[];
  valor: number;
  status: 'pendente' | 'aprovada' | 'recusada';
  elementos: BuilderElement[];
  pageLayout?: import('../types/builder').BuilderPageLayout;
  contratoTexto?: string | null;
  creatorPlan?: string | null;
  pago: boolean;
  data_criacao: string;
  contractSignStatus?: string | null;
  contractSignDocumentId?: string | null;
  contractSigningUrl?: string | null;
  clienteContratoRecebidoAt?: string | null;
  contratoConcluidoAt?: string | null;
  orgContratoAceitoAt?: string | null;
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
  primaryColor: string | null;
  secondaryColor: string | null;
  whitelabelEnabled?: boolean;
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

type ContractPrepareState = 'idle' | ContractPrepareOverlayState;

function pathFromProposta(p: PublicProposta, publicToken: string): string | null {
  return resolveSigningPath(p.contractSigningUrl ?? null, publicToken);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function PublicProposta({ token }: Props) {
  const navigate = useNavigate();
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
  const [contractPrepareState, setContractPrepareState] = useState<ContractPrepareState>('idle');
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [retryingSignature, setRetryingSignature] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const autoPrepareStartedRef = useRef(false);

  const load = useCallback(async (): Promise<PublicResponse> => {
    const res = await api.get<PublicResponse>(`/api/public/propostas/${encodeURIComponent(token)}`, {
      skipRefresh: true,
    });
    setData(res);
    setClientName(res.proposta.cliente_nome ?? '');
    setClientEmail(res.proposta.clienteEmail ?? '');
    return res;
  }, [token]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('signed') === '1' || q.get('step') === 'sign' || q.get('done') === '1') {
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
  const orgBrand = useMemo(
    () => resolveOrgBrand(org ? { ...org, whitelabelEnabled: org.whitelabelEnabled, plan: org.plan } : null),
    [org],
  );
  const pageLayout = useMemo(() => {
    if (!proposta) return normalizePageLayout(undefined);
    return mergeOrgBrandIntoPageLayout(normalizePageLayout(proposta.pageLayout), orgBrand);
  }, [proposta, orgBrand]);
  const showOrgHeader = orgBrand.isWhiteLabel;
  const fluxo = useMemo(
    () => parseProposalFlow(proposta?.fluxo ?? data?.journey?.fluxo),
    [proposta?.fluxo, data?.journey?.fluxo],
  );
  const isDecided = proposta?.status === 'aprovada' || proposta?.status === 'recusada';
  const showSign = isDecided && proposta?.status === 'aprovada' && flowHasStep(fluxo, 'sign');

  const signStatus = proposta?.contractSignStatus;
  const signingUrl = proposta?.contractSigningUrl;

  const awaitingSigningLink =
    showSign &&
    !signingUrl &&
    signStatus !== 'signed' &&
    signStatus !== 'failed' &&
    signStatus !== 'cancelled';

  const callPrepareSignature = useCallback(async () => {
    const url = `/api/public/propostas/${encodeURIComponent(token)}/prepare-signature`;
    const res = await apiFetch(url, {
      method: 'POST',
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
      skipRefresh: true,
    });
    let json: { proposta?: PublicProposta; journey?: JourneyInfo; error?: string } = {};
    try {
      json = (await res.json()) as typeof json;
    } catch {
      /* empty */
    }
    if (json.proposta) {
      setData((prev) =>
        prev ? { ...prev, proposta: json.proposta!, journey: json.journey ?? prev.journey } : prev,
      );
    }
    if (!res.ok) {
      const raw = json.error ?? res.statusText;
      throw new ApiError(res.status, friendlySignaturePrepareError(raw), json);
    }
    return json;
  }, [token]);

  const ensureSigningPath = useCallback(
    async (initial?: PublicProposta): Promise<string | null> => {
      let current = initial;
      if (!current) {
        const refreshed = await load();
        current = refreshed.proposta;
      }

      let path = pathFromProposta(current, token);
      if (path) return path;

      try {
        const json = await callPrepareSignature();
        if (json.proposta) {
          path = pathFromProposta(json.proposta, token);
          if (path) return path;
        }
      } catch {
        /* tenta polling abaixo */
      }

      for (let i = 0; i < 3; i++) {
        await sleep(2000);
        const refreshed = await load();
        path = pathFromProposta(refreshed.proposta, token);
        if (path) return path;
      }

      return null;
    },
    [callPrepareSignature, load, token],
  );

  const redirectToSigning = useCallback(
    (path: string) => {
      setContractPrepareState('redirecting');
      navigate(path, { replace: true });
    },
    [navigate],
  );

  const runPrepareAndRedirect = useCallback(
    async (initialProposta?: PublicProposta) => {
      setContractPrepareState('preparing');
      setPrepareError(null);
      try {
        const path = await ensureSigningPath(initialProposta);
        if (path) {
          redirectToSigning(path);
          return;
        }
        setContractPrepareState('error');
        setPrepareError('Não foi possível gerar o link de assinatura. Tente novamente.');
      } catch (err) {
        setContractPrepareState('error');
        setPrepareError(
          err instanceof ApiError
            ? friendlySignaturePrepareError(err.message)
            : 'Não foi possível preparar a assinatura.',
        );
      }
    },
    [ensureSigningPath, redirectToSigning],
  );

  const retryPrepareFromOverlay = async () => {
    setRetryingSignature(true);
    autoPrepareStartedRef.current = true;
    try {
      await runPrepareAndRedirect();
    } finally {
      setRetryingSignature(false);
    }
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('done') === '1') return;
    if (!awaitingSigningLink || autoPrepareStartedRef.current) return;
    autoPrepareStartedRef.current = true;
    void runPrepareAndRedirect();
  }, [awaitingSigningLink, runPrepareAndRedirect]);

  const signPhase = proposta
    ? getContractSignPhase({
        contractSignStatus: proposta.contractSignStatus,
        contractSignDocumentId: proposta.contractSignDocumentId,
        clienteContratoRecebidoAt: proposta.clienteContratoRecebidoAt,
        orgContratoAceitoAt: proposta.orgContratoAceitoAt,
        contratoConcluidoAt: proposta.contratoConcluidoAt,
      })
    : 'not_started';

  const signingPath = resolveSigningPath(signingUrl ?? null, token);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('done') === '1') return;
    if (contractPrepareState !== 'idle') return;
    if (!showSign || signPhase !== 'sign_pending' || !signingPath) return;
    redirectToSigning(signingPath);
  }, [showSign, signPhase, signingPath, contractPrepareState, redirectToSigning]);

  const showPrepareOverlay = contractPrepareState !== 'idle';

  const proposalDecision: ProposalDecision | undefined =
    proposta?.status === 'aprovada'
      ? 'approved'
      : proposta?.status === 'recusada'
        ? 'rejected'
        : 'pending';

  const scrollToDecision = () => {
    anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setDockVisible(true);
  };

  const handleProposalAction = () => {
    if (proposta) {
      setClientName(proposta.cliente_nome ?? '');
      setClientEmail(proposta.clienteEmail ?? '');
    }
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

      if (action === 'approve') {
        const approvedFluxo = parseProposalFlow(res.proposta.fluxo);
        if (flowHasStep(approvedFluxo, 'sign')) {
          autoPrepareStartedRef.current = true;
          const immediatePath = pathFromProposta(res.proposta, token);
          if (immediatePath) {
            redirectToSigning(immediatePath);
          } else {
            await runPrepareAndRedirect(res.proposta);
          }
        }
      }
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
      {showOrgHeader && org && (
        <PublicOrgHeader
          name={org.name}
          logoUrl={org.logoUrl}
          primaryColor={org.primaryColor ?? orgBrand.primaryColor}
        />
      )}

      {proposta.status === 'aprovada' && !showPrepareOverlay && (
        <div className="sticky top-0 z-40 w-full bg-emerald-600 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">Sim — Proposta aprovada</span>
        </div>
      )}
      {proposta.status === 'recusada' && (
        <div className="sticky top-0 z-40 w-full bg-red-600 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-sm">
          <XCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold">Não — Proposta recusada</span>
        </div>
      )}
      <AnimatePresence mode="wait">
        {proposta.elementos.length === 0 ? (
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Esta proposta está vazia.</p>
          </div>
        ) : (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full bg-white">
            <PageShell layout={pageLayout}>
              {proposta.elementos.map((el) => (
                <RenderElement
                  key={el.id}
                  element={el}
                  previewMode
                  pageLayout={pageLayout}
                  proposalDecision={proposalDecision}
                  onProposalAction={proposta.status === 'pendente' ? handleProposalAction : undefined}
                />
              ))}
            </PageShell>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={anchorRef} id="proposal-decision-anchor" className="min-h-[30vh] flex flex-col justify-end pb-4 sm:pb-8">
        {proposta.status === 'pendente' && !dockVisible && (
          <p className="text-center text-sm text-zinc-400 px-6 py-12">
            Role até o final da proposta ou toque em &quot;Aprovar proposta&quot; no conteúdo para abrir as opções.
          </p>
        )}

        {proposta.status === 'aprovada' && !showPrepareOverlay && (
          <>
            {showSign && (
              <PublicSignStep
                proposta={proposta}
                fluxo={fluxo}
                orgName={org.name}
                publicToken={token}
                onConfirmReceipt={confirmReceipt}
                onRetrySignature={retryPrepareFromOverlay}
                confirming={isSubmitting}
                retrying={retryingSignature}
              />
            )}
            {!showSign && !flowHasStep(fluxo, 'sign') && (
              <div className="max-w-lg mx-auto my-12 p-6 rounded-2xl bg-emerald-50 text-emerald-800 text-center font-medium border border-emerald-100">
                Proposta aprovada. Obrigado!
              </div>
            )}
          </>
        )}

        {proposta.status === 'recusada' && (
          <div className="max-w-lg mx-auto my-12 p-6 rounded-2xl bg-red-50 text-red-700 text-center font-medium border border-red-100">
            Sua resposta foi registrada.
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
          onApprove={() => {
            if (proposta) {
              setClientName(proposta.cliente_nome ?? '');
              setClientEmail(proposta.clienteEmail ?? '');
            }
            setFormOpen('approve');
          }}
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
              exit={{ y: 40, scale: 0.98 }}
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

      {showPrepareOverlay && (
        <ContractPreparingOverlay
          state={contractPrepareState === 'idle' ? 'preparing' : contractPrepareState}
          errorMessage={prepareError}
          onRetry={contractPrepareState === 'error' ? () => void retryPrepareFromOverlay() : undefined}
          retrying={retryingSignature}
        />
      )}
    </div>
  );
}
