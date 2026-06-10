#!/usr/bin/env node
/**
 * Redefine a senha de um usuário por e-mail.
 *
 * Uso:
 *   node scripts/reset-password.mjs --email user@example.com
 *   node scripts/reset-password.mjs --email user@example.com --password "MinhaSenha123!"
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { poolSslOption } from './lib/dbSsl.mjs';

const args = process.argv.slice(2);
let email = '';
let password = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) email = args[++i].toLowerCase();
  else if (args[i] === '--password' && args[i + 1]) password = args[++i];
}

if (!email) {
  console.error('Informe --email');
  process.exit(1);
}

if (!password) {
  password = `Taggo@${randomBytes(4).toString('hex')}!`;
}

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('DATABASE_URL não configurado');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: poolSslOption(DATABASE_URL),
});

async function main() {
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `UPDATE users SET password_hash = $2 WHERE LOWER(email) = $1 RETURNING email, name`,
    [email, hash],
  );
  if (rows.length === 0) {
    console.error(`[reset-password] usuário não encontrado: ${email}`);
    process.exit(1);
  }
  console.log(`[reset-password] senha atualizada para ${rows[0].email} (${rows[0].name})`);
  console.log(`[reset-password] senha: ${password}`);
}

main()
  .catch((err) => {
    console.error('[reset-password] erro:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
