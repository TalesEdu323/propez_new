import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { serializeModelo, serializeModeloSummary } from '../db/serializers.js'
import { fetchOrgBrand, mergePageLayoutWithOrgBrand } from '../services/orgBrandDefaults.js'
import { modeloBodySchema, modeloPatchSchema } from '../validation/modeloPayload.js'

const MODEL_SELECT = `id, nome, elementos, page_layout, servicos, contrato_id, contrato_texto,
              chave_pix, link_pagamento, whatsapp_comprovante, tier, fluxo, signature_config, created_at`

const MODEL_SUMMARY_SELECT = `id, nome, servicos, contrato_id, chave_pix, link_pagamento,
              whatsapp_comprovante, tier, fluxo, created_at`

const MODEL_WRITE_RETURN = `id, nome, servicos, contrato_id, chave_pix, link_pagamento,
              whatsapp_comprovante, tier, fluxo, created_at`

const bodySchema = modeloBodySchema
const patchSchema = modeloPatchSchema

export function createModelosRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

  router.get('/summary', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT ${MODEL_SUMMARY_SELECT}
       FROM modelos_propostas
       WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.auth.orgId],
    )
    return res.json(rows.map(serializeModeloSummary))
  })

  router.get('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const summary = req.query.fields === 'summary'
    const select = summary ? MODEL_SUMMARY_SELECT : MODEL_SELECT
    const mapper = summary ? serializeModeloSummary : serializeModelo
    const { rows } = await pool.query(
      `SELECT ${select}
       FROM modelos_propostas
       WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.auth.orgId],
    )
    return res.json(rows.map(mapper))
  })

  router.get('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT ${MODEL_SELECT}
       FROM modelos_propostas
       WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Modelo não encontrado' })
    return res.json(serializeModelo(rows[0]))
  })

  router.post('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    const d = parsed.data
    const orgBrand = await fetchOrgBrand(pool, req.auth.orgId)
    const pageLayout = mergePageLayoutWithOrgBrand(
      d.pageLayout as Record<string, unknown> | undefined,
      orgBrand,
    )
    const { rows } = await pool.query(
      `INSERT INTO modelos_propostas
         (organization_id, nome, elementos, page_layout, servicos, contrato_id, contrato_texto,
          chave_pix, link_pagamento, whatsapp_comprovante, tier, fluxo, signature_config)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::uuid[], $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb)
       RETURNING ${MODEL_WRITE_RETURN}`,
      [
        req.auth.orgId,
        d.nome,
        JSON.stringify(d.elementos),
        JSON.stringify(pageLayout),
        d.servicos,
        d.contratoId ?? null,
        d.contratoTexto ?? null,
        d.chavePix ?? null,
        d.linkPagamento ?? null,
        d.whatsappComprovante ?? null,
        d.tier,
        JSON.stringify(d.fluxo ?? { steps: ['approve', 'sign', 'pay'] }),
        d.signatureConfig != null ? JSON.stringify(d.signatureConfig) : null,
      ],
    )
    return res.status(201).json(serializeModeloSummary(rows[0]))
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    const d = parsed.data
    const { rows } = await pool.query(
      `UPDATE modelos_propostas SET
         nome = COALESCE($3, nome),
         elementos = CASE WHEN $4::boolean THEN $5::jsonb ELSE elementos END,
         page_layout = CASE WHEN $6::boolean THEN $7::jsonb ELSE page_layout END,
         servicos = CASE WHEN $8::boolean THEN $9::uuid[] ELSE servicos END,
         contrato_id = CASE WHEN $10::boolean THEN $11 ELSE contrato_id END,
         contrato_texto = CASE WHEN $12::boolean THEN $13 ELSE contrato_texto END,
         chave_pix = CASE WHEN $14::boolean THEN $15 ELSE chave_pix END,
         link_pagamento = CASE WHEN $16::boolean THEN $17 ELSE link_pagamento END,
         whatsapp_comprovante = CASE WHEN $18::boolean THEN $19 ELSE whatsapp_comprovante END,
         tier = COALESCE($20, tier),
         fluxo = CASE WHEN $21::boolean THEN $22::jsonb ELSE fluxo END,
         signature_config = CASE WHEN $23::boolean THEN $24::jsonb ELSE signature_config END
       WHERE organization_id = $1 AND id = $2
       RETURNING ${MODEL_WRITE_RETURN}`,
      [
        req.auth.orgId,
        req.params.id,
        d.nome ?? null,
        d.elementos !== undefined,
        d.elementos !== undefined ? JSON.stringify(d.elementos) : null,
        d.pageLayout !== undefined,
        d.pageLayout !== undefined ? JSON.stringify(d.pageLayout) : null,
        d.servicos !== undefined,
        d.servicos ?? null,
        'contratoId' in d,
        d.contratoId ?? null,
        'contratoTexto' in d,
        d.contratoTexto ?? null,
        'chavePix' in d,
        d.chavePix ?? null,
        'linkPagamento' in d,
        d.linkPagamento ?? null,
        'whatsappComprovante' in d,
        d.whatsappComprovante ?? null,
        d.tier ?? null,
        d.fluxo !== undefined,
        d.fluxo !== undefined ? JSON.stringify(d.fluxo) : null,
        d.signatureConfig !== undefined,
        d.signatureConfig !== undefined ? JSON.stringify(d.signatureConfig) : null,
      ],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Modelo não encontrado' })
    return res.json(serializeModeloSummary(rows[0]))
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rowCount } = await pool.query(
      `DELETE FROM modelos_propostas WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rowCount) return res.status(404).json({ error: 'Modelo não encontrado' })
    return res.json({ ok: true })
  })

  return router
}
