#!/usr/bin/env node
/**
 * Aplica migrations pendentes no Postgres (local ou Neon produção).
 * Uso: npm run migrate:apply
 */
import dotenv from 'dotenv';
import pg from 'pg';
import { runMigrations } from '../src/server/db/migrations.js';
import { resolveSqlDir } from '../src/server/db.js';

dotenv.config();

const dbUrl = process.env.DATABASE_URL?.trim();
if (!dbUrl) {
  console.error('[migrate:apply] DATABASE_URL ausente');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? undefined : { rejectUnauthorized: false },
});

try {
  const sqlDir = resolveSqlDir();
  console.log(`[migrate:apply] sqlDir=${sqlDir}`);
  if (!dbUrl.includes('-pooler') && !dbUrl.includes('localhost')) {
    console.warn('[migrate:apply] DATABASE_URL sem "-pooler" — prefira pooler Neon em produção.');
  }
  await runMigrations(pool, sqlDir);
  console.log('[migrate:apply] concluído');
} catch (err) {
  console.error('[migrate:apply] falhou:', err);
  process.exit(1);
} finally {
  await pool.end();
}
