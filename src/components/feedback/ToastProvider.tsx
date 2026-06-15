import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';
import { subscribeToasts, type ToastItem, type ToastVariant } from '../../lib/feedback/toastBus';

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; icon: ReactNode }
> = {
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-950',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-950',
    icon: <XCircle className="w-5 h-5 text-red-600 shrink-0" />,
  },
};

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const style = VARIANT_STYLES[item.variant];

  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(item.id), item.durationMs);
    return () => window.clearTimeout(t);
  }, [item.id, item.durationMs, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg shadow-black/5 max-w-sm w-full pointer-events-auto ${style.container}`}
      role="status"
    >
      {style.icon}
      <p className="text-sm font-medium leading-snug flex-1">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="p-1 -m-1 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((prev) => [...prev.slice(-4), toast]);
    });
  }, []);

  return (
    <>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
