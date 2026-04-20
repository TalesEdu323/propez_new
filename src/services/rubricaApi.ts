/**
 * Rubrica Integration Service — Assinatura de contratos.
 *
 * Chama `/api/integrations/rubrica/*` no backend do PropEZ. O backend gera o
 * PDF, faz upload no Rubrica e dispara o envio para assinatura. A chave de
 * API do Rubrica fica apenas no servidor.
 */

export interface ContractPayload {
  proposalId: string
  clientName: string
  clientEmail: string
  clientPhone?: string
  clientDocument?: string
  contractText: string
  contractTitle?: string
  companyName?: string
  companyCnpj?: string
  value: number
  location?: string
  prosyncLeadId?: string
}

export interface SendResult {
  success: boolean
  signingUrl?: string
  documentId?: string
  error?: string
}

export interface RubricaStatus {
  proposalId: string
  status: 'pending' | 'sent' | 'signed' | 'cancelled' | 'failed'
  documentId?: string | null
  signingUrl?: string | null
  signedPdfUrl?: string | null
  live?: Record<string, unknown>
  liveError?: string
}

export async function sendToRubricaForSigning(payload: ContractPayload): Promise<SendResult> {
  try {
    const res = await fetch('/api/integrations/rubrica/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await res.json().catch(() => ({}))) as {
      signingUrl?: string
      documentId?: string
      error?: string
    }
    if (!res.ok) {
      return { success: false, error: data?.error || `HTTP ${res.status}` }
    }
    return { success: true, signingUrl: data.signingUrl, documentId: data.documentId }
  } catch (error) {
    console.error('[Rubrica] Erro ao enviar contrato:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function getRubricaStatus(proposalId: string): Promise<RubricaStatus | null> {
  try {
    const res = await fetch(
      `/api/integrations/rubrica/status/${encodeURIComponent(proposalId)}`,
      { method: 'GET' },
    )
    if (!res.ok) return null
    return (await res.json()) as RubricaStatus
  } catch (error) {
    console.error('[Rubrica] Erro ao consultar status:', error)
    return null
  }
}

export function buildRubricaDownloadUrl(proposalId: string): string {
  return `/api/integrations/rubrica/download/${encodeURIComponent(proposalId)}`
}
