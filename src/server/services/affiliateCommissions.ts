import type { Pool } from 'pg';
import { recordAffiliateEvent } from './affiliateEvents.js';

export interface OrgAffiliateInfo {
  affiliate_id: string | null;
  commission_percent: string | null;
  affiliate_code: string | null;
}

export async function fetchOrgAffiliateInfo(
  pool: Pool,
  organizationId: string,
): Promise<OrgAffiliateInfo | null> {
  const { rows } = await pool.query<OrgAffiliateInfo>(
    `SELECT o.affiliate_id, a.commission_percent, a.code AS affiliate_code
     FROM organizations o
     LEFT JOIN affiliates a ON a.id = o.affiliate_id
     WHERE o.id = $1`,
    [organizationId],
  );
  return rows[0] ?? null;
}

export async function recordSubscriptionConversion(
  pool: Pool,
  organizationId: string,
  affiliateId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const existing = await pool.query(
    `SELECT 1 FROM affiliate_events
     WHERE affiliate_id = $1 AND organization_id = $2 AND event_type = 'subscription'
     LIMIT 1`,
    [affiliateId, organizationId],
  );
  if (existing.rows.length > 0) return;

  await recordAffiliateEvent(pool, {
    affiliateId,
    eventType: 'subscription',
    organizationId,
    metadata,
  });
}

export async function recordAffiliateCommission(
  pool: Pool,
  payload: {
    organizationId: string;
    stripeInvoiceId: string;
    amountPaidCents: number;
    periodStart?: Date | null;
    periodEnd?: Date | null;
  },
): Promise<void> {
  const info = await fetchOrgAffiliateInfo(pool, payload.organizationId);
  if (!info?.affiliate_id) return;

  const commissionPercent = Number(info.commission_percent ?? 0);
  if (commissionPercent <= 0) return;

  const commissionCents = Math.round(
    payload.amountPaidCents * commissionPercent / 100,
  );

  const result = await pool.query(
    `INSERT INTO affiliate_commissions (
       affiliate_id, organization_id, stripe_invoice_id,
       mrr_cents, commission_percent, commission_cents,
       period_start, period_end
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (stripe_invoice_id) DO NOTHING
     RETURNING id`,
    [
      info.affiliate_id,
      payload.organizationId,
      payload.stripeInvoiceId,
      payload.amountPaidCents,
      commissionPercent,
      commissionCents,
      payload.periodStart ?? null,
      payload.periodEnd ?? null,
    ],
  );

  if (result.rows.length > 0) {
    await recordSubscriptionConversion(pool, payload.organizationId, info.affiliate_id, {
      invoiceId: payload.stripeInvoiceId,
      commissionCents,
    });
  }
}

export async function attributeOrganizationToAffiliate(
  pool: Pool,
  organizationId: string,
  affiliateCode: string,
  sessionId?: string | null,
): Promise<boolean> {
  const { rows: affRows } = await pool.query<{ id: string; code: string }>(
    `SELECT id, code FROM affiliates WHERE LOWER(code) = LOWER($1) AND status = 'active' LIMIT 1`,
    [affiliateCode.trim()],
  );
  const affiliate = affRows[0];
  if (!affiliate) return false;

  const { rowCount } = await pool.query(
    `UPDATE organizations SET
       affiliate_id = $2,
       affiliate_attributed_at = COALESCE(affiliate_attributed_at, NOW()),
       signup_source = COALESCE(signup_source, 'affiliate'),
       utm_source = COALESCE(utm_source, 'affiliate'),
       utm_medium = COALESCE(utm_medium, 'referral'),
       utm_campaign = COALESCE(utm_campaign, $3)
     WHERE id = $1 AND affiliate_id IS NULL`,
    [organizationId, affiliate.id, affiliate.code],
  );

  if ((rowCount ?? 0) > 0) {
    await recordAffiliateEvent(pool, {
      affiliateId: affiliate.id,
      eventType: 'signup',
      organizationId,
      sessionId,
    });
    return true;
  }
  return false;
}
