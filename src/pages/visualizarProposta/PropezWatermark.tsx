import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

/**
 * Marca d'água exibida no rodapé do link público quando a proposta foi criada
 * por um usuário do plano Free. Serve como canal viral: todo cliente que
 * recebe uma proposta vê o badge e pode descobrir o Propez.
 *
 * O link de CTA usa `window.location.origin` para permanecer relativo ao host
 * atual (funciona em ambiente self-host, staging e produção).
 */
export function PropezWatermark() {
  const ctaUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?route=planos&utm_source=watermark`
    : '#';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="max-w-3xl mx-auto mt-10 flex justify-center"
    >
      <a
        href={ctaUrl}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-2 px-5 py-3 rounded-full bg-white border border-black/5 shadow-sm hover:shadow-md transition-all"
      >
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-zinc-500 group-hover:text-zinc-900 transition-colors">
          Feito com <span className="font-bold text-zinc-900">Propez</span>
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500 group-hover:translate-x-0.5 transition-all">
          Crie a sua →
        </span>
      </a>
    </motion.div>
  );
}
