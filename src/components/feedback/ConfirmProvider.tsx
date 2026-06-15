import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  resolveConfirm,
  subscribeConfirm,
  type ConfirmRequest,
} from '../../lib/feedback/confirmBus';

type ActiveConfirm = ConfirmRequest & { open: boolean };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveConfirm | null>(null);

  useEffect(() => {
    return subscribeConfirm((pending) => {
      if (!pending) {
        setActive(null);
        return;
      }
      setActive({
        open: true,
        title: pending.title,
        description: pending.description,
        confirmLabel: pending.confirmLabel,
        cancelLabel: pending.cancelLabel,
        variant: pending.variant,
      });
    });
  }, []);

  const handleClose = (confirmed: boolean) => {
    setActive(null);
    resolveConfirm(confirmed);
  };

  return (
    <>
      {children}
      <Modal
        open={Boolean(active?.open)}
        onClose={() => handleClose(false)}
        title={active?.title}
        description={active?.description}
        size="sm"
        closeOnBackdropClick={false}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => handleClose(false)}>
              {active?.cancelLabel ?? 'Cancelar'}
            </Button>
            <Button
              variant={active?.variant === 'danger' ? 'danger' : 'primary'}
              size="md"
              onClick={() => handleClose(true)}
            >
              {active?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <span className="sr-only">Confirmação</span>
      </Modal>
    </>
  );
}
