import { Modal } from './ui/Modal';

interface ExternalFormModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export function ExternalFormModal({ open, onClose, url, title }: ExternalFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="xl" closeOnBackdropClick>
      <iframe
        src={url}
        title={title}
        className="w-full h-[70vh] border-0 rounded-xl bg-white"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
        referrerPolicy="no-referrer"
      />
    </Modal>
  );
}
