import type { Pool } from 'pg';
import { isOrgActiveForMrr, mrrCentsForPlan } from './mrrPricing.js';

export interface OrgHealthInput {
  id: string;
  plan: string | null;
  billing_cycle: string | null;
  trial_ends_at: Date | null;
  stripe_subscription_id: string | null;
  onboarded: boolean;
  created_at: Date;
}

export interface HealthScoreResult {
  score: number;
  level: 'green' | 'yellow' | 'red';
  factors: string[];
}

export async function computeOrgHealthScore(
  pool: Pool,
  org: OrgHealthInput,
): Promise<HealthScoreResult> {
  const factors: string[] = [];
  let score = 100;

  const lastLoginRes = await pool.query<{ last_login: Date | null }>(
    `SELECT MAX(u.last_login_at) AS last_login
     FROM memberships m
     JOIN users u ON u.id = m.user_id
     WHERE m.organization_id = $1`,
    [org.id],
  );
  const lastLogin = lastLoginRes.rows[0]?.last_login;
  if (lastLogin) {
    const daysSince = (Date.now() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 14) {
      score -= 30;
      factors.push('Sem login há mais de 14 dias');
    }
  } else {
    score -= 20;
    factors.push('Nenhum login registrado');
  }

  const plan = (org.plan || 'free').toLowerCase();
  if (plan !== 'free') {
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const usageRes = await pool.query<{ propostas: number }>(
      `SELECT COALESCE(propostas, 0) AS propostas FROM usage_counters
       WHERE organization_id = $1 AND month_key = $2`,
      [org.id, monthKey],
    );
    const propostas = usageRes.rows[0]?.propostas ?? 0;
    if (propostas === 0) {
      score -= 20;
      factors.push('Nenhuma proposta neste mês');
    }
  }

  const failedRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM stripe_payments
     WHERE organization_id = $1 AND status = 'failed'
       AND created_at >= NOW() - INTERVAL '30 days'`,
    [org.id],
  );
  if (Number(failedRes.rows[0]?.count ?? 0) > 0) {
    score -= 25;
    factors.push('Pagamento falhou nos últimos 30 dias');
  }

  if (
    org.trial_ends_at &&
    !org.stripe_subscription_id &&
    new Date(org.trial_ends_at).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000 &&
    new Date(org.trial_ends_at).getTime() > Date.now()
  ) {
    score -= 15;
    factors.push('Trial expira em menos de 3 dias');
  }

  const ageDays = (Date.now() - new Date(org.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (!org.onboarded && ageDays > 7) {
    score -= 10;
    factors.push('Onboarding incompleto após 7 dias');
  }

  score = Math.max(0, Math.min(100, score));
  const level = score < 50 ? 'red' : score < 75 ? 'yellow' : 'green';
  return { score, level, factors };
}

export async function fetchAllOrgsWithHealth(pool: Pool): Promise<
  Array<{
    id: string;
    name: string;
    plan: string | null;
    mrrCents: number;
    health: HealthScoreResult;
  }>
> {
  const { rows } = await pool.query<OrgHealthInput & { name: string }>(
    `SELECT id, name, plan, billing_cycle, trial_ends_at, stripe_subscription_id,
            onboarded, created_at
     FROM organizations
     ORDER BY created_at DESC`,
  );
  const results = [];
  for (const org of rows) {
    const health = await computeOrgHealthScore(pool, org);
    results.push({
      id: org.id,
      name: org.name,
      plan: org.plan,
      mrrCents: isOrgActiveForMrr(org)
        ? mrrCentsForPlan(org.plan, org.billing_cycle)
        : 0,
      health,
    });
  }
  return results.sort((a, b) => a.health.score - b.health.score);
}
