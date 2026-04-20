import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { serializeModelo } from '../db/serializers.js'

const builderElement = z.object({}).passthrough()

const bodySchema = z.object({
  nome: z.string().trim().min(1).max(200),
  elementos: z.array(builderElement).default([]),
  servicos: z.array(z.string().uuid()).default([]),
  contratoId: z.string().uuid().optional().nullable(),
  contratoTexto: z.string().max(200_000).optional().nullable(),
  chavePix: z.string().max(500).optional().nullable(),
  linkPagamento: z.string().max(2000).optional().nullable(),
  tier: z.enum(['free', 'pro', 'business']).default('free'),
})

const patchSchema = bodySchema.partial()

export function createModelosRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

  router.get('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT id, nome, elementos, servicos, contrato_id, contrato_texto,
              chave_pix, link_pagamento, tier, created_at
       FROM modelos_propostas
       WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.auth.orgId],
    )
    return res.json(rows.map(serializeModelo))
  })

  router.get('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT id, nome, elementos, servicos, contrato_id, contrato_texto,
              chave_pix, link_pagamento, tier, created_at
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
    const { rows } = await pool.query(
      `INSERT INTO modelos_propostas
         (organization_id, nome, elementos, servicos, contrato_id, contrato_texto,
          chave_pix, link_pagamento, tier)
       VALUES ($1, $2, $3::jsonb, $4::uuid[], $5, $6, $7, $8, $9)
       RETURNING id, nome, elementos, servicos, contrato_id, contrato_texto,
                 chave_pix, link_pagamento, tier, created_at`,
      [
        req.auth.orgId,
        d.nome,
        JSON.stringify(d.elementos),
        d.servicos,
        d.contratoId ?? null,
        d.contratoTexto ?? null,
        d.chavePix ?? null,
        d.linkPagamento ?? null,
        d.tier,
      ],
    )
    return res.status(201).json(serializeModelo(rows[0]))
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const d = parsed.data
    const { rows } = await pool.query(
      `UPDATE modelos_propostas SET
         nome = COALESCE($3, nome),
         elementos = CASE WHEN $4::boolean THEN $5::jsonb ELSE elementos END,
         servicos = CASE WHEN $6::boolean THEN $7::uuid[] ELSE servicos END,
         contrato_id = CASE WHEN $8::boolean THEN $9 ELSE contrato_id END,
         contrato_texto = CASE WHEN $10::boolean THEN $11 ELSE contrato_texto END,
         chave_pix = CASE WHEN $12::boolean THEN $13 ELSE chave_pix END,
         link_pagamento = CASE WHEN $14::boolean THEN $15 ELSE link_pagamento END,
         tier = COALESCE($16, tier)
       WHERE organization_id = $1 AND id = $2
       RETURNING id, nome, elementos, servicos, contrato_id, contrato_texto,
                 chave_pix, link_pagamento, tier, created_at`,
      [
        req.auth.orgId,
        req.params.id,
        d.nome ?? null,
        d.elementos !== undefined,
        d.elementos !== undefined ? JSON.stringify(d.elementos) : null,
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
        d.tier ?? null,
      ],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Modelo não encontrado' })
    return res.json(serializeModelo(rows[0]))
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
