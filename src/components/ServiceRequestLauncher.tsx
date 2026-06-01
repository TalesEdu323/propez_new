import { useCallback, useEffect, useState } from 'react';
import { Modal } from './ui/Modal';
import { ExternalFormModal } from './ExternalFormModal';
import { WhitelabelRequestForm } from './requests/WhitelabelRequestForm';
import { EnterpriseRequestForm } from './requests/EnterpriseRequestForm';
import {
  fetchRequestConfig,
  type RequestFlowConfig,
  type ServiceRequestType,
} from '../lib/requestConfig';
import { WHATSAPP_URL } from '../marketing/constants';

const TITLES: Record<ServiceRequestType, string> = {
  whitelabel: 'Solicitar identidade visual',
  enterprise: 'Plano Business / Enterprise',
};

interface ServiceRequestLauncherProps {
  type: ServiceRequestType;
  /** Se true, exige login para formulário nativo (landing pública). */
  requireAuthForNative?: boolean;
  onNeedLogin?: () => void;
  children: (props: { open: () => void; loading: boolean }) => React.ReactNode;
}

export function ServiceRequestLauncher({
  type,
  requireAuthForNative = false,
  onNeedLogin,
  children,
}: ServiceRequestLauncherProps) {
  const [loading, setLoading] = useState(false);
  const [flow, setFlow] = useState<RequestFlowConfig | null>(null);
  const [nativeOpen, setNativeOpen] = useState(false);
  const [externalOpen, setExternalOpen] = useState(false);
  const [fallbackOpen, setFallbackOpen] = useState(false);

  const loadFlow = useCallback(async () => {
    setLoading(true);
    try {
      const configs = await fetchRequestConfig();
      setFlow(configs[type]);
    } catch {
      setFlow({ mode: 'native', externalUrl: null });
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void loadFlow();
  }, [loadFlow]);

  const open = () => {
    if (!flow) return;
    if (flow.mode === 'external' && flow.externalUrl) {
      setExternalOpen(true);
      return;
    }
    if (flow.mode === 'external' && !flow.externalUrl) {
      setFallbackOpen(true);
      return;
    }
    if (requireAuthForNative && onNeedLogin) {
      onNeedLogin();
      return;
    }
    setNativeOpen(true);
  };

  return (
    <>
      {children({ open, loading })}

      <Modal
        open={nativeOpen}
        onClose={() => setNativeOpen(false)}
        title={TITLES[type]}
        size="md"
      >
        {type === 'whitelabel' ? (
          <WhitelabelRequestForm
            onSuccess={() => setNativeOpen(false)}
            onCancel={() => setNativeOpen(false)}
          />
        ) : (
          <EnterpriseRequestForm
            onSuccess={() => setNativeOpen(false)}
            onCancel={() => setNativeOpen(false)}
          />
        )}
      </Modal>

      {flow?.externalUrl && (
        <ExternalFormModal
          open={externalOpen}
          onClose={() => setExternalOpen(false)}
          url={flow.externalUrl}
          title={TITLES[type]}
        />
      )}

      <Modal
        open={fallbackOpen}
        onClose={() => setFallbackOpen(false)}
        title={TITLES[type]}
        size="sm"
      >
        <p className="text-sm text-zinc-600 mb-4">
          O formulário externo ainda não foi configurado. Fale conosco pelo WhatsApp.
        </p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex"
        >
          Abrir WhatsApp
        </a>
      </Modal>
    </>
  );
}
