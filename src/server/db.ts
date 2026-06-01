import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import type { EnvironmentConfig } from './env.js';
import { runMigrations } from './db/migrations.js';

const { Pool } = pg;

export function createPool(config: EnvironmentConfig): pg.Pool {
  const isServerless = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  return new Pool({
    connectionString: config.databaseUrl,
    // Neon + Vercel: poucas conexões por instância; use DATABASE_URL com "-pooler" no host.
    max: isServerless ? 1 : 10,
    idleTimeoutMillis: isServerless ? 5_000 : 30_000,
    connectionTimeoutMillis: isServerless ? 10_000 : undefined,
    ssl: config.nodeEnv === 'production'
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: false },
  });
}

/** Resolve pasta sql/ no bundle serverless (cwd pode variar na Vercel). */
export function resolveSqlDir(): string {
  const candidates = [
    path.join(process.cwd(), 'sql'),
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../sql'),
  ];
  const found = candidates.find((d) => fs.existsSync(d));
  if (!found) {
    throw new Error(`sql/ não encontrado no bundle (tried: ${candidates.join(', ')})`);
  }
  return found;
}

export async function runStartupMigrations(pool: pg.Pool): Promise<void> {
  try {
    const sqlDir = resolveSqlDir();
    await runMigrations(pool, sqlDir);
    await verifyIntegrationSchema(pool);
  } catch (err) {
    console.error('[startup] migrations failed:', err);
    const isProd =
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL === '1' ||
      process.env.VERCEL === 'true';
    if (isProd) {
      throw err;
    }
  }
}

/**
 * Confirma que as tabelas de integração existem após rodar `sql/*.sql`.
 */
async function verifyIntegrationSchema(pool: pg.Pool): Promise<void> {
  try {
    const { rows } = await pool.query<{ m: string | null; e: string | null }>(
      `SELECT to_regclass('public.integration_mappings')::text AS m,
              to_regclass('public.integration_events')::text AS e`,
    );
    const row = rows[0];
    if (!row?.m || !row?.e) {
      console.warn(
        '[startup] schema de integração incompleto (esperado integration_mappings + integration_events):',
        row,
      );
      return;
    }
    console.log('[startup] integration schema OK (integration_mappings, integration_events)');
  } catch (err) {
    console.warn('[startup] verificação do schema de integração falhou:', err);
  }
}
