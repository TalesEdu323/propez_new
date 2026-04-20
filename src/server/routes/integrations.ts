import crypto from 'crypto'
import express from 'express'
import type { Router, Request, Response } from 'express'
import type { Pool } from 'pg'
import { createProsyncClient, ProsyncHttpError } from '../clients/prosyncClient.js'
import { createRubricaClient, RubricaHttpError } from '../clients/rubricaClient.js'
import { generateContractPdf } from '../services/contractPdf.js'
import type { IntegrationsConfig } from '../config.js'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import {
  getMappingByProposal,
  logIntegrationEvent,
  upsertMapping,
} from '../db/mappings.js'

/**
 * Router de `/api/integrations/*`. Todas as rotas requerem auth e fazem proxy
 * para ProSync/Rubrica carregando as API keys apenas no servidor.
 * Cada mapping criado passa a carregar `organization_id`, permitindo filtrar
 * por tenant em relatórios e resolver webhooks.
 */
export function buildIntegrationsRouter(deps: {
  pool: Pool
  config: IntegrationsConfig
  envConfig: EnvironmentConfig
}): Router {
  const router = express.Router()
  const { pool, config, envConfig } = deps

  router.use(buildRequireAuth(envConfig.auth))

  function prosync() {
    if (!config.prosync.apiKey) {
      throw new Error('PROSYNC_API_KEY não configurada')
    }
    return createProsyncClient({
      baseUrl: config.prosync.baseUrl,
      apiKey: config.prosync.apiKey,
    })
  }

  function rubrica() {
    if (!config.rubrica.apiKey) {
      throw new Error('RUBRICA_API_KEY não configurada')
    }
    return createRubricaClient({
      baseUrl: config.rubrica.baseUrl,
      apiKey: config.rubrica.apiKey,
    })
  }

  function handleUpstreamError(res: Response, err: unknown, label: string) {
    if (err instanceof ProsyncHttpError || err instanceof RubricaHttpError) {
      res.status(err.status >= 400 && err.status < 600 ? err.status : 502).json({
        error: err.message,
        upstream: label,
        body: err.body,
      })
      return
    }
    console.error(`[integrations:${label}]`, err)
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Upstream error',
      upstream: label,
    })
  }

  // -------------------------------------------------------------------------
  // ProSync proxy
  // -------------------------------------------------------------------------
  router.get('/prosync/leads', async (req: Request, res: Response) => {
    try {
      const { status, search, limit, offset } = req.query
      const data = await prosync().listLeads({
        status: typeof status === 'string' ? status : undefined,
        search: typeof search === 'string' ? search : undefined,
        limit: typeof limit === 'string' ? Number(limit) : undefined,
        offset: typeof offset === 'string' ? Number(offset) : undefined,
      })
      res.json(data)
    } catch (err) {
      handleUpstreamError(res, err, 'prosync.listLeads')
    }
  })

  router.get('/prosync/leads/:id', async (req: Request, res: Response) => {
    try {
      const data = await prosync().getLead(req.params.id)
      res.json(data)
    } catch (err) {
      handleUpstreamError(res, err, 'prosync.getLead')
    }
  })

  router.patch('/prosync/leads/:id', async (req: Request, res: Response) => {
    try {
      const data = await prosync().updateLead(req.params.id, req.body || {})
      await logIntegrationEvent(pool, {
        source: 'internal',
        event: 'prosync.lead.updated',
        organizationId: req.auth?.orgId ?? null,
        payload: { leadId: req.params.id, request: req.body || null },
      }).catch(() => {})
      res.json(data)
    } catch (err) {
      handleUpstreamError(res, err, 'prosync.updateLead')
    }
  })

  router.post('/prosync/leads/:id/sale', async (req: Request, res: Response) => {
    try {
      const { product_id, quantity, unit_price, notes, status } = req.body || {}
      if (!product_id || !quantity) {
        return res.status(400).json({ error: 'product_id e quantity obrigatórios' })
      }
      const data = await prosync().createSale(req.params.id, {
        product_id,
        quantity,
        unit_price,
        notes,
        status,
      })
      await logIntegrationEvent(pool, {
        source: 'internal',
        event: 'prosync.sale.created',
        organizationId: req.auth?.orgId ?? null,
        payload: { leadId: req.params.id, product_id, quantity, unit_price, status },
      }).catch(() => {})
      res.json(data)
    } catch (err) {
      handleUpstreamError(res, err, 'prosync.createSale')
    }
  })

  router.get('/prosync/products', async (_req: Request, res: Response) => {
    try {
      const data = await prosync().listProducts()
      res.json(data)
    } catch (err) {
      handleUpstreamError(res, err, 'prosync.listProducts')
    }
  })

  // -------------------------------------------------------------------------
  // Rubrica orquestração
  // -------------------------------------------------------------------------

  router.post('/rubrica/send', async (req: Request, res: Response) => {
    const body = req.body || {}
    const proposalId: string = String(body.proposalId || '').trim()
    if (!proposalId) {
      return res.status(400).json({ error: 'proposalId obrigatório' })
    }
    const clientName: string = String(body.clientName || '').trim()
    const clientEmail: string = String(body.clientEmail || '').trim()
    const contractText: string = String(body.contractText || '').trim()
    if (!clientName || !clientEmail) {
      return res.status(400).json({ error: 'clientName e clientEmail obrigatórios' })
    }
    if (!contractText) {
      return res.status(400).json({ error: 'contractText obrigatório' })
    }

    const title = String(body.contractTitle || `Contrato - ${proposalId}`).slice(0, 200)
    const orgId = req.auth?.orgId ?? null

    try {
      // Confirma que a proposta pertence à organização atual (defense in depth).
      const ownerCheck = await pool.query<{ id: string }>(
        `SELECT id FROM propostas WHERE id::text = $1 AND organization_id = $2`,
        [proposalId, orgId],
      )
      if (!ownerCheck.rows[0]) {
        return res.status(404).json({ error: 'Proposta não encontrada nesta organização' })
      }

      const pdf = await generateContractPdf({
        title,
        body: contractText,
        clientName,
        clientDocument: body.clientDocument ? String(body.clientDocument) : undefined,
        companyName: body.companyName ? String(body.companyName) : undefined,
        companyCnpj: body.companyCnpj ? String(body.companyCnpj) : undefined,
        value: typeof body.value === 'number' ? body.value : undefined,
        location: body.location ? String(body.location) : undefined,
      })

      const secret = crypto.randomBytes(12).toString('hex')

      await upsertMapping(pool, {
        propez_proposal_id: proposalId,
        organization_id: orgId,
        prosync_lead_id: body.prosyncLeadId ? String(body.prosyncLeadId) : null,
        webhook_secret: secret,
        status: 'pending',
      })

      const rb = rubrica()
      const uploadRes = await rb.uploadDocument({
        fileBuffer: pdf,
        fileName: `${sanitizeFileName(title)}.pdf`,
        title,
      })
      const documentId = uploadRes.document.id

      const webhookUrl = `${config.appUrl.replace(/\/+$/, '')}/api/webhooks/rubrica?secret=${encodeURIComponent(secret)}`

      const sendRes = await rb.sendForSignature({
        documentId,
        signers: [
          {
            name: clientName,
            email: clientEmail,
            phone: body.clientPhone ? String(body.clientPhone) : undefined,
            signatureType: 'padrao',
            authOptions: { emailCode: true },
          },
        ],
        webhookUrl,
        externalId: proposalId,
      })

      const signingUrl = sendRes.signatureLinks?.[0]?.link

      const mapping = await upsertMapping(pool, {
        propez_proposal_id: proposalId,
        organization_id: orgId,
        rubrica_document_id: documentId,
        rubrica_signing_url: signingUrl ?? null,
        status: 'sent',
      })

      // Reflete em propostas.rubrica_* para a UI atualizar direto do DB.
      await pool.query(
        `UPDATE propostas SET
           rubrica_document_id = $3,
           rubrica_signing_url = $4,
           rubrica_status = 'sent',
           rubrica_last_sync_at = NOW()
         WHERE id::text = $1 AND organization_id = $2`,
        [proposalId, orgId, documentId, signingUrl ?? null],
      ).catch((err) => console.error('[integrations:rubrica/send] propostas update failed:', err))

      await logIntegrationEvent(pool, {
        source: 'internal',
        event: 'rubrica.sent',
        proposalId,
        organizationId: orgId,
        payload: { documentId, signingUrl },
      })

      if (mapping.prosync_lead_id && config.prosync.apiKey) {
        prosync()
          .updateLead(mapping.prosync_lead_id, { status: 'contacted' })
          .catch((err) =>
            console.error('[integrations:rubrica/send] updateLead contacted failed:', err),
          )
      }

      return res.json({
        proposalId,
        documentId,
        signingUrl,
        status: 'sent',
      })
    } catch (err) {
      await upsertMapping(pool, {
        propez_proposal_id: proposalId,
        organization_id: orgId,
        status: 'failed',
        last_error: err instanceof Error ? err.message : String(err),
      }).catch(() => {})
      return handleUpstreamError(res, err, 'rubrica.send')
    }
  })

  router.get('/rubrica/status/:proposalId', async (req: Request, res: Response) => {
    try {
      const mapping = await getMappingByProposal(pool, req.params.proposalId)
      if (!mapping) {
        return res.status(404).json({ error: 'Proposta sem mapping' })
      }
      if (mapping.organization_id && mapping.organization_id !== req.auth?.orgId) {
        return res.status(404).json({ error: 'Proposta sem mapping' })
      }

      const result: Record<string, unknown> = {
        proposalId: mapping.propez_proposal_id,
        status: mapping.status,
        documentId: mapping.rubrica_document_id,
        signingUrl: mapping.rubrica_signing_url,
        signedPdfUrl: mapping.rubrica_signed_pdf_url,
      }

      if (
        mapping.rubrica_document_id &&
        mapping.status !== 'signed' &&
        config.rubrica.apiKey
      ) {
        try {
          const live = await rubrica().getSignatureStatus(mapping.rubrica_document_id)
          result.live = live
        } catch (err) {
          result.liveError = err instanceof Error ? err.message : String(err)
        }
      }

      return res.json(result)
    } catch (err) {
      return handleUpstreamError(res, err, 'rubrica.status')
    }
  })

  router.get('/rubrica/download/:proposalId', async (req: Request, res: Response) => {
    try {
      const mapping = await getMappingByProposal(pool, req.params.proposalId)
      if (!mapping || !mapping.rubrica_document_id) {
        return res.status(404).json({ error: 'Proposta sem documento Rubrica' })
      }
      if (mapping.organization_id && mapping.organization_id !== req.auth?.orgId) {
        return res.status(404).json({ error: 'Proposta sem documento Rubrica' })
      }
      const dl = await rubrica().downloadDocument(mapping.rubrica_document_id, { type: 'signed' })
      res.setHeader('Content-Type', dl.contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${dl.fileName}"`)
      res.send(dl.buffer)
    } catch (err) {
      handleUpstreamError(res, err, 'rubrica.download')
    }
  })

  return router
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\-_. ]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'contrato'
}
