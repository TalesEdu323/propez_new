import type { IncomingMessage, ServerResponse } from 'http';
import { getExpressApp } from '../src/server/vercelHandler.js';

/**
 * Entrada serverless Vercel — todas as requisições /api/* são reencaminhadas aqui
 * via rewrites em vercel.json.
 */
export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const app = await getExpressApp();
  app(req, res);
}
