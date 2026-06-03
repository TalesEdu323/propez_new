import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import type { EnvironmentConfig } from '../env.js';
import { ensureVisitorId } from '../services/siteVisitorCookie.js';

export function createSiteRouter(deps: { pool: Pool; config: EnvironmentConfig }) {
  const router = Router();
  const { pool, config } = deps;

  router.get('/site/visitor', async (req: Request, res: Response) => {
    try {
      const visitorId = ensureVisitorId(req, res, config);
      await pool.query(
        `INSERT INTO site_visitors (visitor_id) VALUES ($1)
         ON CONFLICT (visitor_id) DO NOTHING`,
        [visitorId],
      );
      res.json({ visitorId });
    } catch (err) {
      console.error('[site/visitor]', err);
      res.status(500).json({ error: 'Erro ao identificar visitante' });
    }
  });

  return router;
}
