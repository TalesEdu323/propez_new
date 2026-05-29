import type { IncomingMessage, ServerResponse } from 'http';
import { getConfigBootErrors } from '../src/server/env.js';
import { getExpressApp } from '../src/server/vercelHandler.js';
/**
 * Entrada serverless Vercel — todas as requisições /api/* são reencaminhadas aqui
 * via rewrites em vercel.json.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const app = await getExpressApp();
    app(req, res);
  } catch (err) {
    console.error('[vercel] handler error:', err);
    const bootErrors = getConfigBootErrors();
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Servidor indisponível',
          bootErrors: bootErrors.length > 0 ? bootErrors : undefined,
          detail: err instanceof Error ? err.message : String(err),
          hint:
            'Boot da API falhou. Confira Vercel → Settings → Environment Variables (Production): APP_URL, DATABASE_URL, JWT_SECRET, STRIPE_*.',
        }),
      );
    }
  }}
