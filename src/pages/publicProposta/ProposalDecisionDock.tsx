import { CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  orgName: string;
  visible: boolean;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export function ProposalDecisionDock({ orgName, visible, onApprove, onReject, disabled }: Props) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none"
    >
      <div className="max-w-lg mx-auto pointer-events-auto glass-panel border border-black/5 rounded-2xl p-4 shadow-2xl">
        <p className="text-center text-xs text-zinc-500 mb-3">
          Proposta enviada por <span className="font-semibold text-zinc-800">{orgName}</span>
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onApprove}
            disabled={disabled}
            className="btn-primary w-full justify-center"
          >
            <CheckCircle2 className="w-4 h-4" /> Aprovar proposta
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={disabled}
            className="w-full px-6 py-3 rounded-2xl font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 justify-center"
          >
            <XCircle className="w-4 h-4" /> Recusar
          </button>
        </div>
      </div>
    </motion.div>
  );
}
