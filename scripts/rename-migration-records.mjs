#!/usr/bin/env node
/**
 * Atualiza registros em schema_migrations após renomear arquivos SQL.
 * Execute uma vez em bancos que já aplicaram os nomes antigos (014_*, 020_*).
 *
 * Uso: DATABASE_URL=... npm run migrate:rename-records
 */
import pg from 'pg';

const RENAME_MAP = {
  '014_drop_org_media.sql': '014a_drop_org_media.sql',
  '014_service_requests.sql': '014b_service_requests.sql',
  '020_affiliates_coupons.sql': '020a_affiliates_coupons.sql',
  '020_email_change_requests.sql': '020b_email_change_requests.sql',
};

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error('DATABASE_URL é obrigatória.');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  for (const [oldName, newName] of Object.entries(RENAME_MAP)) {
    const { rowCount } = await pool.query(
      `UPDATE schema_migrations SET filename = $1 WHERE filename = $2`,
      [newName, oldName],
    );
    if (rowCount > 0) {
      console.log(`[rename] ${oldName} → ${newName} (${rowCount} registro(s))`);
    } else {
      console.log(`[rename] skip ${oldName} (não encontrado)`);
    }
  }
  console.log('[rename] concluído.');
} catch (err) {
  console.error('[rename] falhou:', err);
  process.exit(1);
} finally {
  await pool.end();
}
