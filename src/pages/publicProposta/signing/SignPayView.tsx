import { useState } from 'react';
import { Copy, CreditCard, Loader2 } from 'lucide-react';
import { formatBRL } from '../../../lib/format';
import { SignWizardWrapper } from './SignWizardWrapper';
import type { OrgBrand } from './signTypes';

interface Props {
  valorCents: number | null;
  chavePix: string | null;
  linkPagamento: string | null;
  org?: OrgBrand | null;
  onBack: () => void;
  onComplete: () => Promise<void>;
}

export function SignPayView({ valorCents, chavePix, linkPagamento, org, onBack, onComplete }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valor = valorCents != null ? valorCents / 100 : 0;

  const copyPix = () => {
    if (chavePix) void navigator.clipboard.writeText(chavePix);
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setError(null);
    try {
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

        <button
          type="button"
          onClick={handleComplete}
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Concluí pagamento'}
        </button>
      </div>
    </SignWizardWrapper>
  );
}
