import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { serializeProposta } from '../db/serializers.js'
import { createOpaqueToken } from '../auth/tokens.js'
import type { SuiteProposalEventsClient } from '../clients/suiteProposalEvents.js'
import type { MailClient } from '../mail/client.js'
import { notifyProposalEventAsync } from '../services/notificationService.js'
import { proposalFlowConfigSchema } from '../validation/proposalFlow.js'
import { acceptContractByOrg } from '../services/proposalJourney.js'

const builderElement = z.object({}).passthrough()

const statusSchema = z.enum(['pendente', 'aprovada', 'recusada'])

const bodySchema = z.object({
  /** UUID gerado no cliente para alinhar cache/link antes do INSERT (opcional). */
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid().optional().nullable(),
  cliente_nome: z.string().max(200).default(''),
  modelo_id: z.string().uuid().optional().nullable(),
  servicos: z.array(z.string().uuid()).default([]),
  valor: z.number().min(0),
  desconto: z.number().min(0).optional(),
  recorrente: z.boolean().optional(),
  ciclo_recorrencia: z.string().max(50).optional().nullable(),
  duracao_recorrencia: z.number().int().optional().nullable(),
  data_envio: z.string().datetime().optional().nullable(),
  data_validade: z.string().datetime().optional().nullable(),
  status: statusSchema.default('pendente'),
  elementos: z.array(builderElement).min(1, 'A proposta precisa de ao menos um elemento visual'),
  contratoTexto: z.string().max(200_000).optional().nullable(),
  contratoId: z.string().uuid().optional().nullable(),
  chavePix: z.string().max(500).optional().nullable(),
  linkPagamento: z.string().max(2000).optional().nullable(),
  pago: z.boolean().default(false),
  data_pagamento: z.string().datetime().optional().nullable(),
  creatorPlan: z.string().max(50).optional().nullable(),
  prosyncLeadId: z.string().max(200).optional().nullable(),
  fluxo: proposalFlowConfigSchema.optional(),
  clienteEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .refine((v) => v == null || v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: 'E-mail do cliente inválido',
    }),
})

const patchSchema = bodySchema.partial()

const PROPOSTA_SELECT = `
  id, cliente_id, cliente_nome, cliente_email, modelo_id, servicos,
  valor_cents, desconto_cents, recorrente, ciclo_recorrencia, duracao_recorrencia,
  data_envio, data_validade, status, elementos, contrato_texto, contrato_id,
  chave_pix, link_pagamento, pago, data_pagamento, creator_plan, public_token,
  prosync_lead_id, rubrica_document_id, rubrica_status, rubrica_signing_url,
  rubrica_signed_pdf_url, rubrica_last_sync_at, viewed_at, created_at,
  fluxo, cliente_contrato_recebido_at, org_contrato_aceito_at, contrato_concluido_at
`

