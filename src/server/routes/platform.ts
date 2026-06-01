import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import { getAllRequestFlowConfigs } from '../services/platformSettings.js';

export function createPlatformRouter(deps: { pool: Pool }): Router {
  const { pool } = deps;
  const router = express.Router();

  router.get('/request-config', async (_req: Request, res: Response) => {
    try {
      const configs = await getAllRequestFlowConfigs(pool);
      return res.json(configs);
    } catch (err) {
      console.error('[platform/request-config] erro:', err);
      return res.status(500).json({ error: 'Erro ao carregar configuração' });
    }
  });

  return router;
}
