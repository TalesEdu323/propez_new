import express from 'express';
import type { Request, Response, Router } from 'express';
import type pg from 'pg';
import type { IntegrationsConfig } from '../config.js';

export interface HealthRouterOptions {
  pool: pg.Pool;
  integrationsConfig: IntegrationsConfig;
}

export function createHealthRouter({ pool, integrationsConfig }: HealthRouterOptions): Router {
  const router = express.Router();

  router.get('/health', async (_req: Request, res: Response) => {
    let dbStatus = false;
    let client: pg.PoolClient | null = null;
    try {
      client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      dbStatus = !!result.rows[0];
    } catch (err) {
      console.error('Database connection error:', err);
    } finally {
      client?.release();
    }

    res.status(dbStatus ? 200 : 503).json({
      status: dbStatus ? 'ok' : 'degraded',
      database: dbStatus,
      integrations: {
        prosync: !!integrationsConfig.prosync.apiKey,
        rubrica: !!integrationsConfig.rubrica.apiKey,
      },
    });
  });

  return router;
}
