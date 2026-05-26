import Stripe from 'stripe';
import type { Pool } from 'pg';
import { computeCurrentMrr } from './mrrSnapshot.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; data: StripeDunningSummary } | null = null;

export interface StripeDunningSummary {
  pastDueCount: number;
  pastDueMrrCents: number;
  localMrrCents: number;
  mrrDivergence: boolean;
}

export async function fetchStripeDunningSummary(
  stripe: Stripe,
  pool: Pool,
): Promise<StripeDunningSummary> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  const { totalMrrCents: localMrrCents } = await computeCurrentMrr(pool);
  let pastDueCount = 0;
  let pastDueMrrCents = 0;

  try {
    const subs = await stripe.subscriptions.list({
      status: 'past_due',
      limit: 100,
    });
    pastDueCount = subs.data.length;
    for (const sub of subs.data) {
      const amount = sub.items.data[0]?.price?.unit_amount ?? 0;
      pastDueMrrCents += amount;
    }
  } catch (err) {
    console.error('[stripeMetrics] past_due list falhou:', err);
  }

  const data: StripeDunningSummary = {
    pastDueCount,
    pastDueMrrCents,
    localMrrCents,
    mrrDivergence: Math.abs(pastDueMrrCents - localMrrCents) > localMrrCents * 0.1 && localMrrCents > 0,
  };
  cache = { at: Date.now(), data };
  return data;
}

export function createStripeClient(secretKey: string, restrictedKey?: string): Stripe {
  return new Stripe(restrictedKey || secretKey);
}
