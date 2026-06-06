import type { Application } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { getConfigBootErrors } from '../src/server/env.js';
import { getExpressApp } from '../src/server/vercelHandler.js';

/**
 * Aguarda o Express concluir a resposta antes de encerrar a função serverless.
 * Sem isso, a Vercel pode cortar a execução e devolver 504 em rotas async lentas.
 */
function runExpress(
  app: Application,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  return new Promise((resolve, reject) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    res.once('error', reject);
    app(req, res);
  });
}

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
    await runExpress(app, req, res);
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