export function createPropostasRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
  mail: MailClient
  /** Emissor de eventos para o ProSync (Fase 4). Opcional. */
  suiteProposalEvents?: SuiteProposalEventsClient
}): Router {
  const { pool, config, mail, suiteProposalEvents } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

  function emitEvent(
    event: Parameters<NonNullable<SuiteProposalEventsClient>['fireAndForget']>[0]['event'],
    proposal: Record<string, any>,
    leadId: string | null | undefined,
    extra: Partial<Parameters<NonNullable<SuiteProposalEventsClient>['fireAndForget']>[0]> = {},
  ): void {
    if (!suiteProposalEvents?.isEnabled()) return
    if (!leadId) return
    const valorCents =
      typeof proposal.valor_cents === 'number' ? proposal.valor_cents : null
    const desconto =
      typeof proposal.desconto_cents === 'number' ? proposal.desconto_cents : 0
    const finalValueCents =
      valorCents != null ? Math.max(0, valorCents - desconto) : null
    const publicUrl = proposal.public_token
      ? `${config.appUrl.replace(/\/+$/, '')}/p/${proposal.public_token}`
      : null
    suiteProposalEvents.fireAndForget({
      event,
      externalId: String(proposal.id),
      leadId,
      title: proposal.cliente_nome
        ? `Proposta para ${proposal.cliente_nome}`
        : `Proposta ${String(proposal.id).slice(0, 8)}`,
      publicUrl,
      valueCents: finalValueCents,
      currency: 'BRL',
      externalUpdatedAt: new Date(),
      ...extra,
    })
  }

  router.get('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT ${PROPOSTA_SELECT} FROM propostas
       WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.auth.orgId],
    )
    return res.json(rows.map(serializeProposta))
  })

  router.get('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT ${PROPOSTA_SELECT} FROM propostas
       WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })
    return res.json(serializeProposta(rows[0]))
  })

  router.post('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    const d = parsed.data
    let clienteEmail = d.clienteEmail?.trim().toLowerCase() ?? ''
    if (!clienteEmail && d.cliente_id) {
      const ce = await pool.query<{ email: string }>(
        `SELECT email FROM clientes WHERE id = $1 AND organization_id = $2`,
        [d.cliente_id, req.auth.orgId],
      )
      clienteEmail = ce.rows[0]?.email?.trim().toLowerCase() ?? ''
    }

    let fluxoJson = JSON.stringify(d.fluxo ?? { steps: ['approve', 'sign', 'pay'] })
    if (!d.fluxo && d.modelo_id) {
      const mf = await pool.query<{ fluxo: unknown }>(
        `SELECT fluxo FROM modelos_propostas WHERE id = $1 AND organization_id = $2`,
        [d.modelo_id, req.auth.orgId],
      )
      if (mf.rows[0]?.fluxo) fluxoJson = JSON.stringify(mf.rows[0].fluxo)
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO propostas (
           id, organization_id, cliente_id, cliente_nome, cliente_email, modelo_id, servicos,
           valor_cents, desconto_cents, recorrente, ciclo_recorrencia, duracao_recorrencia,
           data_envio, data_validade, status, elementos, contrato_texto, contrato_id,
           chave_pix, link_pagamento, pago, data_pagamento, creator_plan, prosync_lead_id, fluxo
         ) VALUES (
           COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7::uuid[],
           $8, $9, $10, $11, $12,
           $13, $14, $15, $16::jsonb, $17, $18,
           $19, $20, $21, $22, $23, $24, $25::jsonb
         )
         RETURNING ${PROPOSTA_SELECT}`,
        [
          d.id ?? null,
          req.auth.orgId,
          d.cliente_id ?? null,
          d.cliente_nome,
          clienteEmail,
          d.modelo_id ?? null,
          d.servicos,
          Math.round(d.valor * 100),
          d.desconto != null ? Math.round(d.desconto * 100) : 0,
          d.recorrente ?? false,
          d.ciclo_recorrencia ?? null,
          d.duracao_recorrencia ?? null,
          d.data_envio ?? null,
          d.data_validade ?? null,
          d.status,
          JSON.stringify(d.elementos),
          d.contratoTexto ?? null,
          d.contratoId ?? null,
          d.chavePix ?? null,
          d.linkPagamento ?? null,
          d.pago,
          d.data_pagamento ?? null,
          d.creatorPlan ?? null,
          d.prosyncLeadId ?? null,
          fluxoJson,
        ],
      )

      // incrementa contador mensal
      const month = new Date().toISOString().slice(0, 7)
      pool
        .query(
          `INSERT INTO usage_counters (organization_id, month_key, propostas)
           VALUES ($1, $2, 1)
           ON CONFLICT (organization_id, month_key)
           DO UPDATE SET propostas = usage_counters.propostas + 1, updated_at = NOW()`,
          [req.auth.orgId, month],
        )
        .catch((err) => console.error('[propostas/create] usage upsert failed:', err))

      const inserted = rows[0]
      const { trackProductEvent } = await import('../services/productEvents.js')
      void trackProductEvent(pool, {
        organizationId: req.auth.orgId,
        userId: req.auth.userId,
        eventName: 'proposal_created',
        metadata: { propostaId: inserted.id },
      })
      emitEvent('proposal.created', inserted, inserted.prosync_lead_id, {
        status: inserted.status ?? 'pendente',
        externalCreatedAt: inserted.created_at ?? new Date(),
      })
      notifyProposalEventAsync({
        pool,
        mail,
        config,
        proposalId: String(inserted.id),
        type: 'proposal_created',
      })
      return res.status(201).json(serializeProposta(inserted))
    } catch (err) {
      console.error('[propostas/create] erro:', err)
      return res.status(500).json({ error: 'Erro ao criar proposta' })
    }
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) {
      console.warn('[propostas/update] payload inválido', {
        proposalId: req.params.id,
        orgId: req.auth.orgId,
      })
      return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    }
    const d = parsed.data
    try {
      const before = await pool.query<{ status: string; pago: boolean }>(
        `SELECT status, pago FROM propostas WHERE organization_id = $1 AND id = $2`,
        [req.auth.orgId, req.params.id],
      )
      if (!before.rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })

      let clienteEmailPatch: string | null = null
      if ('clienteEmail' in d) {
        clienteEmailPatch = d.clienteEmail?.trim().toLowerCase() ?? ''
      }

      const { rows } = await pool.query(
        `UPDATE propostas SET
           cliente_id = CASE WHEN $3::boolean THEN $4 ELSE cliente_id END,
           cliente_nome = COALESCE($5, cliente_nome),
           cliente_email = CASE WHEN $37::boolean THEN $38 ELSE cliente_email END,
           modelo_id = CASE WHEN $6::boolean THEN $7 ELSE modelo_id END,
           servicos = CASE WHEN $8::boolean THEN $9::uuid[] ELSE servicos END,
           valor_cents = COALESCE($10, valor_cents),
           desconto_cents = COALESCE($11, desconto_cents),
           recorrente = COALESCE($12, recorrente),
           ciclo_recorrencia = CASE WHEN $13::boolean THEN $14 ELSE ciclo_recorrencia END,
           duracao_recorrencia = CASE WHEN $15::boolean THEN $16 ELSE duracao_recorrencia END,
           data_envio = CASE WHEN $17::boolean THEN $18 ELSE data_envio END,
           data_validade = CASE WHEN $19::boolean THEN $20 ELSE data_validade END,
           status = COALESCE($21, status),
           elementos = CASE WHEN $22::boolean THEN $23::jsonb ELSE elementos END,
           contrato_texto = CASE WHEN $24::boolean THEN $25 ELSE contrato_texto END,
           contrato_id = CASE WHEN $26::boolean THEN $27 ELSE contrato_id END,
           chave_pix = CASE WHEN $28::boolean THEN $29 ELSE chave_pix END,
           link_pagamento = CASE WHEN $30::boolean THEN $31 ELSE link_pagamento END,
           pago = COALESCE($32, pago),
           data_pagamento = CASE WHEN $33::boolean THEN $34 ELSE data_pagamento END,
           creator_plan = COALESCE($35, creator_plan),
           prosync_lead_id = COALESCE($36, prosync_lead_id)
         WHERE organization_id = $1 AND id = $2
         RETURNING ${PROPOSTA_SELECT}`,
        [
          req.auth.orgId,
          req.params.id,
          'cliente_id' in d,
          d.cliente_id ?? null,
          d.cliente_nome ?? null,
          'modelo_id' in d,
          d.modelo_id ?? null,
          d.servicos !== undefined,
          d.servicos ?? null,
          d.valor != null ? Math.round(d.valor * 100) : null,
          d.desconto != null ? Math.round(d.desconto * 100) : null,
          d.recorrente ?? null,
          'ciclo_recorrencia' in d,
          d.ciclo_recorrencia ?? null,
          'duracao_recorrencia' in d,
          d.duracao_recorrencia ?? null,
          'data_envio' in d,
          d.data_envio ?? null,
          'data_validade' in d,
          d.data_validade ?? null,
          d.status ?? null,
          d.elementos !== undefined,
          d.elementos !== undefined ? JSON.stringify(d.elementos) : null,
          'contratoTexto' in d,
          d.contratoTexto ?? null,
          'contratoId' in d,
          d.contratoId ?? null,
          'chavePix' in d,
          d.chavePix ?? null,
          'linkPagamento' in d,
          d.linkPagamento ?? null,
          d.pago ?? null,
          'data_pagamento' in d,
          d.data_pagamento ?? null,
          d.creatorPlan ?? null,
          d.prosyncLeadId ?? null,
          'clienteEmail' in d,
          clienteEmailPatch,
        ],
      )
      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })
      const updated = rows[0]
      const status = String(updated.status ?? '')
      const prevStatus = String(before.rows[0].status ?? '')
      const prevPago = !!before.rows[0].pago

      if (updated.prosync_lead_id) {
        if (status === 'aprovada') {
          emitEvent('proposal.approved', updated, updated.prosync_lead_id, { status })
        } else if (status === 'recusada') {
          emitEvent('proposal.rejected', updated, updated.prosync_lead_id, { status })
        }
      }

      const proposalId = String(updated.id)
      if (status === 'aprovada' && prevStatus !== 'aprovada') {
        notifyProposalEventAsync({ pool, mail, config, proposalId, type: 'proposal_approved' })
      } else if (status === 'recusada' && prevStatus !== 'recusada') {
        notifyProposalEventAsync({ pool, mail, config, proposalId, type: 'proposal_rejected' })
      }
      if (updated.pago && !prevPago) {
        notifyProposalEventAsync({ pool, mail, config, proposalId, type: 'proposal_paid' })
      }

      return res.json(serializeProposta(updated))
    } catch (err) {
      console.error('[propostas/update] erro:', err)
      return res.status(500).json({ error: 'Erro ao atualizar proposta' })
    }
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rowCount } = await pool.query(
      `DELETE FROM propostas WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rowCount) return res.status(404).json({ error: 'Proposta não encontrada' })
    return res.json({ ok: true })
  })

  /**
   * Gera / retorna o public_token da proposta, usado pelo cliente final via
   * `/p/{token}` sem autenticação.
   */
  router.post('/:id/public-link', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    try {
      const existing = await pool.query<{ public_token: string | null }>(
        `SELECT public_token FROM propostas WHERE organization_id = $1 AND id = $2`,
        [req.auth.orgId, req.params.id],
      )
      if (!existing.rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })
      let token = existing.rows[0].public_token
      if (!token) {
        token = createOpaqueToken(24)
        await pool.query(
          `UPDATE propostas SET public_token = $3 WHERE organization_id = $1 AND id = $2`,
          [req.auth.orgId, req.params.id, token],
        )
      }
      return res.json({
        token,
        url: `${config.appUrl.replace(/\/+$/, '')}/p/${token}`,
      })
    } catch (err) {
      console.error('[propostas/public-link] erro:', err)
      return res.status(500).json({ error: 'Erro ao gerar link público' })
    }
  })

  router.delete('/:id/public-link', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    await pool.query(
      `UPDATE propostas SET public_token = NULL WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    return res.json({ ok: true })
  })

  router.post('/:id/accept-contract', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const result = await acceptContractByOrg({
      pool,
      proposalId: req.params.id,
      organizationId: req.auth.orgId,
      envConfig: config,
      mail,
    })
    if (!result.ok) {
      return res.status(result.status ?? 400).json({ error: result.error })
    }
    const { rows } = await pool.query(
      `SELECT ${PROPOSTA_SELECT} FROM propostas WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })
    return res.json(serializeProposta(rows[0]))
  })

  return router
}
