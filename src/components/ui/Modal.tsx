import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdropClick?: boolean;
}

const SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnBackdropClick = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => closeOnBackdropClick && onClose()}
        >
          <motion.div
            className={`w-full ${SIZE[size]} bg-white border border-black/[0.04] shadow-2xl shadow-black/10 rounded-t-3xl sm:rounded-3xl p-0 flex flex-col max-h-[92dvh] sm:max-h-[88dvh] overflow-hidden`}
            initial={{ opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            {(title || description) && (
              <div className="shrink-0 flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-black/[0.04]">
                <div>
                  {title ? <h3 className="text-lg sm:text-xl font-semibold text-zinc-900 tracking-tight">{title}</h3> : null}
                  {description ? <p className="text-sm text-zinc-500 mt-1">{description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 p-2 -m-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 sm:p-6">{children}</div>
            {footer ? (
              <div className="shrink-0 p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-black/[0.04] flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
