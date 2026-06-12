import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { EnvironmentConfig } from '../env.js';
import { buildRequireAuth } from '../auth/middleware.js';
import { getRequestFlowConfig } from '../services/platformSettings.js';

const createSchema = z.object({
  type: z.enum(['whitelabel', 'enterprise']),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export function createRequestsRouter(deps: {
  pool: Pool;
  config: EnvironmentConfig;
}): Router {
  const { pool, config } = deps;
  const router = express.Router();
  const requireAuth = buildRequireAuth(config.auth);

  router.use(requireAuth);

  router.get('/mine', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    try {
      const { rows } = await pool.query(
        `SELECT id, type, status, payload, admin_notes, created_at, reviewed_at
         FROM service_requests
         WHERE organization_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [req.auth.orgId],
      );
      return res.json(
        rows.map((r) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          payload: r.payload,
          adminNotes: r.admin_notes,
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at,
        })),
      );
    } catch (err) {
      console.error('[requests/mine] erro:', err);
      return res.status(500).json({ error: 'Erro ao listar solicitações' });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

    const { type, payload } = parsed.data;
    try {
      const flow = await getRequestFlowConfig(pool, type);
      if (flow.mode !== 'native') {
        return res.status(400).json({
          error: 'Este tipo de solicitação usa formulário externo. Use o link configurado.',
        });
      }

      const { rows: pending } = await pool.query(
        `SELECT id FROM service_requests
         WHERE organization_id = $1 AND type = $2 AND status = 'pending'
         LIMIT 1`,
        [req.auth.orgId, type],
      );
      if (pending[0]) {
        return res.status(409).json({ error: 'Já existe uma solicitação pendente deste tipo.' });
      }

      const { rows } = await pool.query(
        `INSERT INTO service_requests (organization_id, user_id, type, payload)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id, type, status, created_at`,
        [req.auth.orgId, req.auth.userId, type, JSON.stringify(payload)],
      );
      const row = rows[0];
      return res.status(201).json({
        id: row.id,
        type: row.type,
        status: row.status,
        createdAt: row.created_at,
      });
    } catch (err) {
      console.error('[requests/create] erro:', err);
      return res.status(500).json({ error: 'Erro ao enviar solicitação' });
    }
  });

  return router;
}
