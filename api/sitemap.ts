import type { IncomingMessage, ServerResponse } from 'http';
import { loadConfig } from '../src/server/env.js';
import { createPool } from '../src/server/db.js';

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let pool: ReturnType<typeof createPool> | null = null;
  try {
    const config = loadConfig();
    pool = createPool(config);
    const { buildSitemapXml } = await import('../src/server/seo/seoContent.js');
    const xml = await buildSitemapXml(pool, config.appUrl);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(xml);
  } catch (err) {
    console.error('[sitemap]', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('error');
    }
  } finally {
    await pool?.end().catch(() => {});
  }
}
