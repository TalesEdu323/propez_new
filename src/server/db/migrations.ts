import fs from 'fs'
import path from 'path'
import type { Pool } from 'pg'

/**
 * Executa os scripts SQL de `sql/*.sql` em ordem lexicográfica.
 * Idempotente (todos os scripts devem usar `CREATE ... IF NOT EXISTS`).
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

  for (const f of files) {
    const fullPath = path.join(sqlDir, f)
    const sql = fs.readFileSync(fullPath, 'utf8')
    try {
      await pool.query(sql)
      console.log(`[migrations] applied ${f}`)
    } catch (err) {
      console.error(`[migrations] failed ${f}:`, err)
      throw err
    }
  }
}
