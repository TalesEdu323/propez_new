import type { IncomingMessage, ServerResponse } from 'http';

/** Diagnóstico: tenta importar createApp e reporta erro exato na Vercel. */
export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const mod = await import('../src/server/app.js');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, hasCreateApp: typeof mod.createApp === 'function' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }),
    );
  }
}
