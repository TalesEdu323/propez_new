import { motion } from 'motion/react';
import { Check, ChevronRight, Clock, FileText, MoreVertical, X } from 'lucide-react';
import type { Proposta } from '../../../lib/store';
import { formatBRL } from '../../../lib/format';
import { getFlowStepLabels, getProposalListingStatus } from '../../../lib/proposalSubStatus';
import { getListingStatusColors } from '../listingLayout';

interface ProposalListingCardProps {
  proposta: Proposta;
  servicosLabel: string;
  index?: number;
  onOpen: (id: string) => void;
  onMenuAction?: (action: 'delete' | 'toggle-approve', id: string) => void;
}

export function ProposalListingCard({
  proposta,
  servicosLabel,
  index = 0,
  onOpen,
  onMenuAction,
}: ProposalListingCardProps) {
  const status = getProposalListingStatus(proposta);
  const colors = getListingStatusColors(status.tone);
  const steps = getFlowStepLabels(proposta);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: index * 0.04 }}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(proposta.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(proposta.id);
        }
      }}
      className="group flex cursor-pointer overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
    >
      <div className={`w-1.5 shrink-0 ${colors.bar}`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-100 bg-zinc-50 transition-colors group-hover:bg-zinc-900 group-hover:text-white">
              <FileText className="h-5 w-5" />
            </div>
            {onMenuAction && (
              <div className="relative opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
                  onClick={(e) => {
                    e.stopPropagation();
                    const action = window.confirm('Excluir esta proposta?') ? 'delete' : null;
                    if (action) onMenuAction(action, proposta.id);
                  }}
                  title="Mais ações"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <h3 className="truncate text-lg font-bold tracking-tight text-zinc-900">{proposta.cliente_nome}</h3>
          <p className="mt-1 line-clamp-1 text-xs font-medium text-zinc-400">{servicosLabel}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {status.secondaryLabels.map((label) => (
              <span
                key={label}
                className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider ${colors.badge}`}
              >
                {label}
              </span>
            ))}
          </div>

          {status.totalSteps > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                <span>Progresso</span>
                <span>{status.progressPercent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full transition-all ${colors.progress}`}
                  style={{ width: `${status.progressPercent}%` }}
                />
              </div>
              <div className="mt-2 flex gap-2">
                {steps.map((s) => (
                  <span key={s.step} className="flex items-center gap-0.5 text-[8px] text-zinc-400">
                    {proposta.status === 'recusada' ? (
                      <X className="h-3 w-3 text-[#EF8574]" />
                    ) : s.done ? (
                      <Check className="h-3 w-3 text-[#57C27A]" />
                    ) : (
                      <Clock className="h-3 w-3 text-[#FDE68A]" />
                    )}
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-end justify-between border-t border-zinc-100 pt-4">
            <div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-300">Valor</div>
              <div className="text-base font-bold text-zinc-900">{formatBRL(proposta.valor)}</div>
            </div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-300">
              {new Date(proposta.data_criacao).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        <div
          className={`flex items-center justify-between border-t px-5 py-3 text-[10px] font-bold uppercase tracking-widest sm:px-6 ${colors.footer}`}
        >
          <span>{status.primaryLabel}</span>
          <ChevronRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </motion.div>
  );
}
