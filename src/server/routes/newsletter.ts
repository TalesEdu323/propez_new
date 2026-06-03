import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { EnvironmentConfig } from '../env.js';
import { ensureVisitorId, VISITOR_COOKIE } from '../services/siteVisitorCookie.js';

const DISMISS_DAYS = 7;

async function shouldShowNewsletterModal(
  pool: Pool,
  visitorId: string,
  email?: string,
): Promise<boolean> {
  const visitor = await pool.query<{
    dismissed_newsletter_until: Date | null;
    subscribed_email: string | null;
  }>(
    `SELECT dismissed_newsletter_until, subscribed_email FROM site_visitors WHERE visitor_id = $1`,
    [visitorId],
  );
  const row = visitor.rows[0];
  if (row?.dismissed_newsletter_until && new Date(row.dismissed_newsletter_until) > new Date()) {
    return false;
  }

  const emailsToCheck = new Set<string>();
  if (row?.subscribed_email) emailsToCheck.add(row.subscribed_email.toLowerCase());
  if (email) emailsToCheck.add(email.toLowerCase());

  for (const em of emailsToCheck) {
    const sub = await pool.query(
      `SELECT 1 FROM newsletter_subscribers WHERE LOWER(email) = $1 AND status = 'active' LIMIT 1`,
      [em],
    );
    if (sub.rowCount && sub.rowCount > 0) return false;
  }

  return true;
}

export function createNewsletterRouter(deps: { pool: Pool; config: EnvironmentConfig }) {
  const router = Router();
  const { pool, config } = deps;

  const subscribeSchema = z.object({
    email: z.string().email(),
    name: z.string().max(255).optional(),
    source: z.string().max(100).optional(),
  });

  router.get('/newsletter/modal-status', async (req: Request, res: Response) => {
    try {
      const visitorId = ensureVisitorId(req, res, config);
      await pool.query(
        `INSERT INTO site_visitors (visitor_id) VALUES ($1) ON CONFLICT (visitor_id) DO NOTHING`,
        [visitorId],
      );
      const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : undefined;
      const show = await shouldShowNewsletterModal(pool, visitorId, email);
      res.json({ show, visitorId });
    } catch (err) {
      console.error('[newsletter/modal-status]', err);
      res.status(500).json({ error: 'Erro ao verificar modal' });
    }
  });

  router.post('/newsletter/modal-dismiss', async (req: Request, res: Response) => {
    try {
      const visitorId = ensureVisitorId(req, res, config);
      await pool.query(
        `INSERT INTO site_visitors (visitor_id, dismissed_newsletter_until, updated_at)
         VALUES ($1, NOW() + make_interval(days => $2::int), NOW())
         ON CONFLICT (visitor_id) DO UPDATE SET
           dismissed_newsletter_until = NOW() + make_interval(days => $2::int),
           updated_at = NOW()`,
        [visitorId, DISMISS_DAYS],
      );
      res.json({ ok: true });
    } catch (err) {
      console.error('[newsletter/modal-dismiss]', err);
      res.status(500).json({ error: 'Erro ao registrar dispensa' });
    }
  });

  router.post('/newsletter/subscribe', async (req: Request, res: Response) => {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Email inválido' });
        return;
      }
      const { email, name, source } = parsed.data;
      const normalized = email.toLowerCase();
      await pool.query(
        `INSERT INTO newsletter_subscribers (email, name, source, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (email) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, newsletter_subscribers.name),
           status = 'active',
           unsubscribed_at = NULL`,
        [normalized, name ?? null, source ?? 'blog'],
      );

      const visitorId = req.cookies?.[VISITOR_COOKIE];
      if (typeof visitorId === 'string' && visitorId) {
        await pool.query(
          `INSERT INTO site_visitors (visitor_id, subscribed_email, dismissed_newsletter_until, updated_at)
           VALUES ($1, $2, NOW() + interval '100 years', NOW())
           ON CONFLICT (visitor_id) DO UPDATE SET
             subscribed_email = EXCLUDED.subscribed_email,
             dismissed_newsletter_until = NOW() + interval '100 years',
             updated_at = NOW()`,
          [visitorId, normalized],
        );
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('[newsletter/subscribe]', err);
      res.status(500).json({ error: 'Erro ao inscrever' });
    }
  });

  router.get('/newsletter/unsubscribe', async (req: Request, res: Response) => {
    try {
      const email = String(req.query.email || '').trim().toLowerCase();
      if (!email) {
        res.status(400).json({ error: 'Email obrigatório' });
        return;
      }
      await pool.query(
        `UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = NOW() WHERE email = $1`,
        [email],
      );
      res.json({ ok: true });
    } catch (err) {
      console.error('[newsletter/unsubscribe]', err);
      res.status(500).json({ error: 'Erro ao cancelar' });
    }
  });

  return router;
}
