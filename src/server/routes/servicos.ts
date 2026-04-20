import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { serializeServico } from '../db/serializers.js'

const bodySchema = z.object({
  nome: z.string().trim().min(1).max(200),
  descricao: z.string().max(4000).default(''),
  valor: z.number().finite().min(0),
  tipo: z.enum(['unico', 'recorrente']),
  contratoId: z.string().uuid().optional().nullable(),
})

const patchSchema = bodySchema.partial()

export function createServicosRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

  router.get('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT id, nome, descricao, valor_cents, tipo, contrato_id, created_at
       FROM servicos WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.auth.orgId],
    )
    return res.json(rows.map(serializeServico))
  })

  router.get('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT id, nome, descricao, valor_cents, tipo, contrato_id, created_at
       FROM servicos WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Serviço não encontrado' })
    return res.json(serializeServico(rows[0]))
  })

  router.post('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    const d = parsed.data
    const { rows } = await pool.query(
      `INSERT INTO servicos (organization_id, nome, descricao, valor_cents, tipo, contrato_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, descricao, valor_cents, tipo, contrato_id, created_at`,
      [req.auth.orgId, d.nome, d.descricao, Math.round(d.valor * 100), d.tipo, d.contratoId ?? null],
    )
    return res.status(201).json(serializeServico(rows[0]))
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const d = parsed.data
    const { rows } = await pool.query(
      `UPDATE servicos SET
         nome = COALESCE($3, nome),
         descricao = COALESCE($4, descricao),
         valor_cents = COALESCE($5, valor_cents),
         tipo = COALESCE($6, tipo),
         contrato_id = CASE WHEN $7::boolean THEN $8 ELSE contrato_id END
       WHERE organization_id = $1 AND id = $2
       RETURNING id, nome, descricao, valor_cents, tipo, contrato_id, created_at`,
      [
        req.auth.orgId,
        req.params.id,
        d.nome ?? null,
        d.descricao ?? null,
        d.valor != null ? Math.round(d.valor * 100) : null,
        d.tipo ?? null,
        'contratoId' in d,
        d.contratoId ?? null,
      ],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Serviço não encontrado' })
    return res.json(serializeServico(rows[0]))
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rowCount } = await pool.query(
      `DELETE FROM servicos WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rowCount) return res.status(404).json({ error: 'Serviço não encontrado' })
    return res.json({ ok: true })
  })

  return router
}
