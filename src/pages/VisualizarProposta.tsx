import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { store, Proposta } from '../lib/store';
import { RenderElement } from '../components/builder/RenderElement';
import { motion, AnimatePresence } from 'motion/react';
import { updateProposalStatusInCRM } from '../services/crmApi';
import {
  sendToRubricaForSigning,
  getRubricaStatus,
} from '../services/rubricaApi';
import { usePropostas, useUserConfig } from '../hooks/useStoreEntity';
import { ClientIdentificationModal } from './visualizarProposta/ClientIdentificationModal';
import { ProposalHeader } from './visualizarProposta/ProposalHeader';
import { ProposalActions } from './visualizarProposta/ProposalActions';
import { ContractView, type RubricaStatus } from './visualizarProposta/ContractView';
import { PropezWatermark } from './visualizarProposta/PropezWatermark';
import { shouldShowWatermark } from '../lib/featureFlags';
import type { NavigateFn } from '../types/navigation';

export default function VisualizarProposta({ navigate, id }: { navigate: NavigateFn; id: string }) {
  const propostas = usePropostas();
  const userConfig = useUserConfig();
  const proposta: Proposta | null = useMemo(() => propostas.find(p => p.id === id) ?? null, [propostas, id]);

  const [viewState, setViewState] = useState<'proposal' | 'contract'>('proposal');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showIdentification, setShowIdentification] = useState(false);
  const [clientData, setClientData] = useState({
    nome: '',
    email: '',
    documento: '', // CPF/CNPJ
  });
  const [rubricaStatus, setRubricaStatus] = useState<RubricaStatus>(null);

  useEffect(() => {
    if (!proposta) return;
    const lastEmail = localStorage.getItem('propez_last_email') || '';
    setClientData(prev => ({ ...prev, nome: proposta.cliente_nome, email: prev.email || lastEmail }));
    if (proposta.status === 'aprovada') {
      setViewState('contract');
    }
    if (proposta.rubricaStatus) {
      setRubricaStatus(proposta.rubricaStatus);
    }
  }, [proposta?.id, proposta?.status, proposta?.cliente_nome, proposta?.rubricaStatus]);

  // Polling de status do Rubrica enquanto o documento não estiver assinado.
  useEffect(() => {
    if (!proposta) return;
    if (proposta.status !== 'aprovada') return;
    if (!proposta.contratoTexto) return;
    if (rubricaStatus === 'signed' || rubricaStatus === 'cancelled' || rubricaStatus === 'failed') return;

    let cancelled = false;
    const tick = async () => {
      const status = await getRubricaStatus(proposta.id);
      if (cancelled || !status) return;
      setRubricaStatus(status.status);
      const all = store.getPropostas();
      store.savePropostas(
        all.map(p =>
          p.id === proposta.id
            ? {
                ...p,
                rubricaStatus: status.status,
                rubricaDocumentId: status.documentId || p.rubricaDocumentId,
                rubricaSigningUrl: status.signingUrl || p.rubricaSigningUrl,
                rubricaSignedPdfUrl: status.signedPdfUrl || p.rubricaSignedPdfUrl,
                rubricaLastSyncAt: new Date().toISOString(),
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
  }, [proposta?.id, proposta?.status, rubricaStatus]);

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
          proposalUrl: `${window.location.origin}/?route=visualizar-proposta&id=${proposta.id}`,
          clientEmail: clientData.email,
          clientDocument: clientData.documento,
        });
      }

      let rubricaDocumentId: string | undefined
      let rubricaSigningUrl: string | undefined
      let rubricaInitialStatus: Proposta['rubricaStatus'] = 'pending'

      if (proposta.contratoTexto) {
        const result = await sendToRubricaForSigning({
          proposalId: proposta.id,
          clientName: clientData.nome || proposta.cliente_nome,
          clientEmail: clientData.email,
          clientDocument: clientData.documento,
          contractText: proposta.contratoTexto,
          contractTitle: `Contrato — ${proposta.cliente_nome}`,
          companyName: userConfig.nome,
          companyCnpj: userConfig.cnpj,
          value: proposta.valor,
          prosyncLeadId: proposta.prosyncLeadId,
        });
        if (result.success) {
          rubricaDocumentId = result.documentId
          rubricaSigningUrl = result.signingUrl
          rubricaInitialStatus = 'sent'
        } else {
          rubricaInitialStatus = 'failed'
          console.error('[Rubrica] envio falhou:', result.error)
        }
      }

      persistProposta({
        status: 'aprovada',
        rubricaDocumentId,
        rubricaSigningUrl,
        rubricaStatus: rubricaInitialStatus,
      });
      setRubricaStatus(rubricaInitialStatus);
      setViewState('contract');
      setShowIdentification(false);
      localStorage.setItem('propez_last_email', clientData.email);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Erro ao aprovar proposta. Tente novamente.');
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
      alert('Proposta recusada.');
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Erro ao recusar proposta. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!proposta) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center glass-panel p-10 rounded-3xl"
        >
          <h2 className="text-2xl font-bold text-zinc-900 mb-4 tracking-tight">Proposta não encontrada</h2>
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
              <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-black/[0.03]">
                {proposta.elementos.map((el) => (
                  <RenderElement key={el.id} element={el} previewMode={true} />
                ))}
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
            <ContractView
              proposta={proposta}
              rubricaStatus={rubricaStatus}
              userConfig={userConfig}
              onBackToProposal={() => setViewState('proposal')}
            />
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
