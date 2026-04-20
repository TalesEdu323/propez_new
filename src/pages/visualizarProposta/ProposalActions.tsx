import { motion } from 'motion/react';
import { CheckCircle, DollarSign, X } from 'lucide-react';
import type { Proposta } from '../../lib/store';
import { formatBRL } from '../../lib/format';

export interface ProposalActionsProps {
  proposta: Proposta;
  isUpdating: boolean;
  onApprove: () => void;
  onReject: () => void;
  onViewContract: () => void;
}

/**
 * Painel inferior com valor total da proposta, badges de forma de pagamento
 * e botões de aprovar/recusar ou estado final (aprovada/recusada).
 */
export function ProposalActions({ proposta, isUpdating, onApprove, onReject, onViewContract }: ProposalActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="max-w-3xl mx-auto mt-12 p-10 md:p-16 apple-card text-center"
    >
      <div className="mb-12 inline-flex flex-col items-center">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-3">Investimento Total</span>
        <div className="text-5xl md:text-6xl font-bold text-zinc-900 tracking-tight">
          {formatBRL(proposta.valor)}
        </div>
        {(proposta.chavePix || proposta.linkPagamento) && (
          <div className="flex gap-3 mt-6">
            {proposta.chavePix && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900 text-white rounded-full text-[9px] font-bold uppercase tracking-[0.15em] shadow-lg shadow-black/10">
                <CheckCircle className="w-3 h-3" /> PIX
              </div>
            )}
            {proposta.linkPagamento && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-100 text-zinc-500 rounded-full text-[9px] font-bold uppercase tracking-[0.15em] border border-black/[0.03]">
                <DollarSign className="w-3 h-3" /> Cartão
              </div>
            )}
          </div>
        )}
      </div>

      <h2 className="text-3xl font-bold text-zinc-900 mb-10 tracking-tight">O que achou da proposta?</h2>

      {proposta.status === 'pendente' ? (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onReject}
            disabled={isUpdating}
            className="w-full sm:w-auto h-14 px-10 bg-zinc-50 text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50 border border-black/[0.03]"
          >
            {isUpdating ? 'Processando...' : 'Recusar'}
          </button>
          <button
            onClick={onApprove}
            disabled={isUpdating}
            className="w-full sm:w-auto h-14 px-10 bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-zinc-800 transition-all shadow-xl shadow-black/10 disabled:opacity-50"
          >
            {isUpdating ? 'Processando...' : 'Aprovar e Continuar'}
          </button>
        </div>
      ) : proposta.status === 'aprovada' ? (
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-6 border border-emerald-100"
          >
            <CheckCircle className="w-10 h-10" />
          </motion.div>
          <p className="text-zinc-900 font-bold text-2xl mb-8 tracking-tight">Proposta aprovada!</p>
          <button onClick={onViewContract} className="btn-primary">
            Ver Contrato e Pagamento
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mb-6 border border-red-100"
          >
            <X className="w-10 h-10" />
          </motion.div>
          <p className="text-red-600 font-bold text-2xl tracking-tight">Proposta recusada.</p>
        </div>
      )}
    </motion.div>
  );
}
