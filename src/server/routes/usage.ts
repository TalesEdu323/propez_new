import express from 'express'
import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import type { EnvironmentConfig } from '../env.js'
import { buildRequireAuth } from '../auth/middleware.js'

export function createUsageRouter(deps: {
  pool: Pool
  config: EnvironmentConfig
}): Router {
  const { pool, config } = deps
  const router = express.Router()
  router.use(buildRequireAuth(config.auth))

  router.get('/current', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const month = new Date().toISOString().slice(0, 7)
    const { rows } = await pool.query(
      `SELECT month_key, propostas, ia_geracoes, rubrica_assinaturas
       FROM usage_counters WHERE organization_id = $1 AND month_key = $2`,
      [req.auth.orgId, month],
    )
    const r = rows[0]
    return res.json({
      monthKey: month,
      propostasThisMonth: Number(r?.propostas ?? 0),
      iaGeracoesThisMonth: Number(r?.ia_geracoes ?? 0),
      rubricaAssinaturasThisMonth: Number(r?.rubrica_assinaturas ?? 0),
    })
  })

  router.post('/increment', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end()
    const key = String((req.body?.key ?? '') as string)
    const delta = Number(req.body?.delta ?? 1)
    const column =
      key === 'ia_geracoes'
        ? 'ia_geracoes'
        : key === 'rubrica_assinaturas'
          ? 'rubrica_assinaturas'
          : key === 'propostas'
            ? 'propostas'
            : null
    if (!column) return res.status(400).json({ error: 'key inválido' })
    if (!Number.isFinite(delta) || delta <= 0) return res.status(400).json({ error: 'delta inválido' })

    const month = new Date().toISOString().slice(0, 7)
    await pool.query(
      `INSERT INTO usage_counters (organization_id, month_key, ${column})
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, month_key)
       DO UPDATE SET ${column} = usage_counters.${column} + $3, updated_at = NOW()`,
      [req.auth.orgId, month, delta],
    )
    return res.json({ ok: true })
  })

  return router
}
