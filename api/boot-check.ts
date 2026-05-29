import type { IncomingMessage, ServerResponse } from 'http';
import { getConfigBootErrors } from '../src/server/env.js';

/**
 * Função serverless mínima — só valida env, sem Express/Postgres.
 * Acesse GET /api/boot-check para diagnosticar crash no cold start.
 */
export default function handler(_req: IncomingMessage, res: ServerResponse): void {
  const bootErrors = getConfigBootErrors();
  const payload = {
    ok: bootErrors.length === 0,
    nodeEnv: process.env.NODE_ENV ?? null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    hasJwtSecret: Boolean(process.env.JWT_SECRET?.trim()),
    hasAppUrl: Boolean(process.env.APP_URL?.trim()),
    bootErrors,
  };
  res.statusCode = bootErrors.length === 0 ? 200 : 503;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}
