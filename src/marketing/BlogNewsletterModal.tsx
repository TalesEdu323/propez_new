import { useCallback, useEffect, useState } from 'react';
import { Modal } from '../components/ui/Modal';
import { NewsletterSignupForm } from './NewsletterSignup';

const OPEN_DELAY_MS = 2500;

export function BlogNewsletterModal() {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetch('/api/newsletter/modal-status', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { show: false }))
        .then((data: { show?: boolean }) => {
          if (cancelled) return;
          setChecked(true);
          if (data.show) setOpen(true);
        })
        .catch(() => {
          if (!cancelled) setChecked(true);
        });
    }, OPEN_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    void fetch('/api/newsletter/modal-dismiss', { method: 'POST', credentials: 'include' });
  }, []);

  if (!checked && !open) return null;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      size="sm"
      title="Receba artigos sobre propostas comerciais"
      description="Conteúdo prático para melhorar suas propostas e seu processo comercial."
    >
      <NewsletterSignupForm
        onSuccess={() => {
          setOpen(false);
        }}
      />
    </Modal>
  );
}
