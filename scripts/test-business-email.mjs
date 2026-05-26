/**
 * Preview de template transacional via SMTP.
 * Uso: npx tsx scripts/test-business-email-run.ts seu@email.com proposal_approved
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsx', path.join(__dirname, 'test-business-email-run.ts'), ...args],
  { stdio: 'inherit', shell: process.platform === 'win32' },
)

process.exit(result.status ?? 1)
