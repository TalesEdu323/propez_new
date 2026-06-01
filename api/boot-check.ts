import type { IncomingMessage, ServerResponse } from 'http';
import pg from 'pg';
import { getConfigBootErrors } from '../src/server/env.js';

const DB_PING_TIMEOUT_MS = 3_000;

async function pingDatabase(): Promise<{ dbOk: boolean; dbError: string | null; hasPooler: boolean }> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return { dbOk: false, dbError: 'DATABASE_URL ausente', hasPooler: false };
  }

  const hasPooler = dbUrl.includes('-pooler');
  const pool = new pg.Pool({
    connectionString: dbUrl,
    max: 1,
    connectionTimeoutMillis: DB_PING_TIMEOUT_MS,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query('SELECT 1');
    return { dbOk: true, dbError: null, hasPooler };
  } catch (err) {
    return {
      dbOk: false,
      dbError: err instanceof Error ? err.message : String(err),
      hasPooler,
    };
  } finally {
    await pool.end().catch(() => {});
  }
}

/**
 * Função serverless mínima — valida env e ping DB, sem Express.
 * Acesse GET /api/boot-check para diagnosticar crash no cold start.
 */
export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const bootErrors = getConfigBootErrors();
  const db = bootErrors.length === 0 ? await pingDatabase() : { dbOk: false, dbError: null, hasPooler: false };

  const migrationHint =
    !db.hasPooler && process.env.VERCEL === '1'
      ? 'Prefira DATABASE_URL com host Neon "-pooler" na Vercel.'
      : undefined;

  const ok = bootErrors.length === 0 && db.dbOk;
  const payload = {
    ok,
    nodeEnv: process.env.NODE_ENV ?? null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    hasJwtSecret: Boolean(process.env.JWT_SECRET?.trim()),
    hasAppUrl: Boolean(process.env.APP_URL?.trim()),
    dbOk: db.dbOk,
    dbError: db.dbError,
    hasPooler: db.hasPooler,
    migrationHint,
    bootErrors,
  };

  res.statusCode = ok ? 200 : 503;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}
