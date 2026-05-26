#!/usr/bin/env node
/**
 * Concede plano e (opcional) platform admin a usuários por e-mail.
 *
 * Uso:
 *   node scripts/grant-plan.mjs --plan business --email taggo.software@gmail.com
 *   node scripts/grant-plan.mjs --plan business --email a@x.com --email b@y.com --admin
 */

import 'dotenv/config';
import pg from 'pg';

const args = process.argv.slice(2);
const emails = [];
let plan = 'business';
let grantAdmin = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--email' && args[i + 1]) {
    emails.push(args[++i].toLowerCase());
  } else if (args[i] === '--plan' && args[i + 1]) {
    plan = args[++i];
  } else if (args[i] === '--admin') {
    grantAdmin = true;
  }
}

if (emails.length === 0) {
  console.error('Informe ao menos um --email');
  process.exit(1);
}

if (!['free', 'pro', 'business'].includes(plan)) {
  console.error('Plano inválido. Use: free | pro | business');
  process.exit(1);
}

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('DATABASE_URL não configurado');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orgs = await client.query(
      `UPDATE organizations o SET
         plan = $2,
         billing_cycle = CASE WHEN $2 = 'free' THEN NULL ELSE COALESCE(o.billing_cycle, 'yearly') END,
         plan_started_at = COALESCE(o.plan_started_at, NOW()),
         plan_renews_at = CASE WHEN $2 = 'free' THEN NULL ELSE NOW() + INTERVAL '10 years' END,
         trial_ends_at = NULL
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.organization_id = o.id
         AND LOWER(u.email) = ANY($1::text[])
       RETURNING o.id, o.name, o.plan, o.billing_cycle, o.plan_renews_at`,
      [emails, plan],
    );

    let users = { rows: [] };
    if (grantAdmin) {
      users = await client.query(
        `UPDATE users SET is_platform_admin = TRUE
         WHERE LOWER(email) = ANY($1::text[])
         RETURNING email, is_platform_admin`,
        [emails],
      );
    }

    await client.query('COMMIT');

    console.log(`[grant-plan] plano=${plan} emails=${emails.join(', ')}`);
    console.table(orgs.rows);
    if (grantAdmin) console.table(users.rows);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error('[grant-plan] erro:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
