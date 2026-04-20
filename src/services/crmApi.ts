/**
 * CRM Integration Service — ProSync
 *
 * Chama o **próprio backend** do Propez (`/api/integrations/prosync/*`), que
 * por sua vez fala com a API do ProSync usando a `PROSYNC_API_KEY`.
 * Nenhuma chave de API fica exposta no bundle do frontend.
 */

export interface ExternalClient {
  id: string
  name: string
  email: string
  phone: string
  document?: string
  company?: string
  source?: 'prosync' | 'local'
  status?: string
}

export interface ProposalStatusUpdate {
  proposalId: string
  crmClientId: string
  status: 'pendente' | 'aprovada' | 'recusada'
  value: number
  updatedAt: string
  proposalUrl?: string
  clientEmail?: string
  clientDocument?: string
  products?: string[]
}

interface ProsyncLead {
  id: string
  name: string
  email: string | null
  phone: string | null
  company_name: string | null
  status: string
}

function mapPropezStatusToProsyncLeadStatus(
  s: ProposalStatusUpdate['status'],
): string {
  switch (s) {
    case 'aprovada':
      return 'qualified'
    case 'recusada':
      return 'lost'
    case 'pendente':
    default:
      return 'contacted'
  }
}

/**
 * Busca leads do ProSync via backend.
 */
export async function fetchClientsFromCRM(params?: {
  search?: string
  status?: string
  limit?: number
}): Promise<ExternalClient[]> {
  try {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.status) qs.set('status', params.status)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    const q = qs.toString() ? `?${qs.toString()}` : ''

    const res = await fetch(`/api/integrations/prosync/leads${q}`, { method: 'GET' })
    if (!res.ok) {
      console.error('[ProSync] listLeads falhou:', res.status)
      return []
    }
    const data = (await res.json()) as { leads: ProsyncLead[] }
    return (data.leads || []).map((lead) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company_name || undefined,
      status: lead.status,
      source: 'prosync',
    }))
  } catch (error) {
    console.error('[ProSync] Erro ao buscar leads:', error)
    return []
  }
}

/**
 * Atualiza o lead no ProSync com um novo status derivado do estado da proposta.
 */
export async function updateProposalStatusInCRM(update: ProposalStatusUpdate): Promise<boolean> {
  try {
    const leadStatus = mapPropezStatusToProsyncLeadStatus(update.status)
    const res = await fetch(
      `/api/integrations/prosync/leads/${encodeURIComponent(update.crmClientId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: leadStatus,
          notes: `Proposta ${update.proposalId} — R$ ${update.value.toFixed(2)} — ${update.status}${
            update.proposalUrl ? ` — ${update.proposalUrl}` : ''
          }`,
        }),
      },
    )
    return res.ok
  } catch (error) {
    console.error('[ProSync] Erro ao atualizar lead:', error)
    return false
  }
}

/**
 * Sync do produto: hoje registra via backend quando o lead foi aprovado,
 * criando uma venda no ProSync.
 *
 * Esta função aceita um objeto opcional com `prosyncLeadId` + `productId`
 * para registrar a venda. Se não houver esses dados, faz apenas log.
 */
export async function syncProductWithCRM(product: {
  id: string
  nome: string
  valor: number
  prosyncLeadId?: string
  prosyncProductId?: string
  quantity?: number
  status?: 'pending' | 'confirmed'
}): Promise<boolean> {
  if (!product.prosyncLeadId || !product.prosyncProductId) {
    console.info('[ProSync] syncProductWithCRM ignorado (sem lead/product id)')
    return false
  }
  try {
    const res = await fetch(
      `/api/integrations/prosync/leads/${encodeURIComponent(product.prosyncLeadId)}/sale`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.prosyncProductId,
          quantity: product.quantity ?? 1,
          unit_price: product.valor,
          status: product.status ?? 'confirmed',
          notes: `Proposta Propez ${product.id}`,
        }),
      },
    )
    return res.ok
  } catch (error) {
    console.error('[ProSync] Erro ao sync de produto:', error)
    return false
  }
}
