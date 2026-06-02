import type { Pool } from 'pg';

export type AffiliateEventType = 'click' | 'view' | 'signup' | 'subscription';

export interface AffiliateRow {
  id: string;
  code: string;
  name: string;
  email: string | null;
  commission_percent: string;
  status: string;
  default_coupon_id: string | null;
  notes: string;
  created_at: Date;
  updated_at: Date;
}

export async function findActiveAffiliateByCode(
  pool: Pool,
  code: string,
): Promise<AffiliateRow | null> {
  const { rows } = await pool.query<AffiliateRow>(
    `SELECT id, code, name, email, commission_percent, status, default_coupon_id, notes, created_at, updated_at
     FROM affiliates
     WHERE LOWER(code) = LOWER($1) AND status = 'active'
     LIMIT 1`,
    [code.trim()],
  );
  return rows[0] ?? null;
}

export async function findAffiliateById(
  pool: Pool,
  id: string,
): Promise<AffiliateRow | null> {
  const { rows } = await pool.query<AffiliateRow>(
    `SELECT id, code, name, email, commission_percent, status, default_coupon_id, notes, created_at, updated_at
     FROM affiliates WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function recordAffiliateEvent(
  pool: Pool,
  payload: {
    affiliateId: string;
    eventType: AffiliateEventType;
    sessionId?: string | null;
    organizationId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await pool.query(
    `INSERT INTO affiliate_events (affiliate_id, event_type, session_id, organization_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      payload.affiliateId,
      payload.eventType,
      payload.sessionId ?? null,
      payload.organizationId ?? null,
      JSON.stringify(payload.metadata ?? {}),
    ],
  );
}

export function generateAffiliateCode(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || 'AFF'}${suffix}`;
}
