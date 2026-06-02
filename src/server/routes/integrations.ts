import express from 'express'
import type { Router, Request, Response } from 'express'
import type { Pool } from 'pg'
import { createProsyncClient, ProsyncHttpError } from '../clients/prosyncClient.js'
import type { IntegrationsConfig } from '../config.js'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import {
  logIntegrationEvent,
} from '../db/mappings.js'
import type { EnsureSuiteCredential } from '../integrations/ensureSuiteCredential.js'
import type { OrgIntegrationCredentialsRepo } from '../storage/orgIntegrationCredentials.js'
import type { SuiteApp } from '../clients/suiteLookup.js'
import type { SuiteProposalEventsClient } from '../clients/suiteProposalEvents.js'
import { isSecretCryptoAvailable } from '../lib/secretCrypto.js'
import { resolveIntegrationForOrg } from '../integrations/resolveIntegrationCredential.js'
import {
  keyPrefixFrom,
  normalizeBaseUrl,
  validateApiKeyFormat,
  verifyUpstreamCredential,
} from '../integrations/credentialValidation.js'

/**
 * Router de `/api/integrations/*`. Todas as rotas requerem auth e fazem proxy
 * para ProSync carregando as API keys apenas no servidor.
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
}): Router {
  const router = express.Router()
  const {
    pool,
    config,
    envConfig,
    ensureSuiteCredential,
    orgCredentialsRepo,
    suiteProposalEvents,
  } = deps

  router.use(buildRequireAuth(envConfig.auth))

  function parseProvider(param: string): SuiteApp | null {
    const p = param.toLowerCase()
    if (p === 'prosync') return p
    return null
  }

  function displayBaseUrl(cred: Awaited<ReturnType<OrgIntegrationCredentialsRepo['getCredential']>>): string {
    if (cred?.apiBaseUrl) return cred.apiBaseUrl.replace(/\/+$/, '')
    return config.prosync.baseUrl
  }

  // --------------------------------------------------------------------------
  // GET /api/integrations/credentials
  // Lista credenciais (sem segredos) para a organização atual.
  // --------------------------------------------------------------------------
  router.get('/credentials', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    if (!orgCredentialsRepo) {
      return res.json({
        providers: [],
        suiteEnabled: false,
        canSaveManual: false,
      })
    }
    const orgId = req.auth.orgId
    try {
      const prosync = await orgCredentialsRepo.getCredential(orgId, 'prosync')
      const summarize = (c: Awaited<ReturnType<typeof orgCredentialsRepo.getCredential>>) =>
        c
          ? {
              configured: true,
              source: c.source,
              keyPrefix: c.keyPrefix,
              apiBaseUrl: displayBaseUrl(c),
              externalUserId: c.externalUserId,
              externalOrgId: c.externalOrgId,
              scopes: c.scopes,
              lastVerifiedAt: c.lastVerifiedAt,
            }
          : { configured: false }
      return res.json({
        suiteEnabled: Boolean(config.suiteSecret),
        canSaveManual: isSecretCryptoAvailable(),
        prosync: summarize(prosync),
      })
    } catch (err) {
      console.error('[integrations/credentials] list erro:', err)
      return res.status(500).json({ error: 'Erro ao listar credenciais' })
    }
  })

  // --------------------------------------------------------------------------
  // PUT /api/integrations/credentials/:provider — salvar chave manual (por org)
  // --------------------------------------------------------------------------
  router.put('/credentials/:provider', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    if (!orgCredentialsRepo) {
      return res.status(503).json({ error: 'Credenciais por organização indisponíveis' })
    }
    if (!isSecretCryptoAvailable()) {
      return res.status(503).json({
        error:
          'Cifra indisponível: defina JWT_SECRET (>= 32 chars), CREDENTIALS_KEY ou TAGGO_SUITE_SECRET no servidor.',
      })
    }

    const provider = parseProvider(String(req.params.provider || ''))
    if (!provider) {
      return res.status(400).json({ error: 'provider deve ser prosync' })
    }

    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : ''
    const formatErr = validateApiKeyFormat(provider, apiKey)
    if (formatErr) return res.status(400).json({ error: formatErr })

    const defaultUrl = config.prosync.baseUrl
    let baseUrl: string
    try {
      baseUrl = normalizeBaseUrl(
        typeof req.body?.apiBaseUrl === 'string' ? req.body.apiBaseUrl : null,
        defaultUrl,
      )
    } catch (err) {
      return res.status(400).json({
        error: err instanceof Error ? err.message : 'URL inválida',
      })
    }

    const verify = await verifyUpstreamCredential(provider, apiKey, baseUrl)
    if (verify.ok !== true) {
      return res.status(400).json({ error: verify.error })
    }

    try {
      await orgCredentialsRepo.saveCredential({
        organizationId: req.auth.orgId,
        provider,
        apiKey,
        apiBaseUrl: baseUrl,
        keyPrefix: keyPrefixFrom(apiKey),
        source: 'manual',
      })
      return res.json({
        configured: true,
        provider,
        source: 'manual',
        keyPrefix: keyPrefixFrom(apiKey),
        apiBaseUrl: baseUrl,
      })
    } catch (err) {
      console.error(`[integrations/credentials/${provider}] PUT erro:`, err)
      return res.status(500).json({ error: 'Erro ao salvar credencial' })
    }
  })

  // --------------------------------------------------------------------------
  // POST /api/integrations/credentials/:provider/verify
  // --------------------------------------------------------------------------
  router.post('/credentials/:provider/verify', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    const provider = parseProvider(String(req.params.provider || ''))
    if (!provider) {
      return res.status(400).json({ error: 'provider deve ser prosync' })
    }

    const defaultUrl = config.prosync.baseUrl
    let apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : ''
    let baseUrl: string

    if (!apiKey && orgCredentialsRepo) {
      const resolved = await resolveIntegrationForOrg({
        provider,
        organizationId: req.auth.orgId,
        ownerEmail: req.auth.email,
        config,
        orgCredentialsRepo,
        ensureSuiteCredential,
      })
      if (!resolved) {
        return res.status(404).json({ error: 'Nenhuma credencial configurada para testar' })
      }
      apiKey = resolved.apiKey
      baseUrl = resolved.baseUrl
    } else {
      const formatErr = validateApiKeyFormat(provider, apiKey)
      if (formatErr) return res.status(400).json({ error: formatErr })
      try {
        baseUrl = normalizeBaseUrl(
          typeof req.body?.apiBaseUrl === 'string' ? req.body.apiBaseUrl : null,
          defaultUrl,
        )
      } catch (err) {
        return res.status(400).json({
          error: err instanceof Error ? err.message : 'URL inválida',
        })
      }
    }

    const verify = await verifyUpstreamCredential(provider, apiKey, baseUrl)
    if (verify.ok !== true) {
      return res.status(400).json({ ok: false, error: verify.error })
    }
    return res.json({ ok: true, provider, apiBaseUrl: baseUrl })
  })

  // --------------------------------------------------------------------------
  // DELETE /api/integrations/credentials/:provider
  // --------------------------------------------------------------------------
  router.delete('/credentials/:provider', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).json({ error: 'Não autenticado' })
    if (!orgCredentialsRepo) {
      return res.status(503).json({ error: 'Credenciais por organização indisponíveis' })
    }
    const provider = parseProvider(String(req.params.provider || ''))
    if (!provider) {
      return res.status(400).json({ error: 'provider deve ser prosync' })
    }
    try {
      await orgCredentialsRepo.deleteCredential(req.auth.orgId, provider)
      return res.json({ ok: true, provider })
    } catch (err) {
      console.error(`[integrations/credentials/${provider}] DELETE erro:`, err)
      return res.status(500).json({ error: 'Erro ao remover credencial' })
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
    if (provider !== 'prosync') {
      return res.status(400).json({ error: 'provider deve ser prosync' })
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

  async function integrationFor(req: Request, provider: SuiteApp) {
    const orgId = req.auth?.orgId
    const email = req.auth?.email
    if (!orgId) throw new Error('Sem organização autenticada')

    const resolved = await resolveIntegrationForOrg({
      provider,
      organizationId: orgId,
      ownerEmail: email,
      config,
      orgCredentialsRepo,
      ensureSuiteCredential,
    })
    if (!resolved) {
      const label = provider === 'prosync' ? 'ProSync' : 'Rubrica'
      throw new Error(
        `${label} não configurado: conecte em Configurações → Integrações ou use a suíte Taggo.`,
      )
    }
    return resolved
  }

  async function prosyncFor(req: Request) {
    const { apiKey, baseUrl } = await integrationFor(req, 'prosync')
    return createProsyncClient({ baseUrl, apiKey })
  }

  function handleUpstreamError(res: Response, err: unknown, label: string) {
    if (err instanceof ProsyncHttpError) {
      res.status(err.status >= 400 && err.status < 600 ? err.status : 502).json({
        error: err.message,
        upstream: label,
        body: err.body,
      })
      return
    }
    const message = err instanceof Error ? err.message : String(err)
    const code = err instanceof Error && 'code' in err ? String((err as { code?: unknown }).code ?? '') : ''
    const isNotConfigured = /não configurado/i.test(message)
    const isDns = code === 'ENOTFOUND' || /ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)
    const isTimeout = code === 'ABORT_ERR' || /aborted|timeout/i.test(message)
    const userMessage = isDns
      ? 'Falha de DNS ao acessar integração externa'
      : isTimeout
        ? 'Timeout ao acessar integração externa'
        : message || 'Upstream error'

    if (isNotConfigured) {
      res.status(424).json({
        error: userMessage,
        upstream: label,
        code: 'integration_not_configured',
      })
      return
    }

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

  return router
}
