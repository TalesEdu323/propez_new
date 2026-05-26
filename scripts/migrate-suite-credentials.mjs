#!/usr/bin/env node
/**
 * Migração da Fase 5 — Suíte Taggo.
 *
 * Para cada organização Propez que ainda não tem entrada em
 * `org_integration_credentials`, popular usando as chaves globais
 * `PROSYNC_API_KEY` / `RUBRICA_API_KEY` (compatibilidade single-tenant
 * antiga). A partir desse ponto, a leitura passa pelo repositório por
 * organização e não depende mais dos `.env` globais.
 *
 * Uso:
 *   node scripts/migrate-suite-credentials.mjs --dry-run
 *   node scripts/migrate-suite-credentials.mjs
 *
 * Variáveis necessárias:
 *   DATABASE_URL          conexão Postgres do Propez
 *   CREDENTIALS_KEY       (ou TAGGO_SUITE_SECRET) — chave de criptografia
 *   PROSYNC_API_KEY       (opcional)
 *   RUBRICA_API_KEY       (opcional)
 */
import 'dotenv/config'
import { Pool } from 'pg'
import crypto from 'node:crypto'

const DRY_RUN = process.argv.includes('--dry-run')

function deriveKey() {
  const explicit = process.env.CREDENTIALS_KEY
  if (explicit && explicit.length >= 32) {
    return crypto.createHash('sha256').update(explicit).digest()
  }
  const suite = process.env.TAGGO_SUITE_SECRET
  if (suite && suite.length >= 32) {
    return crypto.createHash('sha256').update(`creds:${suite}`).digest()
  }
  throw new Error(
    'Defina CREDENTIALS_KEY ou TAGGO_SUITE_SECRET (>= 32 chars) para criptografar as credenciais.',
  )
}

/**
 * Cifra no mesmo formato que `src/server/lib/secretCrypto.ts` usa:
 * `base64( IV(12) | TAG(16) | CIPHERTEXT )`.
 */
function encrypt(value, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct]).toString('base64')
}

function keyPrefix(apiKey) {
  if (!apiKey) return null
  const visible = apiKey.slice(0, 8)
  return `${visible}…`
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL não definida')

  const prosyncKey = process.env.PROSYNC_API_KEY || null
  const rubricaKey = process.env.RUBRICA_API_KEY || null

  if (!prosyncKey && !rubricaKey) {
    console.log(
      '[migrate-suite-credentials] Nenhuma chave global definida — nada a migrar.',
    )
    return
  }

  const key = deriveKey()
  const pool = new Pool({ connectionString: databaseUrl, max: 4 })

  try {
    const { rows: orgs } = await pool.query('SELECT id, name FROM organizations ORDER BY name')
    console.log(`[migrate-suite-credentials] organizações encontradas: ${orgs.length}`)

    const providers = [
      prosyncKey ? { provider: 'prosync', apiKey: prosyncKey } : null,
      rubricaKey ? { provider: 'rubrica', apiKey: rubricaKey } : null,
    ].filter(Boolean)

    let inserted = 0
    let skipped = 0
    for (const org of orgs) {
      for (const p of providers) {
        const existing = await pool.query(
          `SELECT 1 FROM org_integration_credentials
           WHERE organization_id = $1 AND provider = $2 LIMIT 1`,
          [org.id, p.provider],
        )
        if (existing.rowCount > 0) {
          skipped++
          continue
        }

        if (DRY_RUN) {
          console.log(
            `[dry-run] inserir ${p.provider} para org=${org.id} (${org.name})`,
          )
          inserted++
          continue
        }

        await pool.query(
          `INSERT INTO org_integration_credentials
             (organization_id, provider, encrypted_api_key, key_prefix,
              external_user_id, external_org_id, scopes, source,
              last_verified_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NULL, NULL, ARRAY[]::text[], 'env_fallback',
                   NOW(), NOW(), NOW())`,
          [org.id, p.provider, encrypt(p.apiKey, key), keyPrefix(p.apiKey)],
        )
        inserted++
      }
    }

    console.log(
      `[migrate-suite-credentials] resultado: inseridas=${inserted}, puladas=${skipped}` +
        (DRY_RUN ? ' (dry-run)' : ''),
    )
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('[migrate-suite-credentials] erro:', err)
  process.exit(1)
})
