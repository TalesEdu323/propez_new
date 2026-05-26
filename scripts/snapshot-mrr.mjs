#!/usr/bin/env node
/**
 * Snapshot diário de MRR + refresh de alertas admin.
 *
 * Uso:
 *   node scripts/snapshot-mrr.mjs
 *   node scripts/snapshot-mrr.mjs --backfill
 */
import 'dotenv/config';
import pg from 'pg';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error('DATABASE_URL não configurado');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
});

const PLAN_MRR = { free: 0, pro: 8900, business: 24900 };
const PLAN_MRR_YEARLY = { free: 0, pro: 6900, business: 19900 };

function mrrCents(plan, cycle) {
  const p = (plan || 'free').toLowerCase();
  return cycle === 'yearly' ? (PLAN_MRR_YEARLY[p] ?? 0) : (PLAN_MRR[p] ?? 0);
}

function isActive(o) {
  if (o.plan && o.plan !== 'free' && o.stripe_subscription_id) return true;
  if (o.trial_ends_at && new Date(o.trial_ends_at) > new Date()) return true;
  return false;
}

async function computeMrr(client) {
  const { rows } = await client.query(
    `SELECT plan, billing_cycle, stripe_subscription_id, trial_ends_at FROM organizations`,
  );
  let total = 0;
  const byPlan = { free: 0, pro: 0, business: 0 };
  let active = 0;
  for (const o of rows) {
    if (!isActive(o)) continue;
    active++;
    const c = mrrCents(o.plan, o.billing_cycle);
    total += c;
    const p = (o.plan || 'free').toLowerCase();
    byPlan[p] = (byPlan[p] ?? 0) + c;
  }
  return { total, byPlan, active };
}

async function snapshotToday(client) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const { total, byPlan, active } = await computeMrr(client);

  const bd = await client.query(
    `SELECT event_type, COALESCE(SUM(ABS(mrr_delta_cents)),0)::bigint AS total
     FROM subscription_events WHERE DATE(created_at) = $1::date
     GROUP BY event_type`,
    [dateStr],
  );
  const map = Object.fromEntries(bd.rows.map((r) => [r.event_type, Number(r.total)]));
  const newMrr = (map.new ?? 0) + (map.trial_convert ?? 0);
  const expansion = map.upgrade ?? 0;
  const contraction = map.downgrade ?? 0;
  const churn = map.cancel ?? 0;
  const reactivation = map.reactivate ?? 0;

  await client.query(
    `INSERT INTO mrr_snapshots (
       snapshot_date, total_mrr_cents, mrr_by_plan, active_orgs,
       new_mrr_cents, expansion_cents, contraction_cents, churn_cents, reactivation_cents
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (snapshot_date) DO UPDATE SET
       total_mrr_cents = EXCLUDED.total_mrr_cents,
       mrr_by_plan = EXCLUDED.mrr_by_plan,
       active_orgs = EXCLUDED.active_orgs,
       new_mrr_cents = EXCLUDED.new_mrr_cents,
       expansion_cents = EXCLUDED.expansion_cents,
       contraction_cents = EXCLUDED.contraction_cents,
       churn_cents = EXCLUDED.churn_cents,
       reactivation_cents = EXCLUDED.reactivation_cents`,
    [
      dateStr,
      total,
      JSON.stringify(byPlan),
      active,
      newMrr,
      expansion,
      contraction,
      churn,
      reactivation,
    ],
  );
  console.log(`[snapshot] ${dateStr} MRR=${(total / 100).toFixed(2)} BRL active=${active}`);
}

async function backfill(client, months = 12) {
  const { total, byPlan, active } = await computeMrr(client);
  for (let i = months; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const factor = 0.7 + (0.3 * (months - i)) / months;
    await client.query(
      `INSERT INTO mrr_snapshots (snapshot_date, total_mrr_cents, mrr_by_plan, active_orgs, is_estimated)
       VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT (snapshot_date) DO NOTHING`,
      [dateStr, Math.round(total * factor), JSON.stringify(byPlan), Math.max(1, Math.round(active * factor))],
    );
  }
  console.log(`[backfill] ${months + 1} meses estimados`);
}

async function refreshAlerts(client) {
  const trials = await client.query(
    `SELECT id, name, trial_ends_at FROM organizations
     WHERE trial_ends_at IS NOT NULL AND trial_ends_at > NOW()
       AND trial_ends_at <= NOW() + INTERVAL '7 days'
       AND (stripe_subscription_id IS NULL OR plan = 'free')`,
  );
  for (const o of trials.rows) {
    await client.query(
      `INSERT INTO admin_alerts (alert_type, severity, organization_id, title, body, dedupe_key)
       VALUES ('trial_expiring','warning',$1,$2,$3,$4)
       ON CONFLICT (dedupe_key) WHERE resolved_at IS NULL AND dedupe_key IS NOT NULL
       DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body`,
      [
        o.id,
        `Trial expirando: ${o.name}`,
        `Trial termina em ${new Date(o.trial_ends_at).toLocaleDateString('pt-BR')}.`,
        `trial_expiring:${o.id}`,
      ],
    );
  }
  console.log(`[alerts] trials=${trials.rows.length}`);
}

async function main() {
  const client = await pool.connect();
  try {
    if (process.argv.includes('--backfill')) {
      await backfill(client);
    }
    await snapshotToday(client);
    await refreshAlerts(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
