import fs from 'fs'
import path from 'path'
import type { Pool } from 'pg'

async function ensureMigrationTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

async function getAppliedMigrations(pool: Pool): Promise<Set<string>> {
  const { rows } = await pool.query<{ filename: string }>(
    `SELECT filename FROM schema_migrations`,
  )
  return new Set(rows.map((r) => r.filename))
}

/**
 * Executa scripts SQL de `sql/*.sql` em ordem lexicográfica.
 * Idempotente; pula arquivos já registrados em schema_migrations.
 */
export async function runMigrations(pool: Pool, sqlDir: string): Promise<void> {
  let files: string[] = []
  try {
    files = fs
      .readdirSync(sqlDir)
      .filter((f) => f.toLowerCase().endsWith('.sql'))
      .sort()
  } catch (err) {
    console.warn(`[migrations] pasta ${sqlDir} não encontrada, pulando`)
    return
  }

  await ensureMigrationTable(pool)
  const applied = await getAppliedMigrations(pool)

  for (const f of files) {
    if (applied.has(f)) {
      console.log(`[migrations] skip ${f}`)
      continue
    }

    const fullPath = path.join(sqlDir, f)
    const sql = fs.readFileSync(fullPath, 'utf8')
    try {
      await pool.query(sql)
      await pool.query(
        `INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING`,
        [f],
      )
      console.log(`[migrations] applied ${f}`)
    } catch (err) {
      console.error(`[migrations] failed ${f}:`, err)
      throw err
    }
  }
}
