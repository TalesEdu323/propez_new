import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import type { EnvironmentConfig } from '../env.js';

export function createSeoRouter(deps: { pool: Pool; config: EnvironmentConfig }) {
  const router = Router();
  const { pool, config } = deps;
  const base = config.appUrl.replace(/\/+$/, '');

  const staticPaths = [
    '/',
    '/sobre-nos',
    '/planos',
    '/blog',
    '/login',
    '/cadastro',
  ];

  router.get('/sitemap.xml', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{ slug: string; updated_at: string }>(
        `SELECT slug, updated_at FROM posts WHERE status = 'published' ORDER BY published_at DESC`,
      );
      const urls = [
        ...staticPaths.map(
          (p) => `  <url><loc>${base}${p}</loc><changefreq>weekly</changefreq></url>`,
        ),
        ...rows.map(
          (r) =>
            `  <url><loc>${base}/blog/${r.slug}</loc><lastmod>${new Date(r.updated_at).toISOString().split('T')[0]}</lastmod></url>`,
        ),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
      res.type('application/xml').send(xml);
    } catch (err) {
      console.error('[sitemap]', err);
      res.status(500).send('error');
    }
  });

  router.get('/robots.txt', (_req: Request, res: Response) => {
    res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /app
Disallow: /api/

Sitemap: ${base}/sitemap.xml
`);
  });

  return router;
}
