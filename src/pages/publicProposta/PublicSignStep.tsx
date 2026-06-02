import { FileCheck, FileText, Loader2, AlertCircle, PenLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildPublicSignedContractPdfUrl } from '../../lib/publicProposalUrls';
import { getContractSignPhase } from '../../types/proposalFlow';
import type { ProposalFlowConfig } from '../../types/proposalFlow';

interface PropostaSignFields {
  contractSignStatus?: string | null;
  rubricaStatus?: string | null;
  contractSigningUrl?: string | null;
  rubricaSigningUrl?: string | null;
  publicToken?: string | null;
  clienteContratoRecebidoAt?: string | null;
  contratoConcluidoAt?: string | null;
  orgContratoAceitoAt?: string | null;
}

interface Props {
  proposta: PropostaSignFields;
  fluxo?: ProposalFlowConfig;
  orgName: string;
  publicToken: string;
  onConfirmReceipt: () => void;
  onRetrySignature?: () => void;
  confirming?: boolean;
  retrying?: boolean;
}

function resolveStatus(p: PropostaSignFields): string | null | undefined {
  return p.contractSignStatus ?? p.rubricaStatus;
}

function resolveSigningUrl(p: PropostaSignFields, publicToken: string): string | null {
  const url = p.contractSigningUrl ?? p.rubricaSigningUrl;
  if (!url) return null;
  try {
    if (url.startsWith('http')) {
      const u = new URL(url);
      return u.pathname + u.search;
    }
  } catch {
    /* relative */
  }
  if (url.startsWith('/')) return url;
  return `/p/${publicToken}/assinar/${url}`;
}

function SignedContractDownload({ publicToken }: { publicToken: string }) {
  const pdfUrl = buildPublicSignedContractPdfUrl(publicToken);
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-zinc-200 text-zinc-900 font-semibold text-sm hover:bg-zinc-50"
      >
        <FileText className="w-4 h-4" /> Ver contrato assinado
      </a>
      <a
        href={pdfUrl}
        download
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 text-white font-semibold text-sm hover:bg-zinc-800"
      >
        <FileText className="w-4 h-4" /> Baixar PDF
      </a>
    </div>
  );
}

export function PublicSignStep({ proposta, orgName, publicToken, onConfirmReceipt, onRetrySignature, confirming, retrying }: Props) {
  const phase = getContractSignPhase({
    contractSignStatus: resolveStatus(proposta),
    rubricaStatus: resolveStatus(proposta),
    clienteContratoRecebidoAt: proposta.clienteContratoRecebidoAt,
    orgContratoAceitoAt: proposta.orgContratoAceitoAt,
    contratoConcluidoAt: proposta.contratoConcluidoAt,
  });
  const signingPath = resolveSigningUrl(proposta, publicToken);
  const status = resolveStatus(proposta);

  if (phase === 'complete') {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-emerald-50 border border-emerald-100 text-center">
        <FileCheck className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-emerald-900">Contrato concluído</h3>
        <p className="text-emerald-700 mt-2 text-sm mb-1">Assinado com Rubrica · Powered by Taggo</p>
        {status === 'signed' && <SignedContractDownload publicToken={publicToken} />}
      </div>
    );
  }

  if (phase === 'awaiting_org_accept') {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-amber-50 border border-amber-100 text-center">
        <Loader2 className="w-10 h-10 text-amber-600 mx-auto mb-4 animate-spin" />
        <h3 className="text-xl font-bold text-amber-900">Recebimento confirmado</h3>
        <p className="text-amber-800 mt-2 text-sm">
          Aguardando confirmação de <strong>{orgName}</strong> para concluir o contrato.
        </p>
      </div>
    );
  }

  if (phase === 'awaiting_client_receipt') {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-white border border-black/5 shadow-lg text-center">
        <FileCheck className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-900">Assinatura registrada</h3>
        <p className="text-zinc-500 mt-2 text-sm mb-2">Assinado com Rubrica · Powered by Taggo</p>
        <SignedContractDownload publicToken={publicToken} />
        <button type="button" onClick={onConfirmReceipt} disabled={confirming} className="btn-primary">
          {confirming ? 'Confirmando...' : 'Confirmar recebimento'}
        </button>
      </div>
    );
  }

  if (status === 'failed' || status === 'cancelled') {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-red-50 border border-red-100 text-center">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-900">Assinatura indisponível</h3>
        <p className="text-red-700 mt-2 text-sm">
          Não foi possível preparar o contrato para assinatura. Entre em contato com {orgName}.
        </p>
        {onRetrySignature && (
          <button
            type="button"
            onClick={onRetrySignature}
            disabled={retrying}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-900 text-white font-semibold text-sm hover:bg-red-800 disabled:opacity-60"
          >
            {retrying ? 'Tentando novamente…' : 'Tentar novamente'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto my-12 p-8 rounded-3xl bg-zinc-900 text-white text-center">
      <h3 className="text-xl font-bold mb-2">Assinar contrato</h3>
      <p className="text-zinc-400 text-sm mb-2">
        Assinatura digital via Rubrica · Powered by Taggo
      </p>
      <p className="text-zinc-500 text-xs mb-6">
        {orgName} já assinou. Falta sua assinatura na tela ou pelo e-mail enviado.
      </p>
      {signingPath ? (
        <Link
          to={signingPath.startsWith('/') ? signingPath : `/p/${publicToken}/assinar/${signingPath}`}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-zinc-900 font-bold hover:bg-zinc-100"
        >
          <PenLine className="w-4 h-4" /> Assinar agora
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-300" />
          <p className="text-amber-300 text-sm">Preparando assinatura…</p>
        </div>
      )}
    </div>
  );
}
