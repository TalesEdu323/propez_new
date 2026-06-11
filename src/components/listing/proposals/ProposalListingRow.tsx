import { motion } from 'motion/react';
import { Check, ChevronRight, Clock, Copy, Trash2, X } from 'lucide-react';
import type { Proposta } from '../../../lib/store';
import { formatBRL } from '../../../lib/format';
import { getFlowStepLabels, getProposalListingStatus } from '../../../lib/proposalSubStatus';
import { getListingStatusColors } from '../listingLayout';

interface ProposalListingRowProps {
  proposta: Proposta;
  servicosLabel: string;
  onOpen: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function ProposalListingRow({
  proposta,
  servicosLabel,
  onOpen,
  onDelete,
  onDuplicate,
}: ProposalListingRowProps) {
  const status = getProposalListingStatus(proposta);
  const colors = getListingStatusColors(status.tone);
  const steps = getFlowStepLabels(proposta);
  const hasActions = onDelete || onDuplicate;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(proposta.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(proposta.id);
        }
      }}
      className="group flex cursor-pointer items-stretch overflow-hidden rounded-xl border border-zinc-100 bg-white transition-all hover:border-zinc-200 hover:shadow-md"
    >
      <div className={`w-1 shrink-0 ${colors.bar}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-zinc-900">{proposta.cliente_nome}</div>
          <div className="truncate text-xs text-zinc-400">{servicosLabel}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {status.secondaryLabels.map((label) => (
              <span
                key={label}
                className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase ${colors.badge}`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          {steps.map((s) => (
            <span key={s.step} className="flex items-center gap-1 text-[9px] text-zinc-400">
              {proposta.status === 'recusada' ? (
                <X className="h-3.5 w-3.5" />
              ) : s.done ? (
                <Check className="h-3.5 w-3.5 text-[#57C27A]" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-amber-400" />
              )}
              {s.label}
            </span>
          ))}
        </div>

        <div className="w-28 shrink-0">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
            <div className={`h-full ${colors.progress}`} style={{ width: `${status.progressPercent}%` }} />
          </div>
        </div>

        <div className="shrink-0 text-right font-bold text-zinc-900">{formatBRL(proposta.valor)}</div>

        <div
          className={`shrink-0 rounded-lg px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider ${colors.footer}`}
        >
          {status.primaryLabel}
        </div>

        <ChevronRight className="hidden h-4 w-4 shrink-0 text-zinc-300 group-hover:text-zinc-600 sm:block" />
      </div>

      {hasActions && (
        <div className="flex shrink-0 items-center gap-1 self-center pr-2">
          {onDuplicate && (
            <button
              type="button"
              className="p-3 text-zinc-400 hover:text-zinc-900"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(proposta.id);
              }}
              title="Duplicar"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="p-3 text-zinc-300 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(proposta.id);
              }}
              title="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
