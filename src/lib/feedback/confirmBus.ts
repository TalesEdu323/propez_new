export type ConfirmVariant = 'primary' | 'danger';

export interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (value: boolean) => void;
}

type ConfirmListener = (request: PendingConfirm | null) => void;

const listeners = new Set<ConfirmListener>();
let pending: PendingConfirm | null = null;

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn(pending);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeConfirm(listener: ConfirmListener): () => void {
  listeners.add(listener);
  listener(pending);
  return () => listeners.delete(listener);
}

export function confirmAction(request: ConfirmRequest): Promise<boolean> {
  if (pending) {
    pending.resolve(false);
    pending = null;
  }
  return new Promise<boolean>((resolve) => {
    pending = { ...request, resolve };
    notify();
  });
}

export function resolveConfirm(confirmed: boolean): void {
  if (!pending) return;
  const { resolve } = pending;
  pending = null;
  notify();
  resolve(confirmed);
}

export function getPendingConfirm(): PendingConfirm | null {
  return pending;
}
