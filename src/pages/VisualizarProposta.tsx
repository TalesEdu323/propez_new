import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { hydrateStore, isStoreHydrated, store, Proposta, fetchPropostaById } from '../lib/store';
import { RenderElement } from '../components/builder/RenderElement';
import { PageShell } from '../components/builder/PageShell';
import { normalizePageLayout, mergeOrgBrandIntoPageLayout } from '../lib/pageLayout';
import { motion, AnimatePresence } from 'motion/react';
import { updateProposalStatusInCRM } from '../services/crmApi';
import { resolveOrgBrand } from '../lib/orgBrand';
import { PublicOrgHeader } from './publicProposta/PublicOrgHeader';
import { getContractSignStatus, type ContractSignStatusResponse } from '../services/contractSignApi';
import { usePropostas, useUserConfig } from '../hooks/useStoreEntity';
import { ClientIdentificationModal } from './visualizarProposta/ClientIdentificationModal';
import { ProposalHeader } from './visualizarProposta/ProposalHeader';
import { ProposalActions } from './visualizarProposta/ProposalActions';
import { ContractView, type ContractSignStatusUi } from './visualizarProposta/ContractView';
import { ContractAcceptancePanel } from './visualizarProposta/ContractAcceptancePanel';
import { PropezWatermark } from './visualizarProposta/PropezWatermark';
import { shouldShowWatermark } from '../lib/featureFlags';
import { flowHasStep } from '../types/proposalFlow';
import { api } from '../lib/apiClient';
import { updateProposta } from '../lib/store';
import { toast } from '../lib/feedback';
import type { NavigateFn } from '../types/navigation';

