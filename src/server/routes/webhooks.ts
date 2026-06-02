import crypto from 'crypto'
import express from 'express'
import type { Router, Request, Response } from 'express'
import type { Pool } from 'pg'
import type { IntegrationsConfig } from '../config.js'
import {
  logIntegrationEvent,
} from '../db/mappings.js'
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js'

/**
 * Inbound webhooks dos integradores. Rotas públicas (sem auth) — protegidas
 * por HMAC (ProSync) ou secret em query string (Rubrica).
 *
 * Quando o webhook chega, a organization_id é recuperada do mapping existente
 * (criado pelo Propez quando disparou `/api/integrations/rubrica/send`).
 */
export function buildWebhooksRouter(deps: {
  pool: Pool
  config: IntegrationsConfig
  orgCredentialsRepo?: OrgIntegrationCredentialsRepo
}): Router {
  const router = express.Router()
  const { pool, config } = deps
  router.post('/rubrica', express.json({ limit: '256kb' }), (_req: Request, res: Response) => {
    return res.status(410).json({
      error: 'Webhook Rubrica descontinuado. Assinaturas são processadas nativamente no PropEZ.',
      code: 'rubrica_webhook_deprecated',
    })
  })

  // --- ProSync: inbound (HMAC) --------------------------------------------
  router.post(
    '/prosync',
    express.raw({ type: '*/*', limit: '1mb' }),
    async (req: Request, res: Response) => {
      const rawBody = Buffer.isBuffer(req.body) ? (req.body as Buffer) : Buffer.from(req.body as any)
      const secret = config.prosync.webhookSecret

      const sigHeader = (req.headers['x-prosync-signature'] as string) || ''
      const event = (req.headers['x-prosync-event'] as string) || ''

      let signatureValid: boolean | null = null
      if (secret) {
        const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
        signatureValid = !!sigHeader && timingSafeEqual(expected, sigHeader)
        if (!signatureValid) {
          await logIntegrationEvent(pool, {
            source: 'prosync',
            event: event || 'unknown',
            payload: { raw: rawBody.toString('utf8').slice(0, 2000) },
            signatureValid: false,
          })
          return res.status(401).json({ error: 'Assinatura inválida' })
        }
      }

      let parsed: Record<string, unknown>
      try {
        parsed = rawBody.length > 0 ? JSON.parse(rawBody.toString('utf8')) : {}
      } catch {
        return res.status(400).json({ error: 'Body inválido' })
      }

      const ev = (parsed?.event as string) || event || 'unknown'
      const data = (parsed?.data as Record<string, unknown>) || {}
      const lead = (data?.lead as { id?: string } | undefined) || undefined
      const lookup = lead?.id ? await lookupProposalByLead(pool, lead.id) : null

      await logIntegrationEvent(pool, {
        source: 'prosync',
        event: ev,
        proposalId: lookup?.proposalId ?? null,
        organizationId: lookup?.organizationId ?? null,
        payload: parsed,
        signatureValid,
      })

      return res.json({ received: true })
    },
  )

  return router
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

async function lookupProposalByLead(
  pool: Pool,
  leadId: string,
): Promise<{ proposalId: string; organizationId: string | null } | null> {
  try {
    const res = await pool.query<{ propez_proposal_id: string; organization_id: string | null }>(
      `SELECT propez_proposal_id, organization_id FROM integration_mappings
       WHERE prosync_lead_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [leadId],
    )
    const r = res.rows[0]
    if (!r) return null
    return { proposalId: r.propez_proposal_id, organizationId: r.organization_id }
  } catch {
    return null
  }
}
