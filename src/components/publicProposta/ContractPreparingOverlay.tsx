import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { PropezLogo } from '../PropezLogo';

export type ContractPrepareOverlayState = 'preparing' | 'redirecting' | 'error';

const ROTATING_MESSAGES = [
  'Estamos preparando seu contrato…',
  'Gerando documento para assinatura…',
  'Quase lá — só mais um instante…',
];

interface Props {
  state: ContractPrepareOverlayState;
  errorMessage?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ContractPreparingOverlay({ state, errorMessage, onRetry, retrying }: Props) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (state !== 'preparing') return;
    const id = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % ROTATING_MESSAGES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [state]);

  const subtitle =
    state === 'redirecting'
      ? 'Redirecionando para assinatura…'
      : ROTATING_MESSAGES[msgIndex];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-6"
      role="status"
      aria-live="polite"
      aria-busy={state !== 'error'}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center"
      >
        {state === 'error' ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Não foi possível preparar o contrato</h2>
            <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
              {errorMessage ?? 'Tente novamente em instantes ou entre em contato com quem enviou a proposta.'}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800 disabled:opacity-50"
              >
                {retrying ? 'Tentando novamente…' : 'Tentar novamente'}
              </button>
            )}
          </>
        ) : (
          <>
            <div className="relative mx-auto mb-6 flex justify-center">
              <PropezLogo height="sm" className="justify-center" />
              <Loader2 className="absolute -bottom-1 -right-1 w-7 h-7 text-zinc-900 animate-spin bg-white rounded-full p-0.5" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Proposta aprovada
            </div>

            <h2 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">PropEZ</h2>

            <AnimatePresence mode="wait">
              <motion.p
                key={subtitle}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-sm text-zinc-500 min-h-[2.5rem] flex items-center justify-center"
              >
                {subtitle}
              </motion.p>
            </AnimatePresence>

            <div className="mt-6 h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
                style={{ width: '40%' }}
              />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
