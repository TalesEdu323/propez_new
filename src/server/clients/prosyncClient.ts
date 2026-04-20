/**
 * Cliente HTTP tipado para a API do ProSync.
 *
 * Usa uma API Key (PROSYNC_API_KEY) enviada como `X-API-Key`.
 * Todas as chamadas são server-side — nunca expor a chave no bundle.
 */

export interface ProsyncLead {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string | null
  company_name: string | null
  status: string
  source: string | null
  score: number | null
  notes: string | null
  created_at: string
  updated_at: string
  tags?: Array<{ id: string; name: string; color?: string }>
}

export interface ProsyncListLeadsResponse {
  leads: ProsyncLead[]
  total: number
  limit: number
  offset: number
}

export interface ProsyncSale {
  id: string
  lead_id: string
  product_id: string | null
  quantity: number
  unit_price: number
  total_value: number
  status: 'pending' | 'confirmed' | 'cancelled'
  product_name?: string
  created_at: string
}

export interface ProsyncClientConfig {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
}

export class ProsyncHttpError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'ProsyncHttpError'
    this.status = status
    this.body = body
  }
}

export function createProsyncClient(config: ProsyncClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  const timeoutMs = config.timeoutMs ?? 15_000

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
          ...(init.headers || {}),
        },
        signal: controller.signal,
      })

      const text = await res.text()
      const body = text ? safeJson(text) : null

      if (!res.ok) {
        const message =
          (body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)
            ? String((body as Record<string, unknown>).error)
            : `ProSync ${res.status}`)
        throw new ProsyncHttpError(res.status, message, body)
      }

      return body as T
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    async listLeads(params: {
      status?: string
      search?: string
      limit?: number
      offset?: number
    } = {}): Promise<ProsyncListLeadsResponse> {
      const qs = new URLSearchParams()
      if (params.status) qs.set('status', params.status)
      if (params.search) qs.set('search', params.search)
      if (params.limit != null) qs.set('limit', String(params.limit))
      if (params.offset != null) qs.set('offset', String(params.offset))
      const q = qs.toString() ? `?${qs.toString()}` : ''
      return request<ProsyncListLeadsResponse>(`/api/crm/leads${q}`, { method: 'GET' })
    },

    async getLead(id: string): Promise<{ lead: ProsyncLead }> {
      return request(`/api/crm/leads/${encodeURIComponent(id)}`, { method: 'GET' })
    },

    async updateLead(
      id: string,
      data: Partial<Pick<ProsyncLead, 'name' | 'email' | 'phone' | 'company_name' | 'status' | 'notes'>>,
    ): Promise<{ lead: ProsyncLead }> {
      return request(`/api/crm/leads/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },

    async createSale(
      leadId: string,
      data: {
        product_id: string
        quantity: number
        unit_price?: number
        notes?: string
        status?: 'pending' | 'confirmed'
      },
    ): Promise<{ sale: ProsyncSale }> {
      return request(`/api/crm/leads/${encodeURIComponent(leadId)}/sales`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    async confirmSale(leadId: string, saleId: string): Promise<{ sale: ProsyncSale }> {
      return request(
        `/api/crm/leads/${encodeURIComponent(leadId)}/sales/${encodeURIComponent(saleId)}`,
        { method: 'PUT', body: JSON.stringify({ status: 'confirmed' }) },
      )
    },

    async listProducts(): Promise<{ products: Array<{ id: string; name: string; price: number }> }> {
      return request(`/api/crm/products`, { method: 'GET' })
    },
  }
}

export type ProsyncClient = ReturnType<typeof createProsyncClient>

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
