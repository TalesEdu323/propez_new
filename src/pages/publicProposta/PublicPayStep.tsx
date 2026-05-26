import { Copy, CreditCard } from 'lucide-react';
import { formatBRL } from '../../lib/format';

interface Props {
  valor: number;
  chavePix?: string | null;
  linkPagamento?: string | null;
}

export function PublicPayStep({ valor, chavePix, linkPagamento }: Props) {
  const copyPix = () => {
    if (!chavePix) return;
    void navigator.clipboard.writeText(chavePix);
  };

  return (
    <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-white border border-black/5 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-8 h-8 text-zinc-900" />
        <h3 className="text-2xl font-bold text-zinc-900">Pagamento</h3>
      </div>
      <p className="text-zinc-500 mb-4">Valor acordado:</p>
      <p className="text-4xl font-black text-zinc-900 mb-8">{formatBRL(valor)}</p>

      {chavePix && (
        <div className="mb-6 p-4 rounded-2xl bg-zinc-50 border border-black/5">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Chave PIX</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm break-all text-zinc-800">{chavePix}</code>
            <button type="button" onClick={copyPix} className="p-2 rounded-lg hover:bg-zinc-200" aria-label="Copiar PIX">
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
          className="btn-primary w-full justify-center"
        >
          Pagar online
        </a>
      )}

      {!chavePix && !linkPagamento && (
        <p className="text-sm text-zinc-500">O responsável enviará as instruções de pagamento em breve.</p>
      )}
    </div>
  );
}
