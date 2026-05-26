import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface Props {
  orgName: string;
  visible: boolean;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}

function useIsNarrowViewport() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return narrow;
}

/**
 * Painel de decisão estilo barra de cookies: sobe pela base no mobile;
 * no desktop, desliza pela direita como drawer lateral.
 */
export function ProposalDecisionDock({ orgName, visible, onApprove, onReject, disabled }: Props) {
  const narrow = useIsNarrowViewport();

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 pointer-events-none"
            aria-hidden
          />

          <motion.aside
            role="dialog"
            aria-labelledby="proposal-decision-title"
            aria-describedby="proposal-decision-desc"
            initial={narrow ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={narrow ? { y: '100%', opacity: 0.9 } : { x: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            className={
              narrow
                ? 'fixed z-50 inset-x-0 bottom-0 pointer-events-auto'
                : 'fixed z-50 right-0 top-0 bottom-0 w-full max-w-[400px] pointer-events-auto flex items-center p-4'
            }
          >
            <div
              className={
                narrow
                  ? 'w-full bg-white border-t border-black/[0.08] shadow-[0_-12px_48px_rgba(0,0,0,0.15)] rounded-t-[1.75rem] overflow-hidden'
                  : 'w-full bg-white border border-black/[0.08] rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.18)] overflow-hidden'
              }
            >
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-zinc-100 to-red-500" />

              <div className="p-5 sm:p-6">
                <p id="proposal-decision-title" className="text-base font-bold text-zinc-900 tracking-tight">
                  Sua decisão
                </p>
                <p id="proposal-decision-desc" className="text-sm text-zinc-500 mt-2 leading-relaxed">
                  Proposta enviada por{' '}
                  <span className="font-semibold text-zinc-800">{orgName}</span>.
                  {' '}Revise o conteúdo e escolha como responder.
                </p>

                <div className={`mt-5 flex gap-3 ${narrow ? 'flex-col' : 'flex-col'}`}>
                  <button
                    type="button"
                    onClick={onApprove}
                    disabled={disabled}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    Aprovar proposta
                  </button>
                  <button
                    type="button"
                    onClick={onReject}
                    disabled={disabled}
                    className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-5 h-5 shrink-0" />
                    Recusar
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
