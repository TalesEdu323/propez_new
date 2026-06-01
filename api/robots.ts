import type { IncomingMessage, ServerResponse } from 'http';

function resolveAppUrl(): string {
  const url = process.env.APP_URL?.trim();
  if (!url) throw new Error('Missing APP_URL');
  return url;
}

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const { buildRobotsTxt } = await import('../src/server/seo/seoContent.js');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(buildRobotsTxt(resolveAppUrl()));
  } catch (err) {
    console.error('[robots]', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end('error');
    }
  }
}
