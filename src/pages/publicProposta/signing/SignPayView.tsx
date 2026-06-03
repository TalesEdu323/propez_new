import { useState } from 'react';
import { Copy, CreditCard, Loader2, MessageCircle } from 'lucide-react';
import { formatBRL } from '../../../lib/format';
import { buildComprovanteWhatsAppMessage, buildWhatsAppUrl } from '../../../lib/whatsappShare';
import { PropezLogo } from '../../../components/PropezLogo';
import { SignWizardWrapper } from './SignWizardWrapper';
import type { OrgBrand } from './signTypes';

interface Props {
  valorCents: number | null;
  chavePix: string | null;
  linkPagamento: string | null;
  whatsappComprovante?: string | null;
  proposalTitle?: string | null;
  org?: OrgBrand | null;
  onBack: () => void;
  onComplete: () => Promise<void>;
}

export function SignPayView({
  valorCents,
  chavePix,
  linkPagamento,
  whatsappComprovante,
  proposalTitle,
  org,
  onBack,
  onComplete,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noWhatsappHint, setNoWhatsappHint] = useState(false);
  const valor = valorCents != null ? valorCents / 100 : 0;
  const hasWhatsapp = Boolean(whatsappComprovante?.trim());

  const copyPix = () => {
    if (chavePix) void navigator.clipboard.writeText(chavePix);
  };

  const handleMarkPaid = async () => {
    setSubmitting(true);
    setError(null);
    setNoWhatsappHint(false);
    try {
      if (hasWhatsapp) {
        const message = buildComprovanteWhatsAppMessage({
          title: proposalTitle ?? undefined,
          valorLabel: formatBRL(valor),
        });
        const url = buildWhatsAppUrl(whatsappComprovante!.trim(), message);
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setNoWhatsappHint(true);
      }
      await onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao confirmar pagamento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SignWizardWrapper
      title="Pagamento"
      subtitle="Efetue o pagamento acordado na proposta para concluir."
      backAction={onBack}
      org={org}
    >
      <div className="p-8 space-y-6">
        <div className="flex justify-center pb-4 border-b border-gray-100">
          <PropezLogo height="md" />
        </div>

        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-gray-700" />
          <div>
            <p className="text-sm text-gray-500">Valor acordado</p>
            <p className="text-3xl font-black text-gray-900">{formatBRL(valor)}</p>
          </div>
        </div>

        {chavePix && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Chave PIX</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm break-all text-gray-800">{chavePix}</code>
              <button type="button" onClick={copyPix} className="p-2 rounded-lg hover:bg-gray-200" aria-label="Copiar PIX">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {linkPagamento && (
          <a
            href={linkPagamento}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-[#1877F2] hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all"
          >
            Pagar online
          </a>
        )}

        {!chavePix && !linkPagamento && (
          <p className="text-sm text-gray-500 text-center">O responsável enviará as instruções de pagamento em breve.</p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {noWhatsappHint && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            Pagamento registrado. Envie o comprovante ao vendedor pelos canais informados.
          </p>
        )}

        <button
          type="button"
          onClick={handleMarkPaid}
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <MessageCircle className="w-5 h-5" />
              Marcar como pago
            </>
          )}
        </button>

        {hasWhatsapp && (
          <p className="text-xs text-gray-500 text-center">
            Ao marcar como pago, abriremos o WhatsApp para você enviar o comprovante.
          </p>
        )}
      </div>
    </SignWizardWrapper>
  );
}
