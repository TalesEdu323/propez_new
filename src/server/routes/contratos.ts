import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { serializeContrato } from '../db/serializers.js'

const bodySchema = z.object({
  titulo: z.string().trim().min(1).max(200),
  texto: z.string().max(200_000).default(''),
})

const patchSchema = bodySchema.partial()

export function createContratosRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

  router.get('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT id, titulo, texto, created_at FROM contratos_templates
       WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.auth.orgId],
    )
    return res.json(rows.map(serializeContrato))
  })

  router.get('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rows } = await pool.query(
      `SELECT id, titulo, texto, created_at FROM contratos_templates
       WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Contrato não encontrado' })
    return res.json(serializeContrato(rows[0]))
  })

  router.post('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const d = parsed.data
    const { rows } = await pool.query(
      `INSERT INTO contratos_templates (organization_id, titulo, texto)
       VALUES ($1, $2, $3)
       RETURNING id, titulo, texto, created_at`,
      [req.auth.orgId, d.titulo, d.texto],
    )
    return res.status(201).json(serializeContrato(rows[0]))
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const d = parsed.data
    const { rows } = await pool.query(
      `UPDATE contratos_templates SET
         titulo = COALESCE($3, titulo),
         texto = COALESCE($4, texto)
       WHERE organization_id = $1 AND id = $2
       RETURNING id, titulo, texto, created_at`,
      [req.auth.orgId, req.params.id, d.titulo ?? null, d.texto ?? null],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Contrato não encontrado' })
    return res.json(serializeContrato(rows[0]))
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const { rowCount } = await pool.query(
      `DELETE FROM contratos_templates WHERE organization_id = $1 AND id = $2`,
      [req.auth.orgId, req.params.id],
    )
    if (!rowCount) return res.status(404).json({ error: 'Contrato não encontrado' })
    return res.json({ ok: true })
  })

  return router
}
