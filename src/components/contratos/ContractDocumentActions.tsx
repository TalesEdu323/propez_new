import { Copy, Download, ExternalLink, FileText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import {
  buildOriginalContractDownloadUrl,
  buildSignedContractDownloadUrl,
  buildValidityPageUrl,
} from '../../services/contractSignApi';

export interface ContractDocumentActionsProps {
  proposalId: string;
  signStatus: string | null | undefined;
  documentId?: string | null;
  validationUrl?: string | null;
  validationToken?: string | null;
  originalPdfUrl?: string | null;
  signedPdfUrl?: string | null;
  variant?: 'compact' | 'buttons';
}

export function ContractDocumentActions({
  proposalId,
  signStatus,
  documentId,
  validationUrl,
  validationToken,
  originalPdfUrl,
  signedPdfUrl,
  variant = 'buttons',
}: ContractDocumentActionsProps) {
  const [copied, setCopied] = useState(false);
  const originalUrl = originalPdfUrl ?? buildOriginalContractDownloadUrl(proposalId);
  const signedUrl = signedPdfUrl ?? buildSignedContractDownloadUrl(proposalId);
  const validateHref =
    validationUrl ?? (documentId ? buildValidityPageUrl(documentId, validationToken) : null);
  const showOriginal = signStatus === 'sent' || signStatus === 'signed';
  const showSigned = signStatus === 'signed';

  if (!showOriginal && !showSigned) return null;

  const copyValidation = async () => {
    if (!validateHref) return;
    const full = validateHref.startsWith('http') ? validateHref : `${window.location.origin}${validateHref}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const linkClass =
    variant === 'compact'
      ? 'inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-800'
      : 'h-12 px-8 inline-flex items-center bg-white border border-black/[0.05] text-zinc-900 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all shadow-sm';

  const primaryClass =
    variant === 'compact'
      ? linkClass
      : 'h-12 px-8 inline-flex items-center bg-zinc-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-xl shadow-black/10';

  return (
    <div className={`flex gap-3 flex-wrap ${variant === 'buttons' ? 'justify-center' : 'flex-col'}`}>
      {showOriginal && (
        <a href={originalUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          <FileText className="w-4 h-4" /> Ver contrato enviado
        </a>
      )}
      {showOriginal && (
        <a href={originalUrl} download className={linkClass}>
          <Download className="w-4 h-4" /> Baixar original
        </a>
      )}
      {showSigned && (
        <a href={signedUrl} target="_blank" rel="noopener noreferrer" className={primaryClass}>
          <FileText className="w-4 h-4 inline-block mr-2" /> Ver contrato assinado
        </a>
      )}
      {showSigned && (
        <a href={signedUrl} download className={linkClass}>
          <Download className="w-4 h-4 inline-block mr-2" /> Baixar PDF assinado
        </a>
      )}
      {validateHref && (showOriginal || showSigned) && (
        <>
          <a href={validateHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <ShieldCheck className="w-4 h-4 inline-block mr-2" /> Validar documento
          </a>
          <button type="button" onClick={() => void copyValidation()} className={linkClass}>
            <Copy className="w-4 h-4 inline-block mr-2" />
            {copied ? 'Link copiado!' : 'Copiar link de validação'}
          </button>
        </>
      )}
      {showSigned && variant === 'compact' && validateHref && (
        <a href={validateHref} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-zinc-800 inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Abrir página de validade
        </a>
      )}
    </div>
  );
}
