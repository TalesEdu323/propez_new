export type ToastVariant = 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

type ToastListener = (toast: ToastItem) => void;

const listeners = new Set<ToastListener>();
let idCounter = 0;

function emit(message: string, variant: ToastVariant, durationMs = 3000): void {
  const toast: ToastItem = {
    id: `toast-${++idCounter}`,
    message,
    variant,
    durationMs,
  };
  listeners.forEach((fn) => {
    try {
      fn(toast);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const toast = {
  success: (message: string, durationMs?: number) => emit(message, 'success', durationMs),
  warning: (message: string, durationMs?: number) => emit(message, 'warning', durationMs),
  error: (message: string, durationMs?: number) => emit(message, 'error', durationMs ?? 5000),
};
