/**
 * Cliente para emitir eventos de proposta para o ProSync via
 * `/api/partner/proposal-events` (Fase 4 da suíte Taggo).
 *
 * SaaS: cada organização do Propez usa a URL e o tenant ProSync resolvidos em
 * `org_integration_credentials` (não o `PROSYNC_API_URL` global sozinho).
 *
 * Autenticação partner: HMAC-SHA256 com `TAGGO_SUITE_SECRET` (segredo da
 * plataforma Taggo, compartilhado entre apps da suíte no mesmo deployment).
 */
import crypto from 'node:crypto'
import type { IntegrationsConfig } from '../config.js'
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js'
import { resolveSuiteProsyncTarget } from '../integrations/resolveSuiteProsyncTarget.js'

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
  externalId: string
  leadId: string
  /** ID da organização no ProSync; preenchido automaticamente se omitido. */
  organizationId?: string | null
  title?: string | null
  publicUrl?: string | null
  status?: string | null
  valueCents?: number | null
  currency?: string | null
  externalCreatedAt?: Date | string | null
  externalUpdatedAt?: Date | string | null
  metadata?: Record<string, unknown> | null
}

/** Contexto multi-tenant: organização dona da proposta no Propez. */
export type ProposalEventEmitInput = ProposalEventInput & {
  propezOrganizationId: string
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

export function createSuiteProposalEvents(deps: {
  config: IntegrationsConfig
  orgCredentialsRepo?: OrgIntegrationCredentialsRepo
}) {
  const { config, orgCredentialsRepo } = deps
  const secret = config.suiteSecret

  function isEnabled(): boolean {
    return Boolean(secret && secret.length >= 32)
  }

  async function emit(
    input: ProposalEventEmitInput,
  ): Promise<{ ok: boolean; error?: string; crm?: { statusUpdated?: boolean; tagApplied?: boolean } }> {
    if (!isEnabled()) return { ok: false, error: 'suite_secret_missing' }
    if (!input.leadId || !input.externalId) {
      return { ok: false, error: 'leadId/externalId obrigatórios' }
    }

    const target = await resolveSuiteProsyncTarget({
      propezOrganizationId: input.propezOrganizationId,
      config,
      orgCredentialsRepo,
    })
    if (!target) {
      return { ok: false, error: 'prosync_nao_configurado_para_org' }
    }

    const prosyncOrgId = input.organizationId ?? target.externalOrgId ?? undefined

    const rawBody = JSON.stringify({
      event: input.event,
      externalId: input.externalId,
      leadId: input.leadId,
      organizationId: prosyncOrgId,
      title: input.title ?? undefined,
      publicUrl: input.publicUrl ?? undefined,
      status: input.status ?? undefined,
      valueCents: input.valueCents ?? undefined,
      currency: input.currency ?? undefined,
      externalCreatedAt: toIso(input.externalCreatedAt),
      externalUpdatedAt: toIso(input.externalUpdatedAt),
      metadata: input.metadata ?? undefined,
    })
    const timestamp = Date.now().toString()
    const signature = signBody(secret as string, timestamp, rawBody)

    const url = `${target.baseUrl.replace(/\/+$/, '')}/api/partner/proposal-events`
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
      const text = await res.text().catch(() => '')
      if (!res.ok) {
        return { ok: false, error: `prosync ${res.status}@${target.baseUrl}: ${text.slice(0, 200)}` }
      }
      let crm: { statusUpdated?: boolean; tagApplied?: boolean } | undefined
      try {
        const parsed = text ? JSON.parse(text) : null
        if (parsed?.crm && typeof parsed.crm === 'object') crm = parsed.crm
      } catch {
        /* resposta não-JSON */
      }
      return { ok: true, crm }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'rede' }
    } finally {
      clearTimeout(timer)
    }
  }

  function fireAndForget(input: ProposalEventEmitInput): void {
    if (!isEnabled()) return
    void emit(input)
      .then((r) => {
        if (!r.ok) {
          console.warn(
            '[suite/proposal-events] falha:',
            input.event,
            `org=${input.propezOrganizationId}`,
            r.error,
          )
        } else if (r.crm && input.event === 'proposal.sent') {
          console.info('[suite/proposal-events] proposal.sent crm:', r.crm)
        }
      })
      .catch((err) => console.warn('[suite/proposal-events] excecao:', err))
  }

  return { isEnabled, emit, fireAndForget }
}

export type SuiteProposalEventsClient = ReturnType<typeof createSuiteProposalEvents>
