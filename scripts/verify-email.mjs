#!/usr/bin/env node
/**
 * Marca e-mail como verificado (dev / suporte).
 *
 * Uso: node scripts/verify-email.mjs --email taggo.software@gmail.com
 */

import 'dotenv/config';
import pg from 'pg';

const args = process.argv.slice(2);
let email = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) email = args[++i].toLowerCase();
}
if (!email) {
  console.error('Informe --email');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : undefined,
});

const { rows } = await pool.query(
  `UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW())
   WHERE LOWER(email) = $1
   RETURNING email, email_verified_at`,
  [email],
);
await pool.end();

if (!rows[0]) {
  console.error(`[verify-email] usuário não encontrado: ${email}`);
  process.exit(1);
}
console.log(`[verify-email] OK: ${rows[0].email} verificado em ${rows[0].email_verified_at}`);
