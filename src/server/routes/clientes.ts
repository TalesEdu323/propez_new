import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import { z } from 'zod'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'
import { serializeCliente } from '../db/serializers.js'

const bodySchema = z.object({
  nome: z.string().trim().min(1).max(200),
  empresa: z.string().trim().max(200).default(''),
  email: z.string().trim().max(200).default(''),
  telefone: z.string().trim().max(50).default(''),
})

const patchSchema = bodySchema.partial()

export function createClientesRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

  router.get('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    try {
      const { rows } = await pool.query(
        `SELECT id, nome, empresa, email, telefone, created_at
         FROM clientes WHERE organization_id = $1
         ORDER BY created_at DESC`,
        [req.auth.orgId],
      )
      return res.json(rows.map(serializeCliente))
    } catch (err) {
      console.error('[clientes/list] erro:', err)
      return res.status(500).json({ error: 'Erro ao listar clientes' })
    }
  })

  router.get('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    try {
      const { rows } = await pool.query(
        `SELECT id, nome, empresa, email, telefone, created_at
         FROM clientes WHERE organization_id = $1 AND id = $2`,
        [req.auth.orgId, req.params.id],
      )
      if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' })
      return res.json(serializeCliente(rows[0]))
    } catch (err) {
      console.error('[clientes/get] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar cliente' })
    }
  })

  router.post('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() })
    const d = parsed.data
    try {
      const { rows } = await pool.query(
        `INSERT INTO clientes (organization_id, nome, empresa, email, telefone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, empresa, email, telefone, created_at`,
        [req.auth.orgId, d.nome, d.empresa, d.email, d.telefone],
      )
      return res.status(201).json(serializeCliente(rows[0]))
    } catch (err) {
      console.error('[clientes/create] erro:', err)
      return res.status(500).json({ error: 'Erro ao criar cliente' })
    }
  })

  router.patch('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' })
    const d = parsed.data
    try {
      const { rows } = await pool.query(
        `UPDATE clientes SET
           nome = COALESCE($3, nome),
           empresa = COALESCE($4, empresa),
           email = COALESCE($5, email),
           telefone = COALESCE($6, telefone)
         WHERE organization_id = $1 AND id = $2
         RETURNING id, nome, empresa, email, telefone, created_at`,
        [
          req.auth.orgId,
          req.params.id,
          d.nome ?? null,
          d.empresa ?? null,
          d.email ?? null,
          d.telefone ?? null,
        ],
      )
      if (!rows[0]) return res.status(404).json({ error: 'Cliente não encontrado' })
      return res.json(serializeCliente(rows[0]))
    } catch (err) {
      console.error('[clientes/update] erro:', err)
      return res.status(500).json({ error: 'Erro ao atualizar cliente' })
    }
  })

  router.delete('/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM clientes WHERE organization_id = $1 AND id = $2`,
        [req.auth.orgId, req.params.id],
      )
      if (!rowCount) return res.status(404).json({ error: 'Cliente não encontrado' })
      return res.json({ ok: true })
    } catch (err) {
      console.error('[clientes/delete] erro:', err)
      return res.status(500).json({ error: 'Erro ao remover cliente' })
    }
  })

  return router
}
