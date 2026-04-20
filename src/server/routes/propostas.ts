import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { serializeProposta } from '../db/serializers.js'
import { createOpaqueToken } from '../auth/tokens.js'

const builderElement = z.object({}).passthrough()

const statusSchema = z.enum(['pendente', 'aprovada', 'recusada'])

const bodySchema = z.object({
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
  elementos: z.array(builderElement).default([]),
  contratoTexto: z.string().max(200_000).optional().nullable(),
  contratoId: z.string().uuid().optional().nullable(),
  chavePix: z.string().max(500).optional().nullable(),
  linkPagamento: z.string().max(2000).optional().nullable(),
  pago: z.boolean().default(false),
  data_pagamento: z.string().datetime().optional().nullable(),
  creatorPlan: z.string().max(50).optional().nullable(),
  prosyncLeadId: z.string().max(200).optional().nullable(),
})

const patchSchema = bodySchema.partial()

const PROPOSTA_SELECT = `
  id, cliente_id, cliente_nome, modelo_id, servicos,
  valor_cents, desconto_cents, recorrente, ciclo_recorrencia, duracao_recorrencia,
  data_envio, data_validade, status, elementos, contrato_texto, contrato_id,
  chave_pix, link_pagamento, pago, data_pagamento, creator_plan, public_token,
  prosync_lead_id, rubrica_document_id, rubrica_status, rubrica_signing_url,
  rubrica_signed_pdf_url, rubrica_last_sync_at, created_at
`

export function createPropostasRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

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
    try {
      const { rows } = await pool.query(
        `INSERT INTO propostas (
           organization_id, cliente_id, cliente_nome, modelo_id, servicos,
           valor_cents, desconto_cents, recorrente, ciclo_recorrencia, duracao_recorrencia,
           data_envio, data_validade, status, elementos, contrato_texto, contrato_id,
           chave_pix, link_pagamento, pago, data_pagamento, creator_plan, prosync_lead_id
         ) VALUES (
           $1, $2, $3, $4, $5::uuid[],
           $6, $7, $8, $9, $10,
           $11, $12, $13, $14::jsonb, $15, $16,
           $17, $18, $19, $20, $21, $22
         )
         RETURNING ${PROPOSTA_SELECT}`,
        [
          req.auth.orgId,
          d.cliente_id ?? null,
          d.cliente_nome,
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

      return res.status(201).json(serializeProposta(rows[0]))
    } catch (err) {
      console.error('[propostas/create] erro:', err)
      return res.status(500).json({ error: 'Erro ao criar proposta' })
    }
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const d = parsed.data
    try {
      const { rows } = await pool.query(
        `UPDATE propostas SET
           cliente_id = CASE WHEN $3::boolean THEN $4 ELSE cliente_id END,
           cliente_nome = COALESCE($5, cliente_nome),
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
        ],
      )
      if (!rows[0]) return res.status(404).json({ error: 'Proposta não encontrada' })
      return res.json(serializeProposta(rows[0]))
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

  return router
}
