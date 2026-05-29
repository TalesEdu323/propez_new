import path from 'path';
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
    ssl: config.nodeEnv === 'production'
      ? { rejectUnauthorized: false }
      : { rejectUnauthorized: false },
  });
}

export async function runStartupMigrations(pool: pg.Pool): Promise<void> {
  try {
    const sqlDir = path.join(process.cwd(), 'sql');
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
