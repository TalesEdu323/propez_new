import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import type { EnvironmentConfig } from '../env.js';
import { buildRobotsTxt, buildSitemapXml } from '../seo/seoContent.js';

export function createSeoRouter(deps: { pool: Pool; config: EnvironmentConfig }) {
  const router = Router();
  const { pool, config } = deps;

  router.get('/sitemap.xml', async (_req: Request, res: Response) => {
    try {
      const xml = await buildSitemapXml(pool, config.appUrl);
      res.type('application/xml').send(xml);
    } catch (err) {
      console.error('[sitemap]', err);
      res.status(500).send('error');
    }
  });

  router.get('/robots.txt', (_req: Request, res: Response) => {
    res.type('text/plain').send(buildRobotsTxt(config.appUrl));
  });

  return router;
}
