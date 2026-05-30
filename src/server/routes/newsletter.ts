import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';

export function createNewsletterRouter(deps: { pool: Pool }) {
  const router = Router();
  const { pool } = deps;

  const subscribeSchema = z.object({
    email: z.string().email(),
    name: z.string().max(255).optional(),
    source: z.string().max(100).optional(),
  });

  router.post('/newsletter/subscribe', async (req: Request, res: Response) => {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Email inválido' });
        return;
      }
      const { email, name, source } = parsed.data;
      await pool.query(
        `INSERT INTO newsletter_subscribers (email, name, source, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (email) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, newsletter_subscribers.name),
           status = 'active',
           unsubscribed_at = NULL`,
        [email.toLowerCase(), name ?? null, source ?? 'blog'],
      );
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
