import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, History, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import type { NavigateFn } from '../../../types/navigation';
import { usePropostas, useServicos } from '../../../hooks/useStoreEntity';
import { formatBRL } from '../../../lib/format';
import { getProposalListingStatus } from '../../../lib/proposalSubStatus';
import { getListingStatusColors } from '../listingLayout';
import { ActivityHistoryList, type ActivityHistoryItem } from '../ActivityHistoryList';
import { WaitOverlay } from '../WaitOverlay';
import { buildProposalActivityHistory } from '../../../lib/buildProposalActivityHistory';
import { fetchProposalTimeline } from '../../../services/proposalTimelineApi';
import { getContractSignStatus, type ContractSignStatusResponse } from '../../../services/contractSignApi';
import { ContractDocumentActions } from '../../../components/contratos/ContractDocumentActions';
import { flowHasStep } from '../../../types/proposalFlow';

interface ProposalWaitingPanelProps {
  proposalId: string;
  onBack: () => void;
  navigate: NavigateFn;
}

export function ProposalWaitingPanel({ proposalId, onBack, navigate }: ProposalWaitingPanelProps) {
  const propostas = usePropostas();
  const servicos = useServicos();
  const proposta = propostas.find((p) => p.id === proposalId);
  const [tab, setTab] = useState<'resumo' | 'historico'>('resumo');
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityHistoryItem[]>([]);
  const [contractSignMeta, setContractSignMeta] = useState<ContractSignStatusResponse | null>(null);

  const servicosLabel = useMemo(() => {
    if (!proposta) return '';
    const nomes = proposta.servicos
      .map((id) => servicos.find((s) => s.id === id)?.nome)
      .filter(Boolean);
    return nomes.length > 0 ? nomes.join(', ') : 'Nenhum serviço';
  }, [proposta, servicos]);

  const listingStatus = proposta ? getProposalListingStatus(proposta) : null;
  const colors = listingStatus ? getListingStatusColors(listingStatus.tone) : null;

  useEffect(() => {
    if (!proposta) return;
    if (!flowHasStep(proposta.fluxo, 'sign')) return;
    let cancelled = false;
    void getContractSignStatus(proposalId).then((status) => {
      if (!cancelled && status) setContractSignMeta(status);
    });
    return () => {
      cancelled = true;
    };
  }, [proposalId, proposta?.fluxo, proposta?.contractSignStatus]);

  useEffect(() => {
    if (!proposta) return;
    let cancelled = false;
    setLoading(true);
    fetchProposalTimeline(proposalId)
      .then((items) => {
        if (!cancelled) setActivities(items);
      })
      .catch(() => {
        if (!cancelled) setActivities(buildProposalActivityHistory(proposta));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [proposalId, proposta]);

  if (!proposta) {
    return (
      <div className="page-container py-12 text-center">
        <p className="text-zinc-500 font-medium">Proposta não encontrada.</p>
        <button type="button" onClick={onBack} className="btn-primary mt-6">
          Voltar
        </button>
      </div>
    );
  }

  const publicUrl = proposta.publicToken
    ? `${window.location.origin}/p/${proposta.publicToken}`
    : null;

  return (
    <div className="min-h-full bg-[#F5F5F7] font-sans relative">
      {loading && <WaitOverlay message="Aguarde, carregando histórico..." />}

      <div className="page-container pb-16">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar às propostas
            </button>
            <button
              type="button"
              onClick={() => navigate('visualizar-proposta', { id: proposalId })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-700 hover:border-zinc-300 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir proposta completa
            </button>
          </div>

          <div className="apple-card !p-6 sm:!p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl font-bold text-zinc-900 tracking-tight truncate">
                    {proposta.cliente_nome}
                  </h2>
                  <p className="text-sm text-zinc-400 font-medium mt-1 truncate">{servicosLabel}</p>
                </div>
              </div>
              {listingStatus && colors && (
                <span
                  className={`shrink-0 self-start rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${colors.footer}`}
                >
                  {listingStatus.primaryLabel}
                  {listingStatus.secondaryLabels.length > 0
                    ? ` · ${listingStatus.secondaryLabels.join(' · ')}`
                    : ''}
                </span>
              )}
            </div>

            <div className="mt-6 flex gap-2 border-b border-zinc-100">
              <button
                type="button"
                onClick={() => setTab('resumo')}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
                  tab === 'resumo'
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Resumo
              </button>
              <button
                type="button"
                onClick={() => setTab('historico')}
                className={`inline-flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
                  tab === 'historico'
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Histórico
              </button>
            </div>

            {tab === 'resumo' ? (
              <div className="pt-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Valor</div>
                    <div className="text-xl font-bold text-zinc-900 mt-1">{formatBRL(proposta.valor)}</div>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Status</div>
                    <div className="text-sm font-bold text-zinc-900 mt-1 capitalize">{proposta.status}</div>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-5">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Criada em</div>
                    <div className="text-sm font-bold text-zinc-900 mt-1">
                      {new Date(proposta.data_criacao).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>

                {publicUrl && (
                  <div className="rounded-2xl border border-zinc-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                        Link público
                      </div>
                      <p className="text-xs text-zinc-600 truncate mt-1">{publicUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(publicUrl)}
                      className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-900"
                    >
                      Copiar
                    </button>
                  </div>
                )}

                {(proposta.contractSignStatus === 'sent' || proposta.contractSignStatus === 'signed') && (
                  <ContractDocumentActions
                    proposalId={proposta.id}
                    signStatus={proposta.contractSignStatus}
                    documentId={contractSignMeta?.documentId ?? proposta.contractSignDocumentId}
                    validationUrl={contractSignMeta?.validationUrl}
                    validationToken={contractSignMeta?.validationToken}
                    originalPdfUrl={contractSignMeta?.originalPdfUrl}
                    signedPdfUrl={contractSignMeta?.signedPdfUrl}
                    variant="compact"
                  />
                )}
              </div>
            ) : (
              <div className="pt-6">
                <ActivityHistoryList activities={activities} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
