/**
 * Cliente para emitir eventos de proposta para o ProSync via
 * `/api/partner/proposal-events` (Fase 4 da suíte Taggo).
 *
 * Autenticação: HMAC-SHA256 sobre `<timestamp>.<rawBody>` com
 * `TAGGO_SUITE_SECRET`. Mesmo padrão dos outros clientes da suíte.
 *
 * Fire-and-forget no caller: este módulo não levanta exceções; só loga.
 */
import crypto from 'node:crypto'
import type { IntegrationsConfig } from '../config.js'

export type ProposalEventName =
  | 'proposal.created'
  | 'proposal.sent'
  | 'proposal.viewed'
  | 'proposal.approved'
  | 'proposal.rejected'
  | 'proposal.signed'
  | 'proposal.expired'

export interface ProposalEventInput {
  event: ProposalEventName
  externalId: string                 // id da proposta no Propez
  leadId: string                     // id do lead no ProSync
  organizationId?: string | null     // org ProSync (alvo)
  title?: string | null
  publicUrl?: string | null
  status?: string | null
  valueCents?: number | null
  currency?: string | null
  externalCreatedAt?: Date | string | null
  externalUpdatedAt?: Date | string | null
  metadata?: Record<string, unknown> | null
}

const TIMEOUT_MS = 8_000
const ORIGIN_APP = 'propez'

function signBody(secret: string, timestamp: string, rawBody: string): string {
  return (
    'sha256=' +
    crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  )
}

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

export function createSuiteProposalEvents(config: IntegrationsConfig) {
  const secret = config.suiteSecret
  const baseUrl = config.prosync.baseUrl

  function isEnabled(): boolean {
    return Boolean(secret && secret.length >= 32)
  }

  async function emit(event: ProposalEventInput): Promise<{ ok: boolean; error?: string }> {
    if (!isEnabled()) return { ok: false, error: 'suite_secret_missing' }
    if (!event.leadId || !event.externalId) {
      return { ok: false, error: 'leadId/externalId obrigatórios' }
    }

    const rawBody = JSON.stringify({
      event: event.event,
      externalId: event.externalId,
      leadId: event.leadId,
      organizationId: event.organizationId ?? undefined,
      title: event.title ?? undefined,
      publicUrl: event.publicUrl ?? undefined,
      status: event.status ?? undefined,
      valueCents: event.valueCents ?? undefined,
      currency: event.currency ?? undefined,
      externalCreatedAt: toIso(event.externalCreatedAt),
      externalUpdatedAt: toIso(event.externalUpdatedAt),
      metadata: event.metadata ?? undefined,
    })
    const timestamp = Date.now().toString()
    const signature = signBody(secret as string, timestamp, rawBody)

    const url = `${baseUrl.replace(/\/+$/, '')}/api/partner/proposal-events`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-taggo-suite-signature': signature,
          'x-taggo-suite-app': ORIGIN_APP,
          'x-taggo-suite-timestamp': timestamp,
        },
        body: rawBody,
        signal: controller.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return { ok: false, error: `prosync ${res.status}: ${text.slice(0, 200)}` }
      }
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'rede' }
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Emite o evento em background — não bloqueia o caller. Logs em caso de erro.
   */
  function fireAndForget(event: ProposalEventInput): void {
    if (!isEnabled()) return
    void emit(event)
      .then((r) => {
        if (!r.ok) {
          console.warn('[suite/proposal-events] falha:', event.event, r.error)
        }
      })
      .catch((err) => console.warn('[suite/proposal-events] excecao:', err))
  }

  return { isEnabled, emit, fireAndForget }
}

export type SuiteProposalEventsClient = ReturnType<typeof createSuiteProposalEvents>
