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
import type { EnsureSuiteCredential } from '../integrations/ensureSuiteCredential.js'
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js'
import type { SuiteApp } from '../clients/suiteLookup.js'
import type { SuiteProposalEventsClient } from '../clients/suiteProposalEvents.js'
import type { MailClient } from '../mail/client.js'
import { notifyProposalEventAsync } from '../services/notificationService.js'

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
  /** Provisionamento automático de credenciais via suíte Taggo (Fase 1). */
  ensureSuiteCredential?: EnsureSuiteCredential
  /** Repositório de credenciais por organização (Fase 1). */
  orgCredentialsRepo?: OrgIntegrationCredentialsRepo
  /** Emissor de eventos de proposta (Fase 4). */
  suiteProposalEvents?: SuiteProposalEventsClient
  mail?: MailClient
}): Router {
  const router = express.Router()
  const {
    pool,
    config,
    envConfig,
    ensureSuiteCredential,
    orgCredentialsRepo,
    suiteProposalEvents,
    mail,
  } = deps

  router.use(buildRequireAuth(envConfig.auth))

  // --------------------------------------------------------------------------
  // GET /api/integrations/credentials
  // Lista credenciais (sem segredos) para a organização atual.
  // --------------------------------------------------------------------------
  router.get('/credentials', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    if (!orgCredentialsRepo) {
      return res.json({ providers: [], suiteEnabled: false })
    }
    const orgId = req.auth.orgId
    try {
      const [prosync, rubrica] = await Promise.all([
        orgCredentialsRepo.getCredential(orgId, 'prosync'),
        orgCredentialsRepo.getCredential(orgId, 'rubrica'),
      ])
      const summarize = (c: Awaited<ReturnType<typeof orgCredentialsRepo.getCredential>>) =>
        c
          ? {
              configured: true,
              source: c.source,
              keyPrefix: c.keyPrefix,
              externalUserId: c.externalUserId,
              externalOrgId: c.externalOrgId,
              scopes: c.scopes,
              lastVerifiedAt: c.lastVerifiedAt,
            }
          : { configured: false }
      return res.json({
        suiteEnabled: Boolean(config.suiteSecret),
        prosync: summarize(prosync),
        rubrica: summarize(rubrica),
      })
    } catch (err) {
      console.error('[integrations/credentials] list erro:', err)
      return res.status(500).json({ error: 'Erro ao listar credenciais' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/integrations/credentials/:provider/provision
  // Dispara provisionamento automático via suíte Taggo (Fase 1).
  // --------------------------------------------------------------------------
  router.post('/credentials/:provider/provision', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    if (!ensureSuiteCredential) {
      return res
        .status(503)
        .json({ error: 'Provisionamento da suíte indisponível neste ambiente' })
    }
    const provider = String(req.params.provider || '').toLowerCase()
    if (provider !== 'prosync' && provider !== 'rubrica') {
      return res.status(400).json({ error: 'provider deve ser prosync ou rubrica' })
    }

    const createIfMissing = Boolean(req.body?.createIfMissing ?? true)
    const force = Boolean(req.body?.force)
    const company =
      typeof req.body?.company === 'string' && req.body.company.length > 0
        ? String(req.body.company).slice(0, 200)
        : undefined

    try {
      const { rows } = await pool.query<{ name: string }>(
        `SELECT name FROM organizations WHERE id = $1`,
        [req.auth.orgId],
      )
      const orgName = rows[0]?.name

      const result = await ensureSuiteCredential(provider as SuiteApp, {
        organizationId: req.auth.orgId,
        ownerEmail: req.auth.email,
        keyName: `Propez (${orgName || req.auth.orgId.slice(0, 8)})`,
        createIfMissing,
        company: company ?? orgName ?? undefined,
        force,
      })

      if (result.ok !== true) {
        const status = result.status === 404 || result.status === 409 ? result.status : 502
        return res.status(status).json({ error: result.reason })
      }

      return res.status(result.provisioned ? 201 : 200).json({
        provisioned: result.provisioned,
        provider: result.credential.provider,
        keyPrefix: result.credential.keyPrefix,
        externalUserId: result.credential.externalUserId,
        externalOrgId: result.credential.externalOrgId,
        source: result.credential.source,
      })
    } catch (err) {
      console.error(`[integrations/credentials/${provider}/provision] erro:`, err)
      return res.status(500).json({ error: 'Erro ao provisionar credencial' })
    }
  })

  /**
   * Resolve a chave de integração da organização autenticada para o provider
   * indicado. Ordem de busca:
   *   1. `org_integration_credentials` (cifrada).
   *   2. Provisionamento automático via suíte Taggo (vincula sem criar).
   *   3. Fallback para `PROSYNC_API_KEY`/`RUBRICA_API_KEY` global do `.env`.
   * Lança erro se nada funcionar.
   */
  async function resolveProviderApiKey(
    req: Request,
    provider: SuiteApp,
  ): Promise<string> {
    const orgId = req.auth?.orgId
    const email = req.auth?.email
    if (!orgId) throw new Error('Sem organização autenticada')

    if (orgCredentialsRepo) {
      const cred = await orgCredentialsRepo
        .getCredential(orgId, provider)
        .catch(() => null)
      if (cred) return cred.apiKey
    }

    if (ensureSuiteCredential && email) {
      const result = await ensureSuiteCredential(provider, {
        organizationId: orgId,
        ownerEmail: email,
        createIfMissing: false,
      })
      if (result.ok) return result.credential.apiKey
    }

    const fallback =
      provider === 'prosync' ? config.prosync.apiKey : config.rubrica.apiKey
    if (fallback) return fallback

    const envName = provider === 'prosync' ? 'PROSYNC_API_KEY' : 'RUBRICA_API_KEY'
    throw new Error(
      `${provider} sem credencial para esta organização: rode ` +
        `POST /api/integrations/credentials/${provider}/provision ou defina ${envName}.`,
    )
  }

  async function prosyncFor(req: Request) {
    const apiKey = await resolveProviderApiKey(req, 'prosync')
    return createProsyncClient({ baseUrl: config.prosync.baseUrl, apiKey })
  }

  async function rubricaFor(req: Request) {
    const apiKey = await resolveProviderApiKey(req, 'rubrica')
    return createRubricaClient({ baseUrl: config.rubrica.baseUrl, apiKey })
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
    const message = err instanceof Error ? err.message : String(err)
    const code = err instanceof Error && 'code' in err ? String((err as { code?: unknown }).code ?? '') : ''
    const isDns = code === 'ENOTFOUND' || /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)
    const isTimeout = code === 'ABORT_ERR' || /aborted|timeout/i.test(message)
    const userMessage = isDns
      ? 'Falha de DNS ao acessar integração externa'
      : isTimeout
        ? 'Timeout ao acessar integração externa'
        : message || 'Upstream error'

    console.error(`[integrations:${label}]`, {
      message,
      code: code || undefined,
      type: isDns ? 'dns' : isTimeout ? 'timeout' : 'generic',
    })
    res.status(502).json({
      error: userMessage,
      upstream: label,
      code: code || undefined,
    })
  }

  // -------------------------------------------------------------------------
  // ProSync proxy
  // -------------------------------------------------------------------------
  router.get('/prosync/leads', async (req: Request, res: Response) => {
    try {
      const { status, search, limit, offset } = req.query
      const client = await prosyncFor(req)
      const data = await client.listLeads({
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
      const client = await prosyncFor(req)
      const data = await client.getLead(req.params.id)
      res.json(data)
    } catch (err) {
      handleUpstreamError(res, err, 'prosync.getLead')
    }
  })

  router.patch('/prosync/leads/:id', async (req: Request, res: Response) => {
    try {
      const client = await prosyncFor(req)
      const data = await client.updateLead(req.params.id, req.body || {})
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
      const client = await prosyncFor(req)
      const data = await client.createSale(req.params.id, {
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

  router.get('/prosync/products', async (req: Request, res: Response) => {
    try {
      const client = await prosyncFor(req)
      const data = await client.listProducts()
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

      const rb = await rubricaFor(req)
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
           cliente_email = COALESCE(NULLIF($5, ''), cliente_email),
           cliente_nome = COALESCE(NULLIF($6, ''), cliente_nome),
           rubrica_document_id = $3,
           rubrica_signing_url = $4,
           rubrica_status = 'sent',
           rubrica_last_sync_at = NOW()
         WHERE id::text = $1 AND organization_id = $2`,
        [proposalId, orgId, documentId, signingUrl ?? null, clientEmail, clientName],
      ).catch((err) => console.error('[integrations:rubrica/send] propostas update failed:', err))

      await logIntegrationEvent(pool, {
        source: 'internal',
        event: 'rubrica.sent',
        proposalId,
        organizationId: orgId,
        payload: { documentId, signingUrl },
      })

      if (mapping.prosync_lead_id) {
        // Best-effort: marca o lead como contactado no ProSync. Não trava o
        // fluxo se a credencial não existir.
        void prosyncFor(req)
          .then((client) =>
            client.updateLead(mapping.prosync_lead_id as string, { status: 'contacted' }),
          )
          .catch((err) =>
            console.error('[integrations:rubrica/send] updateLead contacted failed:', err),
          )

        // Notifica a suíte ProSync via partner endpoint (Fase 4).
        if (suiteProposalEvents?.isEnabled()) {
          const publicTokenRow = await pool
            .query<{ public_token: string | null; valor_cents: number | null; desconto_cents: number | null }>(
              `SELECT public_token, valor_cents, desconto_cents FROM propostas WHERE id::text = $1`,
              [proposalId],
            )
            .catch(() => null)
          const meta = publicTokenRow?.rows?.[0] ?? null
          const baseUrl = config.appUrl.replace(/\/+$/, '')
          const publicUrl = meta?.public_token
            ? `${baseUrl}/p/${meta.public_token}`
            : null
          const valueCents =
            meta?.valor_cents != null
              ? Math.max(0, meta.valor_cents - (meta.desconto_cents || 0))
              : null
          suiteProposalEvents.fireAndForget({
            event: 'proposal.sent',
            externalId: proposalId,
            leadId: String(mapping.prosync_lead_id),
            title,
            publicUrl,
            status: 'sent',
            valueCents,
            currency: 'BRL',
            externalUpdatedAt: new Date(),
            metadata: { documentId, signingUrl },
          })
        }
      }

      if (mail) {
        notifyProposalEventAsync({
          pool,
          mail,
          config: envConfig,
          proposalId,
          type: 'contract_sent',
          metadata: { documentId, signingUrl },
        })
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

      if (mapping.rubrica_document_id && mapping.status !== 'signed') {
        try {
          const client = await rubricaFor(req)
          const live = await client.getSignatureStatus(mapping.rubrica_document_id)
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
      const client = await rubricaFor(req)
      const dl = await client.downloadDocument(mapping.rubrica_document_id, { type: 'signed' })
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
