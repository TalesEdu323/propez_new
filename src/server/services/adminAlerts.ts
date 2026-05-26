import type { Pool } from 'pg';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export async function upsertAdminAlert(
  pool: Pool,
  payload: {
    alertType: string;
    severity: AlertSeverity;
    organizationId?: string | null;
    title: string;
    body: string;
    dedupeKey: string;
  },
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO admin_alerts (alert_type, severity, organization_id, title, body, dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (dedupe_key) WHERE resolved_at IS NULL AND dedupe_key IS NOT NULL
       DO UPDATE SET
         title = EXCLUDED.title,
         body = EXCLUDED.body,
         severity = EXCLUDED.severity,
         created_at = NOW()`,
      [
        payload.alertType,
        payload.severity,
        payload.organizationId ?? null,
        payload.title,
        payload.body,
        payload.dedupeKey,
      ],
    );
  } catch (err) {
    console.error('[admin_alerts] upsert falhou:', err);
  }
}

export async function refreshAdminAlerts(pool: Pool): Promise<number> {
  let created = 0;

  const trials = await pool.query<{ id: string; name: string; trial_ends_at: Date }>(
    `SELECT id, name, trial_ends_at FROM organizations
     WHERE trial_ends_at IS NOT NULL
       AND trial_ends_at > NOW()
       AND trial_ends_at <= NOW() + INTERVAL '7 days'
       AND (stripe_subscription_id IS NULL OR plan = 'free')`,
  );
  for (const o of trials.rows) {
    await upsertAdminAlert(pool, {
      alertType: 'trial_expiring',
      severity: 'warning',
      organizationId: o.id,
      title: `Trial expirando: ${o.name}`,
      body: `Trial termina em ${new Date(o.trial_ends_at).toLocaleDateString('pt-BR')}.`,
      dedupeKey: `trial_expiring:${o.id}`,
    });
    created++;
  }

  const failed = await pool.query<{ organization_id: string; name: string; cnt: string }>(
    `SELECT sp.organization_id, o.name, COUNT(*)::text AS cnt
     FROM stripe_payments sp
     JOIN organizations o ON o.id = sp.organization_id
     WHERE sp.status = 'failed' AND sp.created_at >= NOW() - INTERVAL '30 days'
     GROUP BY sp.organization_id, o.name
     HAVING COUNT(*) >= 1`,
  );
  for (const row of failed.rows) {
    if (!row.organization_id) continue;
    await upsertAdminAlert(pool, {
      alertType: 'payment_failed',
      severity: 'critical',
      organizationId: row.organization_id,
      title: `Pagamento falhou: ${row.name}`,
      body: `${row.cnt} falha(s) nos últimos 30 dias.`,
      dedupeKey: `payment_failed:${row.organization_id}`,
    });
    created++;
  }

  const inactive = await pool.query<{ id: string; name: string }>(
    `SELECT o.id, o.name FROM organizations o
     WHERE o.plan <> 'free' OR o.stripe_subscription_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM memberships m
       JOIN users u ON u.id = m.user_id
       WHERE m.organization_id = o.id AND u.last_login_at >= NOW() - INTERVAL '30 days'
     )`,
  );
  for (const o of inactive.rows) {
    await upsertAdminAlert(pool, {
      alertType: 'inactive_org',
      severity: 'warning',
      organizationId: o.id,
      title: `Sem login há 30+ dias: ${o.name}`,
      body: 'Nenhum membro fez login no último mês.',
      dedupeKey: `inactive_org:${o.id}`,
    });
    created++;
  }

  const cancelSpike = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM subscription_events
     WHERE event_type = 'cancel' AND created_at >= NOW() - INTERVAL '7 days'`,
  );
  const weekCancels = Number(cancelSpike.rows[0]?.cnt ?? 0);
  const avgRes = await pool.query<{ avg: string }>(
    `SELECT COALESCE(AVG(wk.cnt), 0)::text AS avg FROM (
       SELECT COUNT(*) AS cnt FROM subscription_events
       WHERE event_type = 'cancel'
         AND created_at >= NOW() - INTERVAL '28 days'
         AND created_at < NOW() - INTERVAL '7 days'
       GROUP BY DATE_TRUNC('week', created_at)
     ) wk`,
  );
  const avgCancels = Number(avgRes.rows[0]?.avg ?? 0);
  if (weekCancels > 0 && weekCancels > Math.max(2, avgCancels * 2)) {
    await upsertAdminAlert(pool, {
      alertType: 'cancel_spike',
      severity: 'critical',
      title: 'Pico de cancelamentos',
      body: `${weekCancels} cancelamentos esta semana (média ~${avgCancels.toFixed(1)}).`,
      dedupeKey: 'cancel_spike:week',
    });
    created++;
  }

  return created;
}

export async function listOpenAlerts(pool: Pool) {
  const { rows } = await pool.query(
    `SELECT id, alert_type, severity, organization_id, title, body, created_at
     FROM admin_alerts
     WHERE resolved_at IS NULL
     ORDER BY
       CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
       created_at DESC
     LIMIT 100`,
  );
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id,
    alertType: r.alert_type,
    severity: r.severity,
    organizationId: r.organization_id,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
  }));
}
