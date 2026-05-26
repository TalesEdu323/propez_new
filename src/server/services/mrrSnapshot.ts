import type { Pool } from 'pg';
import { isOrgActiveForMrr, mrrCentsForPlan } from './mrrPricing.js';

export async function computeCurrentMrr(pool: Pool): Promise<{
  totalMrrCents: number;
  mrrByPlan: Record<string, number>;
  activeOrgs: number;
}> {
  const { rows } = await pool.query<{
    plan: string | null;
    billing_cycle: string | null;
    stripe_subscription_id: string | null;
    trial_ends_at: Date | null;
  }>(
    `SELECT plan, billing_cycle, stripe_subscription_id, trial_ends_at FROM organizations`,
  );

  let totalMrrCents = 0;
  const mrrByPlan: Record<string, number> = { free: 0, pro: 0, business: 0 };
  let activeOrgs = 0;

  for (const o of rows) {
    if (!isOrgActiveForMrr(o)) continue;
    activeOrgs++;
    const cents = mrrCentsForPlan(o.plan, o.billing_cycle);
    totalMrrCents += cents;
    const p = (o.plan || 'free').toLowerCase();
    mrrByPlan[p] = (mrrByPlan[p] ?? 0) + cents;
  }

  return { totalMrrCents, mrrByPlan, activeOrgs };
}

export async function snapshotMrrForDate(pool: Pool, date: Date): Promise<void> {
  const dateStr = date.toISOString().slice(0, 10);
  const { totalMrrCents, mrrByPlan, activeOrgs } = await computeCurrentMrr(pool);

  const breakdownRes = await pool.query<{
    event_type: string;
    total: string;
  }>(
    `SELECT event_type, COALESCE(SUM(ABS(mrr_delta_cents)), 0)::text AS total
     FROM subscription_events
     WHERE DATE(created_at) = $1::date
     GROUP BY event_type`,
    [dateStr],
  );

  let newMrr = 0;
  let expansion = 0;
  let contraction = 0;
  let churn = 0;
  let reactivation = 0;

  for (const row of breakdownRes.rows) {
    const v = Number(row.total);
    switch (row.event_type) {
      case 'new':
      case 'trial_convert':
        newMrr += v;
        break;
      case 'upgrade':
        expansion += v;
        break;
      case 'downgrade':
        contraction += v;
        break;
      case 'cancel':
        churn += v;
        break;
      case 'reactivate':
        reactivation += v;
        break;
      default:
        break;
    }
  }

  await pool.query(
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
      totalMrrCents,
      JSON.stringify(mrrByPlan),
      activeOrgs,
      newMrr,
      expansion,
      contraction,
      churn,
      reactivation,
    ],
  );
}

export async function backfillEstimatedSnapshots(pool: Pool, months = 12): Promise<void> {
  const { totalMrrCents, mrrByPlan, activeOrgs } = await computeCurrentMrr(pool);
  for (let i = months; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const factor = 0.7 + (0.3 * (months - i)) / months;
    await pool.query(
      `INSERT INTO mrr_snapshots (
         snapshot_date, total_mrr_cents, mrr_by_plan, active_orgs, is_estimated
       ) VALUES ($1,$2,$3,$4,TRUE)
       ON CONFLICT (snapshot_date) DO NOTHING`,
      [
        dateStr,
        Math.round(totalMrrCents * factor),
        JSON.stringify(mrrByPlan),
        Math.max(1, Math.round(activeOrgs * factor)),
      ],
    );
  }
}
