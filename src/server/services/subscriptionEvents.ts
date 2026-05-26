import type { Pool } from 'pg';
import {
  classifyPlanChange,
  mrrDeltaCents,
  type SubscriptionEventType,
} from './mrrPricing.js';

export async function insertSubscriptionEvent(
  pool: Pool,
  payload: {
    organizationId: string | null;
    eventType: SubscriptionEventType;
    fromPlan?: string | null;
    toPlan?: string | null;
    fromCycle?: string | null;
    toCycle?: string | null;
    stripeEventId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  if (!payload.organizationId) return;
  const delta = mrrDeltaCents(
    payload.fromPlan ?? null,
    payload.fromCycle ?? null,
    payload.toPlan ?? null,
    payload.toCycle ?? null,
  );
  try {
    await pool.query(
      `INSERT INTO subscription_events (
         organization_id, event_type, from_plan, to_plan, from_cycle, to_cycle,
         mrr_delta_cents, stripe_event_id, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (stripe_event_id) DO NOTHING`,
      [
        payload.organizationId,
        payload.eventType,
        payload.fromPlan ?? null,
        payload.toPlan ?? null,
        payload.fromCycle ?? null,
        payload.toCycle ?? null,
        delta,
        payload.stripeEventId ?? null,
        JSON.stringify(payload.metadata ?? {}),
      ],
    );
  } catch (err) {
    console.error('[subscription_events] insert falhou:', err);
  }
}

export async function recordPlanChange(
  pool: Pool,
  opts: {
    organizationId: string;
    fromPlan: string | null;
    fromCycle: string | null;
    toPlan: string | null;
    toCycle: string | null;
    stripeEventId: string;
    isCancel?: boolean;
    cancelReason?: string | null;
  },
): Promise<void> {
  const eventType = classifyPlanChange(opts.fromPlan, opts.toPlan, !!opts.isCancel);
  await insertSubscriptionEvent(pool, {
    organizationId: opts.organizationId,
    eventType,
    fromPlan: opts.fromPlan,
    toPlan: opts.toPlan,
    fromCycle: opts.fromCycle,
    toCycle: opts.toCycle,
    stripeEventId: opts.stripeEventId,
    metadata: opts.cancelReason ? { cancelReason: opts.cancelReason } : {},
  });
}
