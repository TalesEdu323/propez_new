import type { Request, Response, Router } from 'express'
import type { Pool } from 'pg'
import Stripe from 'stripe'
import type { EnvironmentConfig } from '../env.js'
import { listOpenAlerts, refreshAdminAlerts } from '../services/adminAlerts.js'
import { fetchAllOrgsWithHealth, computeOrgHealthScore } from '../services/healthScore.js'
import { isOrgActiveForMrr, mrrBrlForPlan, mrrCentsForPlan } from '../services/mrrPricing.js'
import { computeCurrentMrr, snapshotMrrForDate } from '../services/mrrSnapshot.js'
import { createStripeClient, fetchStripeDunningSummary } from '../services/stripeMetrics.js'

export function registerAdminAnalyticsRoutes(
  router: Router,
  deps: { pool: Pool; config: EnvironmentConfig; stripe: Stripe },
): void {
  const { pool, config, stripe } = deps
  const stripeMetrics = createStripeClient(
    config.stripeSecretKey,
    process.env.STRIPE_RESTRICTED_KEY,
  )

  router.get('/revenue/overview', async (_req: Request, res: Response) => {
    try {
      const { totalMrrCents, mrrByPlan, activeOrgs } = await computeCurrentMrr(pool)

      const prevMonth = await pool.query<{ total_mrr_cents: string }>(
        `SELECT total_mrr_cents::text FROM mrr_snapshots
         WHERE snapshot_date <= (CURRENT_DATE - INTERVAL '1 month')::date
         ORDER BY snapshot_date DESC LIMIT 1`,
      )
      const prevMrr = Number(prevMonth.rows[0]?.total_mrr_cents ?? 0)
      const mrrMomPct =
        prevMrr > 0 ? ((totalMrrCents - prevMrr) / prevMrr) * 100 : totalMrrCents > 0 ? 100 : 0

      const failedRes = await pool.query<{ d7: string; d30: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::text AS d7,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::text AS d30
         FROM stripe_payments WHERE status = 'failed'`,
      )

      const nrrRes = await pool.query<{ start_mrr: string; end_mrr: string }>(
        `SELECT
           (SELECT total_mrr_cents FROM mrr_snapshots
            WHERE snapshot_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            ORDER BY snapshot_date ASC LIMIT 1)::text AS start_mrr,
           (SELECT total_mrr_cents FROM mrr_snapshots
            ORDER BY snapshot_date DESC LIMIT 1)::text AS end_mrr`,
      )
      const startMrr = Number(nrrRes.rows[0]?.start_mrr ?? totalMrrCents)
      const endMrr = Number(nrrRes.rows[0]?.end_mrr ?? totalMrrCents)
      const nrr = startMrr > 0 ? (endMrr / startMrr) * 100 : 100

      const churnRes = await pool.query<{ cnt: string }>(
        `SELECT COUNT(DISTINCT organization_id)::text AS cnt FROM subscription_events
         WHERE event_type = 'cancel' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      )
      const churnCount = Number(churnRes.rows[0]?.cnt ?? 0)
      const logoChurnRate = activeOrgs > 0 ? (churnCount / activeOrgs) * 100 : 0

      const trialConv = await pool.query<{ trials: string; converted: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE trial_ends_at IS NOT NULL)::text AS trials,
           COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL AND plan <> 'free')::text AS converted
         FROM organizations`,
      )
      const trials = Number(trialConv.rows[0]?.trials ?? 0)
      const converted = Number(trialConv.rows[0]?.converted ?? 0)
      const trialToPaidRate = trials > 0 ? (converted / trials) * 100 : 0

      let dunning = { pastDueCount: 0, pastDueMrrCents: 0, mrrDivergence: false }
      try {
        dunning = await fetchStripeDunningSummary(stripeMetrics, pool)
      } catch {
        /* stripe opcional */
      }

      return res.json({
        mrrCents: totalMrrCents,
        mrrBrl: totalMrrCents / 100,
        mrrMomPct,
        arrCents: totalMrrCents * 12,
        arpuCents: activeOrgs > 0 ? Math.round(totalMrrCents / activeOrgs) : 0,
        activePaidOrgs: activeOrgs,
        nrr,
        logoChurnRate,
        trialToPaidRate,
        mrrByPlan: Object.fromEntries(
          Object.entries(mrrByPlan).map(([k, v]) => [k, v / 100]),
        ),
        failedPayments: {
          last7Days: Number(failedRes.rows[0]?.d7 ?? 0),
          last30Days: Number(failedRes.rows[0]?.d30 ?? 0),
        },
        dunning,
      })
    } catch (err) {
      console.error('[admin/revenue/overview] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar receita' })
    }
  })

  router.get('/revenue/mrr-history', async (req: Request, res: Response) => {
    const months = Math.min(24, Math.max(1, Number(req.query.months) || 12))
    try {
      const { rows } = await pool.query(
        `SELECT snapshot_date, total_mrr_cents, is_estimated
         FROM mrr_snapshots
         WHERE snapshot_date >= CURRENT_DATE - ($1::int || ' months')::interval
         ORDER BY snapshot_date ASC`,
        [months],
      )
      if (rows.length === 0) {
        const { backfillEstimatedSnapshots } = await import('../services/mrrSnapshot.js')
        await backfillEstimatedSnapshots(pool, months)
        const again = await pool.query(
          `SELECT snapshot_date, total_mrr_cents, is_estimated
           FROM mrr_snapshots ORDER BY snapshot_date ASC`,
        )
        return res.json({
          points: again.rows.map((r: { snapshot_date: Date; total_mrr_cents: string; is_estimated: boolean }) => ({
            date: r.snapshot_date,
            mrrCents: Number(r.total_mrr_cents),
            estimated: r.is_estimated,
          })),
        })
      }
      return res.json({
        points: rows.map((r: { snapshot_date: Date; total_mrr_cents: string; is_estimated: boolean }) => ({
          date: r.snapshot_date,
          mrrCents: Number(r.total_mrr_cents),
          estimated: r.is_estimated,
        })),
      })
    } catch (err) {
      console.error('[admin/revenue/mrr-history] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar histórico MRR' })
    }
  })

  router.get('/revenue/mrr-breakdown', async (req: Request, res: Response) => {
    const period = req.query.period === 'week' ? 'week' : 'month'
    try {
      const { rows } = await pool.query<{
        new_mrr: string
        expansion: string
        contraction: string
        churn: string
        reactivation: string
      }>(
        period === 'week'
          ? `SELECT
               COALESCE(SUM(new_mrr_cents),0)::text AS new_mrr,
               COALESCE(SUM(expansion_cents),0)::text AS expansion,
               COALESCE(SUM(contraction_cents),0)::text AS contraction,
               COALESCE(SUM(churn_cents),0)::text AS churn,
               COALESCE(SUM(reactivation_cents),0)::text AS reactivation
             FROM mrr_snapshots WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'`
          : `SELECT
               COALESCE(SUM(new_mrr_cents),0)::text AS new_mrr,
               COALESCE(SUM(expansion_cents),0)::text AS expansion,
               COALESCE(SUM(contraction_cents),0)::text AS contraction,
               COALESCE(SUM(churn_cents),0)::text AS churn,
               COALESCE(SUM(reactivation_cents),0)::text AS reactivation
             FROM mrr_snapshots WHERE snapshot_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      )
      const r = rows[0]
      return res.json({
        newMrrCents: Number(r?.new_mrr ?? 0),
        expansionCents: Number(r?.expansion ?? 0),
        contractionCents: Number(r?.contraction ?? 0),
        churnCents: Number(r?.churn ?? 0),
        reactivationCents: Number(r?.reactivation ?? 0),
      })
    } catch (err) {
      console.error('[admin/revenue/mrr-breakdown] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar breakdown MRR' })
    }
  })

  router.get('/alerts', async (_req: Request, res: Response) => {
    try {
      const alerts = await listOpenAlerts(pool)
      return res.json({ alerts, count: alerts.length })
    } catch (err) {
      console.error('[admin/alerts] erro:', err)
      return res.status(500).json({ error: 'Erro ao listar alertas' })
    }
  })

  router.post('/alerts/refresh', async (_req: Request, res: Response) => {
    try {
      const n = await refreshAdminAlerts(pool)
      const alerts = await listOpenAlerts(pool)
      return res.json({ refreshed: n, alerts })
    } catch (err) {
      console.error('[admin/alerts/refresh] erro:', err)
      return res.status(500).json({ error: 'Erro ao atualizar alertas' })
    }
  })

  router.post('/alerts/:id/resolve', async (req: Request, res: Response) => {
    try {
      await pool.query(
        `UPDATE admin_alerts SET resolved_at = NOW() WHERE id = $1 AND resolved_at IS NULL`,
        [req.params.id],
      )
      return res.json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao resolver alerta' })
    }
  })

  router.get('/retention/overview', async (_req: Request, res: Response) => {
    try {
      const cancels = await pool.query<{ cnt: string; revenue: string }>(
        `SELECT COUNT(*)::text AS cnt,
                COALESCE(SUM(ABS(mrr_delta_cents)),0)::text AS revenue
         FROM subscription_events
         WHERE event_type = 'cancel' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      )
      const expansion = await pool.query<{ up: string; down: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE event_type = 'upgrade')::text AS up,
           COUNT(*) FILTER (WHERE event_type = 'downgrade')::text AS down
         FROM subscription_events
         WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      )
      const byPlan = await pool.query<{ plan: string; cnt: string }>(
        `SELECT COALESCE(plan,'free') AS plan, COUNT(*)::text AS cnt
         FROM organizations
         WHERE plan <> 'free' OR stripe_subscription_id IS NOT NULL
         GROUP BY plan`,
      )
      return res.json({
        monthlyLogoChurn: Number(cancels.rows[0]?.cnt ?? 0),
        monthlyRevenueChurnCents: Number(cancels.rows[0]?.revenue ?? 0),
        upgradesThisMonth: Number(expansion.rows[0]?.up ?? 0),
        downgradesThisMonth: Number(expansion.rows[0]?.down ?? 0),
        activeByPlan: byPlan.rows.map((r) => ({
          plan: r.plan,
          count: Number(r.cnt),
        })),
      })
    } catch (err) {
      console.error('[admin/retention/overview] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar retenção' })
    }
  })

  router.get('/retention/cohorts', async (req: Request, res: Response) => {
    const months = Math.min(12, Math.max(3, Number(req.query.months) || 12))
    try {
      const { rows } = await pool.query<{
        cohort_month: string
        cohort_size: string
        retained: string
      }>(
        `WITH cohorts AS (
           SELECT id, DATE_TRUNC('month', created_at) AS cohort_month, created_at
           FROM organizations
           WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - ($1::int || ' months')::interval
         )
         SELECT
           TO_CHAR(c.cohort_month, 'YYYY-MM') AS cohort_month,
           COUNT(*)::text AS cohort_size,
           COUNT(*) FILTER (
             WHERE o.plan <> 'free' OR o.stripe_subscription_id IS NOT NULL
               OR (o.trial_ends_at IS NOT NULL AND o.trial_ends_at > NOW())
           )::text AS retained
         FROM cohorts c
         JOIN organizations o ON o.id = c.id
         GROUP BY c.cohort_month
         ORDER BY c.cohort_month`,
        [months],
      )
      return res.json({
        cohorts: rows.map((r) => ({
          month: r.cohort_month,
          size: Number(r.cohort_size),
          retained: Number(r.retained),
          retentionPct:
            Number(r.cohort_size) > 0
              ? (Number(r.retained) / Number(r.cohort_size)) * 100
              : 0,
        })),
      })
    } catch (err) {
      console.error('[admin/retention/cohorts] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar cohorts' })
    }
  })

  router.get('/retention/at-risk', async (_req: Request, res: Response) => {
    try {
      const all = await fetchAllOrgsWithHealth(pool)
      const atRisk = all.filter((o) => o.health.level !== 'green').slice(0, 50)
      return res.json({ organizations: atRisk })
    } catch (err) {
      console.error('[admin/retention/at-risk] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar clientes em risco' })
    }
  })

  router.get('/product/activity', async (_req: Request, res: Response) => {
    try {
      const q = await pool.query<{ dau: string; wau: string; mau: string }>(
        `SELECT
           (SELECT COUNT(DISTINCT user_id)::text FROM product_events
            WHERE event_name = 'login' AND created_at >= CURRENT_DATE) AS dau,
           (SELECT COUNT(DISTINCT user_id)::text FROM product_events
            WHERE event_name = 'login' AND created_at >= CURRENT_DATE - INTERVAL '7 days') AS wau,
           (SELECT COUNT(DISTINCT user_id)::text FROM product_events
            WHERE event_name = 'login' AND created_at >= CURRENT_DATE - INTERVAL '30 days') AS mau`,
      )
      const r = q.rows[0]
      const dau = Number(r?.dau ?? 0)
      const mau = Number(r?.mau ?? 0)
      return res.json({
        dau,
        wau: Number(r?.wau ?? 0),
        mau,
        stickiness: mau > 0 ? (dau / mau) * 100 : 0,
      })
    } catch (err) {
      console.error('[admin/product/activity] erro:', err)
      return res.status(500).json({ error: 'Erro ao buscar atividade' })
    }
  })

  router.get('/product/activation', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{ total: string; activated: string }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (
             WHERE o.onboarded = TRUE AND EXISTS (
               SELECT 1 FROM propostas p
               WHERE p.organization_id = o.id
                 AND p.data_envio IS NOT NULL
                 AND p.created_at <= o.created_at + INTERVAL '14 days'
             )
           )::text AS activated
         FROM organizations o
         WHERE o.created_at >= CURRENT_DATE - INTERVAL '90 days'`,
      )
      const total = Number(rows[0]?.total ?? 0)
      const activated = Number(rows[0]?.activated ?? 0)
      return res.json({
        totalRecentOrgs: total,
        activated,
        activationRate: total > 0 ? (activated / total) * 100 : 0,
      })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar ativação' })
    }
  })

  router.get('/product/adoption', async (_req: Request, res: Response) => {
    try {
      const events = await pool.query<{ event_name: string; cnt: string }>(
        `SELECT event_name, COUNT(*)::text AS cnt FROM product_events
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
         GROUP BY event_name ORDER BY COUNT(*) DESC LIMIT 10`,
      )
      const usage = await pool.query<{ metric: string; total: string }>(
        `SELECT 'propostas' AS metric, COALESCE(SUM(propostas),0)::text AS total FROM usage_counters
         WHERE month_key = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
         UNION ALL
         SELECT 'ia_geracoes', COALESCE(SUM(ia_geracoes),0)::text FROM usage_counters
         WHERE month_key = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
         UNION ALL
         SELECT 'rubrica', COALESCE(SUM(rubrica_assinaturas),0)::text FROM usage_counters
         WHERE month_key = TO_CHAR(CURRENT_DATE, 'YYYY-MM')`,
      )
      return res.json({
        events: events.rows.map((r) => ({ name: r.event_name, count: Number(r.cnt) })),
        usageThisMonth: usage.rows.map((r) => ({ metric: r.metric, total: Number(r.total) })),
      })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar adoption' })
    }
  })

  router.get('/product/by-plan', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{ plan: string; avg_propostas: string }>(
        `SELECT COALESCE(o.plan,'free') AS plan,
                COALESCE(AVG(uc.propostas),0)::text AS avg_propostas
         FROM organizations o
         LEFT JOIN usage_counters uc ON uc.organization_id = o.id
           AND uc.month_key = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
         GROUP BY o.plan`,
      )
      return res.json({
        plans: rows.map((r) => ({ plan: r.plan, avgPropostas: Number(r.avg_propostas) })),
      })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar uso por plano' })
    }
  })

  router.get('/acquisition/overview', async (_req: Request, res: Response) => {
    try {
      const signups = await pool.query<{ today: string; week: string; month: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE DATE(created_at)=CURRENT_DATE)::text AS today,
           COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::text AS week,
           COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month',CURRENT_DATE))::text AS month
         FROM organizations`,
      )
      const trials = await pool.query<{ starts: string; converted: string; avg_days: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE trial_ends_at IS NOT NULL)::text AS starts,
           COUNT(*) FILTER (WHERE stripe_subscription_id IS NOT NULL)::text AS converted,
           COALESCE(AVG(EXTRACT(EPOCH FROM (plan_started_at - created_at))/86400)
             FILTER (WHERE plan_started_at IS NOT NULL),0)::text AS avg_days
         FROM organizations`,
      )
      return res.json({
        signups: {
          today: Number(signups.rows[0]?.today ?? 0),
          week: Number(signups.rows[0]?.week ?? 0),
          month: Number(signups.rows[0]?.month ?? 0),
        },
        trialStarts: Number(trials.rows[0]?.starts ?? 0),
        trialConverted: Number(trials.rows[0]?.converted ?? 0),
        avgDaysToConvert: Number(trials.rows[0]?.avg_days ?? 0),
      })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar aquisição' })
    }
  })

  router.get('/acquisition/funnel', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{
        signups: string
        verified: string
        onboarded: string
        first_proposal: string
        paid: string
      }>(
        `SELECT
           (SELECT COUNT(*)::text FROM organizations) AS signups,
           (SELECT COUNT(DISTINCT o.id)::text FROM organizations o
            JOIN memberships m ON m.organization_id = o.id
            JOIN users u ON u.id = m.user_id WHERE u.email_verified_at IS NOT NULL) AS verified,
           (SELECT COUNT(*)::text FROM organizations WHERE onboarded = TRUE) AS onboarded,
           (SELECT COUNT(DISTINCT organization_id)::text FROM propostas) AS first_proposal,
           (SELECT COUNT(*)::text FROM organizations WHERE stripe_subscription_id IS NOT NULL) AS paid`,
      )
      const r = rows[0]
      return res.json({
        signups: Number(r?.signups ?? 0),
        emailVerified: Number(r?.verified ?? 0),
        onboarded: Number(r?.onboarded ?? 0),
        withProposal: Number(r?.first_proposal ?? 0),
        paid: Number(r?.paid ?? 0),
      })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar funil' })
    }
  })

  router.get('/operations/overview', async (_req: Request, res: Response) => {
    try {
      const health = await pool.query<{ ok_pct: string; avg_latency: string }>(
        `SELECT
           (COUNT(*) FILTER (WHERE ok = TRUE)::float / NULLIF(COUNT(*),0) * 100)::text AS ok_pct,
           COALESCE(AVG(latency_ms) FILTER (WHERE ok = TRUE),0)::text AS avg_latency
         FROM health_checks
         WHERE checked_at >= NOW() - INTERVAL '30 days'`,
      )
      const errors = await pool.query<{ route_pattern: string; error_count: string }>(
        `SELECT route_pattern, SUM(error_count)::text AS error_count
         FROM api_error_stats
         WHERE stat_date >= CURRENT_DATE - INTERVAL '7 days' AND status_code >= 500
         GROUP BY route_pattern ORDER BY SUM(error_count) DESC LIMIT 5`,
      )
      return res.json({
        uptimePct30d: Number(health.rows[0]?.ok_pct ?? 100),
        avgLatencyMs: Number(health.rows[0]?.avg_latency ?? 0),
        topErrors: errors.rows.map((r) => ({
          route: r.route_pattern,
          count: Number(r.error_count),
        })),
        supportDashboardUrl: process.env.SUPPORT_DASHBOARD_URL || null,
      })
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao buscar operações' })
    }
  })

  router.post('/operations/snapshot-health', async (_req: Request, res: Response) => {
    try {
      const start = Date.now()
      await pool.query('SELECT 1')
      const latency = Date.now() - start
      await pool.query(
        `INSERT INTO health_checks (ok, latency_ms) VALUES (TRUE, $1)`,
        [latency],
      )
      return res.json({ ok: true, latencyMs: latency })
    } catch {
      await pool.query(`INSERT INTO health_checks (ok, latency_ms) VALUES (FALSE, NULL)`)
      return res.status(500).json({ ok: false })
    }
  })

  router.patch('/organizations/:id/cs-notes', async (req: Request, res: Response) => {
    const notes = typeof req.body?.csNotes === 'string' ? req.body.csNotes : ''
    try {
      await pool.query(`UPDATE organizations SET cs_notes = $2 WHERE id = $1`, [
        req.params.id,
        notes,
      ])
      return res.json({ ok: true })
    } catch {
      return res.status(500).json({ error: 'Erro ao salvar notas' })
    }
  })
}

export async function enrichOrgDetail(
  pool: Pool,
  orgId: string,
  base: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const orgRow = await pool.query(
    `SELECT id, name, plan, billing_cycle, trial_ends_at, stripe_subscription_id,
            onboarded, created_at, cs_notes
     FROM organizations WHERE id = $1`,
    [orgId],
  )
  const org = orgRow.rows[0]
  if (!org) return base

  const health = await computeOrgHealthScore(pool, org)
  const events = await pool.query(
    `SELECT event_type, from_plan, to_plan, mrr_delta_cents, metadata, created_at
     FROM subscription_events WHERE organization_id = $1
     ORDER BY created_at DESC LIMIT 20`,
    [orgId],
  )
  const productEv = await pool.query(
    `SELECT event_name, created_at FROM product_events
     WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [orgId],
  )
  const usage = await pool.query(
    `SELECT month_key, propostas, ia_geracoes, rubrica_assinaturas
     FROM usage_counters WHERE organization_id = $1 ORDER BY month_key DESC LIMIT 6`,
    [orgId],
  )

  return {
    ...base,
    organization: {
      ...(base.organization as object),
      csNotes: org.cs_notes,
      health,
      mrrBrl: isOrgActiveForMrr(org) ? mrrBrlForPlan(org.plan, org.billing_cycle) : 0,
    },
    subscriptionEvents: events.rows,
    productEvents: productEv.rows,
    usageHistory: usage.rows,
  }
}
