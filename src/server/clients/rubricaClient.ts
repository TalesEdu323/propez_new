/**
 * Cliente HTTP tipado para a API do Rubrica (assinaturas).
 *
 * Autenticação por API Key (`X-API-Key` = RUBRICA_API_KEY). Usado apenas
 * server-side — a chave nunca vai ao browser.
 */

export interface RubricaSigner {
  name: string
  email: string
  phone?: string
  signatureType?: 'padrao' | 'avancada'
  authOptions?: {
    email?: boolean
    emailCode?: boolean
    sms?: boolean
    smsCode?: boolean
    whatsapp?: boolean
    whatsappCode?: boolean
    cpfSimples?: boolean
    cpfAvancado?: boolean
    digitalCertificate?: boolean
  }
}

export interface RubricaUploadResult {
  success: boolean
  document: {
    id: string
    title: string
    fileName: string
    status: string
    createdAt: string
  }
}

export interface RubricaSendResult {
  success?: boolean
  signatureLinks: Array<{
    signer: RubricaSigner
    link: string
    token: string
  }>
}

export interface RubricaStatusResult {
  documentId: string
  status: string
  signers?: Array<{ email: string; status: string; signedAt?: string }>
  signedAt?: string
  downloadUrl?: string
}

export interface RubricaClientConfig {
  baseUrl: string
  apiKey: string
  timeoutMs?: number
}

export class RubricaHttpError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'RubricaHttpError'
    this.status = status
    this.body = body
  }
}

export function createRubricaClient(config: RubricaClientConfig) {
  const baseUrl = config.baseUrl.replace(/\/+$/, '')
  const timeoutMs = config.timeoutMs ?? 30_000

  function authHeaders(extra: Record<string, string> = {}) {
    return {
      'X-API-Key': config.apiKey,
      ...extra,
    }
  }

  async function jsonRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
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
            : `Rubrica ${res.status}`)
        throw new RubricaHttpError(res.status, message, body)
      }
      return body as T
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    /**
     * Faz upload de um PDF (buffer) para o Rubrica.
     * Cria um documento WAITING (ainda não enviado para assinatura).
     */
    async uploadDocument(input: {
      fileBuffer: Buffer | Uint8Array
      fileName: string
      title: string
      description?: string
    }): Promise<RubricaUploadResult> {
      const form = new FormData()
      const bytes = input.fileBuffer instanceof Uint8Array
        ? input.fileBuffer
        : new Uint8Array(input.fileBuffer)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      form.append('file', blob, input.fileName)
      form.append('title', input.title)
      if (input.description) form.append('description', input.description)

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          headers: authHeaders(),
          body: form,
          signal: controller.signal,
        })
        const text = await res.text()
        const body = text ? safeJson(text) : null
        if (!res.ok) {
          const message =
            body && typeof body === 'object' && 'error' in (body as Record<string, unknown>)
              ? String((body as Record<string, unknown>).error)
              : `Rubrica upload ${res.status}`
          throw new RubricaHttpError(res.status, message, body)
        }
        return body as RubricaUploadResult
      } finally {
        clearTimeout(timer)
      }
    },

    async sendForSignature(input: {
      documentId: string
      signers: RubricaSigner[]
      webhookUrl?: string
      externalId?: string
    }): Promise<RubricaSendResult> {
      return jsonRequest<RubricaSendResult>(
        `/api/documents/${encodeURIComponent(input.documentId)}/send`,
        {
          method: 'POST',
          body: JSON.stringify({
            signers: input.signers,
            webhookUrl: input.webhookUrl,
            externalId: input.externalId,
          }),
        },
      )
    },

    async getSignatureStatus(documentId: string): Promise<RubricaStatusResult> {
      return jsonRequest<RubricaStatusResult>(
        `/api/documents/${encodeURIComponent(documentId)}/signature-status`,
        { method: 'GET' },
      )
    },

    /**
     * Faz download do PDF assinado. Retorna Buffer + content-type.
     * `type` padrão é 'signed'.
     */
    async downloadDocument(
      documentId: string,
      opts: { type?: 'signed' | 'original' } = {},
    ): Promise<{ buffer: Buffer; contentType: string; fileName: string }> {
      const type = opts.type ?? 'signed'
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(
          `${baseUrl}/api/documents/${encodeURIComponent(documentId)}/download?type=${type}`,
          { method: 'GET', headers: authHeaders(), signal: controller.signal },
        )
        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new RubricaHttpError(res.status, `Rubrica download ${res.status}`, text)
        }
        const arrBuf = await res.arrayBuffer()
        const buffer = Buffer.from(arrBuf)
        const contentType = res.headers.get('content-type') || 'application/pdf'
        const cd = res.headers.get('content-disposition') || ''
        const match = /filename\*=UTF-8''([^;]+)|filename="?([^;"]+)"?/i.exec(cd)
        const fileName = decodeURIComponent(match?.[1] || match?.[2] || `document-${documentId}.pdf`)
        return { buffer, contentType, fileName }
      } finally {
        clearTimeout(timer)
      }
    },
  }
}

export type RubricaClient = ReturnType<typeof createRubricaClient>

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