export default function VisualizarProposta({ navigate, id }: { navigate: NavigateFn; id: string }) {
  const propostas = usePropostas();
  const userConfig = useUserConfig();
  const proposta: Proposta | null = useMemo(() => propostas.find(p => p.id === id) ?? null, [propostas, id]);
  const orgBrand = useMemo(() => resolveOrgBrand(null, userConfig), [userConfig]);
  const pageLayout = useMemo(() => {
    if (!proposta) return normalizePageLayout(undefined);
    return mergeOrgBrandIntoPageLayout(normalizePageLayout(proposta.pageLayout), orgBrand);
  }, [proposta, orgBrand]);
  const showOrgHeader = orgBrand.isWhiteLabel;
  const [isResolvingProposal, setIsResolvingProposal] = useState(false);

  const [viewState, setViewState] = useState<'proposal' | 'contract'>('proposal');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showIdentification, setShowIdentification] = useState(false);
  const [clientData, setClientData] = useState({
    nome: '',
    email: '',
    documento: '', // CPF/CNPJ
  });
  const [contractSignStatus, setContractSignStatus] = useState<ContractSignStatusUi>(null);
  const [contractSignMeta, setContractSignMeta] = useState<Pick<
    ContractSignStatusResponse,
    'validationUrl' | 'validationToken' | 'originalPdfUrl' | 'signedPdfUrl'
  > | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!id || proposta) {
      setIsResolvingProposal(false);
      return;
    }
    if (isStoreHydrated()) {
      setIsResolvingProposal(false);
      return;
    }

    setIsResolvingProposal(true);
    void hydrateStore()
      .catch((error) => {
        console.error('[VisualizarProposta] falha ao hidratar store para resolver rota direta:', error);
      })
      .finally(() => {
        if (!cancelled) setIsResolvingProposal(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, proposta]);

  useEffect(() => {
    if (!id || !proposta) return;
    if (proposta.elementos.length > 0) return;
    void fetchPropostaById(id);
  }, [id, proposta?.id, proposta?.elementos.length]);

  useEffect(() => {
    if (!proposta) return;
    setClientData(prev => ({
      ...prev,
      nome: proposta.cliente_nome,
      email: proposta.clienteEmail?.trim() || prev.email,
    }));
    if (proposta.status === 'aprovada' && flowHasStep(proposta.fluxo, 'sign') && (proposta.contratoTexto || proposta.contratoId)) {
      setViewState('contract');
    }
    if (proposta.contractSignStatus) {
      setContractSignStatus(proposta.contractSignStatus as ContractSignStatusUi);
    }
  }, [proposta?.id, proposta?.status, proposta?.cliente_nome, proposta?.contractSignStatus]);

  // Polling de status da assinatura enquanto o documento não estiver assinado.
  useEffect(() => {
    if (!proposta) return;
    if (proposta.status !== 'aprovada') return;
    if (!proposta.contratoTexto && !proposta.contratoId) return;
    if (contractSignStatus === 'signed' || contractSignStatus === 'cancelled' || contractSignStatus === 'failed') return;

    let cancelled = false;
    const tick = async () => {
      const status = await getContractSignStatus(proposta.id);
      if (cancelled || !status) return;
      setContractSignStatus(status.status);
      setContractSignMeta({
        validationUrl: status.validationUrl,
        validationToken: status.validationToken,
        originalPdfUrl: status.originalPdfUrl,
        signedPdfUrl: status.signedPdfUrl,
      });
      const all = store.getPropostas();
      store.savePropostas(
        all.map(p =>
          p.id === proposta.id
            ? {
                ...p,
                contractSignStatus: status.status,
                contractSignDocumentId: status.documentId || p.contractSignDocumentId,
                contractSigningUrl: status.signingUrl || p.contractSigningUrl,
                contractSignLastSyncAt: new Date().toISOString(),
              }
            : p,
        ),
      );
    };
    tick();
    const interval = window.setInterval(tick, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [proposta?.id, proposta?.status, proposta?.contratoTexto, proposta?.contratoId, contractSignStatus]);

  const persistProposta = (patch: Partial<Proposta>) => {
    const all = store.getPropostas();
    store.savePropostas(all.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const handleApprove = async () => {
    if (!proposta) return;

    if (!clientData.documento || !clientData.email) {
      setShowIdentification(true);
      return;
    }

    setIsUpdating(true);
    try {
      // Se veio do ProSync, atualiza o lead lá (contacted -> qualified).
      if (proposta.prosyncLeadId) {
        await updateProposalStatusInCRM({
          proposalId: proposta.id,
          crmClientId: proposta.prosyncLeadId,
          status: 'aprovada',
          value: proposta.valor,
          updatedAt: new Date().toISOString(),
          proposalUrl: `${window.location.origin}/app?route=visualizar-proposta&id=${proposta.id}`,
          clientEmail: clientData.email,
          clientDocument: clientData.documento,
        });
      }

      const updated = await updateProposta(proposta.id, {
        status: 'aprovada',
        clienteEmail: clientData.email,
      });
      setContractSignStatus(updated.contractSignStatus ?? 'pending');
      setViewState('contract');
      setShowIdentification(false);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Erro ao aprovar proposta. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcceptContract = async () => {
    if (!proposta) return;
    setIsUpdating(true);
    try {
      const updated = await api.post<Proposta>(`/api/propostas/${proposta.id}/accept-contract`, {});
      persistProposta(updated);
      toast.success('Contrato aceito com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível aceitar o contrato.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!proposta) return;
    setIsUpdating(true);

    try {
      if (proposta.prosyncLeadId) {
        await updateProposalStatusInCRM({
          proposalId: proposta.id,
          crmClientId: proposta.prosyncLeadId,
          status: 'recusada',
          value: proposta.valor,
          updatedAt: new Date().toISOString(),
        });
      }

      persistProposta({ status: 'recusada' });
      toast.success('Proposta recusada.');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Erro ao recusar proposta. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isResolvingProposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center glass-panel p-10 rounded-3xl">
          <p className="text-zinc-500 font-medium">Carregando proposta...</p>
        </div>
      </div>
    );
  }

  if (!proposta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center glass-panel p-10 rounded-3xl"
        >
          <h2 className="text-2xl font-bold text-zinc-900 mb-4 tracking-tight">
            {id ? 'Proposta não encontrada' : 'Link inválido'}
          </h2>
          <button onClick={() => navigate('propostas')} className="text-zinc-500 hover:text-black font-medium transition-colors">Voltar para Propostas</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbf9] relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-zinc-200/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-zinc-100/20 rounded-full blur-[120px]" />
      </div>

      <ProposalHeader clienteNome={proposta.cliente_nome} onBack={() => navigate('propostas')} />

      {showOrgHeader && (
        <PublicOrgHeader
          name={userConfig.nome || orgBrand.orgName}
          logoUrl={orgBrand.logoUrl}
          primaryColor={orgBrand.primaryColor}
        />
      )}

      <div className="pt-24 px-4 pb-12 relative z-10">
        <AnimatePresence mode="wait">
          {proposta.elementos.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-[calc(100vh-12rem)]"
            >
              <div className="apple-card text-center">
                <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-4" />
                <p className="text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">Esta proposta está vazia.</p>
              </div>
            </motion.div>
          ) : viewState === 'proposal' ? (
            <motion.div 
              key="proposal"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
              className="pb-24"
            >
              <div className="w-full bg-white">
                <PageShell layout={pageLayout}>
                  {proposta.elementos.map((el) => (
                    <RenderElement
                      key={el.id}
                      element={el}
                      previewMode
                      pageLayout={pageLayout}
                      onProposalAction={
                        proposta.status === 'pendente'
                          ? () => { void handleApprove(); }
                          : undefined
                      }
                    />
                  ))}
                </PageShell>
              </div>

              <ProposalActions
                proposta={proposta}
                isUpdating={isUpdating}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewContract={() => setViewState('contract')}
              />

              {shouldShowWatermark(proposta.creatorPlan) && <PropezWatermark />}
            </motion.div>
          ) : (
            <motion.div key="contract" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto">
              <ContractAcceptancePanel
                proposta={proposta}
                onAccept={handleAcceptContract}
                accepting={isUpdating}
              />
              <ContractView
                proposta={proposta}
                contractSignStatus={contractSignStatus}
                userConfig={userConfig}
                onBackToProposal={() => setViewState('proposal')}
                validationUrl={contractSignMeta?.validationUrl}
                validationToken={contractSignMeta?.validationToken}
                originalPdfUrl={contractSignMeta?.originalPdfUrl}
                signedPdfUrl={contractSignMeta?.signedPdfUrl}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ClientIdentificationModal
          open={showIdentification}
          value={clientData}
          onChange={setClientData}
          onConfirm={handleApprove}
          onClose={() => setShowIdentification(false)}
          isSubmitting={isUpdating}
        />
      </div>
    </div>
  );
}
