import type { IncomingMessage, ServerResponse } from 'http';
import pg from 'pg';
import { getConfigBootErrors, isMailConfigured, loadConfig } from '../src/server/env.js';
import { normalizeDatabaseUrl } from '../src/server/db/databaseUrl.js';

const DB_PING_TIMEOUT_MS = 3_000;

async function pingDatabase(): Promise<{ dbOk: boolean; dbError: string | null; hasPooler: boolean }> {
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return { dbOk: false, dbError: 'DATABASE_URL ausente', hasPooler: false };
  }

  const hasPooler = dbUrl.includes('-pooler');
  const pool = new pg.Pool({
    connectionString: normalizeDatabaseUrl(dbUrl),
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

  let mail: {
    provider: string;
    configured: boolean;
    from: string;
    smtpHost: string | null;
    hasResendKey: boolean;
    warnings: string[];
  } | undefined;

  if (bootErrors.length === 0) {
    try {
      const config = loadConfig();
      const mailConfig = config.mail;
      const mailWarnings: string[] = [];
      if (!isMailConfigured(mailConfig)) {
        mailWarnings.push(
          config.nodeEnv === 'production'
            ? 'Provedor de e-mail não configurado — auth e envios falham com 503.'
            : 'E-mail em modo simulação (provider=none).',
        );
      } else if (process.env.VERCEL === '1' && mailConfig.provider === 'smtp') {
        mailWarnings.push(
          'Vercel + SMTP: prefira RESEND_API_KEY e MAIL_PROVIDER=resend para envio confiável em serverless.',
        );
      }
      mail = {
        provider: mailConfig.provider,
        configured: isMailConfigured(mailConfig),
        from: mailConfig.from,
        smtpHost: mailConfig.smtp?.host ?? null,
        hasResendKey: Boolean(mailConfig.resendApiKey),
        warnings: mailWarnings,
      };
    } catch {
      mail = undefined;
    }
  }

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
    ...(mail ? { mail } : {}),
  };

  res.statusCode = ok ? 200 : 503;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}
