/**
 * Preços MRR em centavos (BRL). Espelha featureFlags.ts — manter sincronizado.
 */
const PLAN_MRR_MONTHLY_CENTS: Record<string, number> = {
  free: 0,
  pro: 8900,
  business: 24900,
};

const PLAN_MRR_YEARLY_MONTHLY_CENTS: Record<string, number> = {
  free: 0,
  pro: 6900,
  business: 19900,
};

export function mrrCentsForPlan(
  plan: string | null | undefined,
  cycle: string | null | undefined,
): number {
  const p = (plan || 'free').toLowerCase();
  if (cycle === 'yearly') return PLAN_MRR_YEARLY_MONTHLY_CENTS[p] ?? 0;
  return PLAN_MRR_MONTHLY_CENTS[p] ?? 0;
}

export function mrrBrlForPlan(
  plan: string | null | undefined,
  cycle: string | null | undefined,
): number {
  return mrrCentsForPlan(plan, cycle) / 100;
}

export function mrrDeltaCents(
  fromPlan: string | null,
  fromCycle: string | null,
  toPlan: string | null,
  toCycle: string | null,
): number {
  return mrrCentsForPlan(toPlan, toCycle) - mrrCentsForPlan(fromPlan, fromCycle);
}

export function isOrgActiveForMrr(org: {
  plan: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: Date | null;
}): boolean {
  if (org.plan && org.plan !== 'free' && org.stripe_subscription_id) return true;
  if (org.trial_ends_at && new Date(org.trial_ends_at).getTime() > Date.now()) return true;
  return false;
}

export type SubscriptionEventType =
  | 'new'
  | 'upgrade'
  | 'downgrade'
  | 'cancel'
  | 'reactivate'
  | 'trial_start'
  | 'trial_convert'
  | 'payment_failed';

export function classifyPlanChange(
  fromPlan: string | null,
  toPlan: string | null,
  isCancel: boolean,
): SubscriptionEventType {
  if (isCancel) return 'cancel';
  const from = (fromPlan || 'free').toLowerCase();
  const to = (toPlan || 'free').toLowerCase();
  if (from === 'free' && to !== 'free') return 'new';
  if (from !== 'free' && to === 'free') return 'cancel';
  const order = ['free', 'pro', 'business'];
  const fi = order.indexOf(from);
  const ti = order.indexOf(to);
  if (ti > fi) return 'upgrade';
  if (ti < fi) return 'downgrade';
  return 'reactivate';
}
