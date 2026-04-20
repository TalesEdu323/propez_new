import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

export interface ProposalHeaderProps {
  clienteNome: string;
  onBack: () => void;
}

/**
 * Barra superior fixa da página de visualização de proposta.
 * Visível para o usuário interno (não para o cliente final quando em modo preview).
 */
export function ProposalHeader({ clienteNome, onBack }: ProposalHeaderProps) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 h-20 border-b border-black/[0.03] flex items-center px-8 z-50 bg-white/70 backdrop-blur-2xl"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-all font-bold text-[10px] uppercase tracking-[0.2em]"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>
      <div className="ml-auto text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
        Visualizando Proposta: <span className="text-zinc-900">{clienteNome}</span>
      </div>
    </motion.div>
  );
}
