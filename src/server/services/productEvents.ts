import type { Pool } from 'pg';

export async function trackProductEvent(
  pool: Pool,
  payload: {
    organizationId?: string | null;
    userId?: string | null;
    eventName: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO product_events (organization_id, user_id, event_name, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        payload.organizationId ?? null,
        payload.userId ?? null,
        payload.eventName,
        JSON.stringify(payload.metadata ?? {}),
      ],
    );
  } catch (err) {
    // Tabela pode não existir antes da migração
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[product_events] track falhou:', err);
    }
  }
}
