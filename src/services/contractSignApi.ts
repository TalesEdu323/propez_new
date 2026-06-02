/**
 * API de assinatura nativa de contratos (PropEZ).
 */

export type ContractSignStatus = 'pending' | 'sent' | 'signed' | 'cancelled' | 'failed';

export interface ContractSignStatusResponse {
  proposalId: string;
  status: ContractSignStatus;
  documentId?: string | null;
  signingUrl?: string | null;
  signedPdfUrl?: string | null;
}

export async function getContractSignStatus(proposalId: string): Promise<ContractSignStatusResponse | null> {
  try {
    const res = await fetch(`/api/propostas/${encodeURIComponent(proposalId)}/contract-status`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return null;
    return (await res.json()) as ContractSignStatusResponse;
  } catch {
    return null;
  }
}

export function buildSignedContractDownloadUrl(proposalId: string): string {
  return `/api/propostas/${encodeURIComponent(proposalId)}/contract-signed.pdf`;
}

export function buildValidityPageUrl(documentId: string, validationToken?: string | null): string {
  const q = validationToken ? `?token=${encodeURIComponent(validationToken)}` : '';
  return `/validar/${encodeURIComponent(documentId)}${q}`;
}
