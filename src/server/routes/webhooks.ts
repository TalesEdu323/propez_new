import crypto from 'crypto'
import express from 'express'
import type { Router, Request, Response } from 'express'
import type { Pool } from 'pg'
import { createProsyncClient } from '../clients/prosyncClient.js'
import { createRubricaClient } from '../clients/rubricaClient.js'
import type { IntegrationsConfig } from '../config.js'
import {
  getMappingByDocument,
  getMappingByProposal,
  logIntegrationEvent,
  upsertMapping,
} from '../db/mappings.js'

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
}): Router {
  const router = express.Router()
  const { pool, config } = deps

  // --- Rubrica: inbound document.signed -----------------------------------
  router.post('/rubrica', express.json({ limit: '256kb' }), async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      event?: string
      documentId?: string
      externalId?: string | null
      signedAt?: string
      downloadUrl?: string
    }

    const querySecret = typeof req.query.secret === 'string' ? req.query.secret : ''

    if (body.event !== 'document.signed' || !body.documentId) {
      return res.status(400).json({ error: 'Payload inválido' })
    }

    try {
      const proposalId = body.externalId ? String(body.externalId) : null
      const mapping = proposalId
        ? await getMappingByProposal(pool, proposalId)
        : await getMappingByDocument(pool, body.documentId)

      const matchesSecret = !!(
        mapping?.webhook_secret &&
        querySecret &&
        timingSafeEqual(mapping.webhook_secret, querySecret)
      )

      await logIntegrationEvent(pool, {
        source: 'rubrica',
        event: body.event,
        proposalId: mapping?.propez_proposal_id ?? proposalId,
        organizationId: mapping?.organization_id ?? null,
        payload: body as Record<string, unknown>,
        signatureValid: matchesSecret,
      })

      if (!mapping) {
        console.warn('[webhooks/rubrica] documento sem mapping:', body.documentId, 'externalId:', proposalId)
        return res.status(404).json({ error: 'Mapping não encontrado' })
      }

      if (!matchesSecret) {
        console.warn('[webhooks/rubrica] secret inválido para proposta', mapping.propez_proposal_id)
        return res.status(401).json({ error: 'Secret inválido' })
      }

      let signedUrl: string | null = mapping.rubrica_signed_pdf_url
      if (config.rubrica.apiKey) {
        try {
          const rb = createRubricaClient({
            baseUrl: config.rubrica.baseUrl,
            apiKey: config.rubrica.apiKey,
          })
          await rb.downloadDocument(body.documentId, { type: 'signed' })
          signedUrl = body.downloadUrl || signedUrl || `${config.rubrica.baseUrl.replace(/\/+$/, '')}/api/documents/${body.documentId}/download?type=signed`
        } catch (err) {
          console.error('[webhooks/rubrica] download failed:', err)
        }
      }

      const updated = await upsertMapping(pool, {
        propez_proposal_id: mapping.propez_proposal_id,
        organization_id: mapping.organization_id,
        status: 'signed',
        rubrica_signed_pdf_url: signedUrl,
      })

      // Reflete em propostas (rubrica_status = signed).
      await pool
        .query(
          `UPDATE propostas SET
             rubrica_status = 'signed',
             rubrica_signed_pdf_url = COALESCE($3, rubrica_signed_pdf_url),
             rubrica_last_sync_at = NOW(),
             status = CASE WHEN status = 'pendente' THEN 'aprovada' ELSE status END
           WHERE id::text = $1 AND ($2::uuid IS NULL OR organization_id = $2::uuid)`,
          [mapping.propez_proposal_id, mapping.organization_id, signedUrl],
        )
        .catch((err) => console.error('[webhooks/rubrica] propostas update failed:', err))

      if (updated.prosync_lead_id && config.prosync.apiKey) {
        try {
          const ps = createProsyncClient({
            baseUrl: config.prosync.baseUrl,
            apiKey: config.prosync.apiKey,
          })
          await ps.updateLead(updated.prosync_lead_id, { status: 'converted' })
        } catch (err) {
          console.error('[webhooks/rubrica] prosync.updateLead failed:', err)
        }
      }

      return res.json({ received: true, proposalId: updated.propez_proposal_id, status: 'signed' })
    } catch (err) {
      console.error('[webhooks/rubrica] erro:', err)
      return res.status(500).json({ error: 'Erro ao processar webhook' })
    }
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
