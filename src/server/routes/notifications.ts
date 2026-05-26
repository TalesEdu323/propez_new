import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import type { EnvironmentConfig } from '../env.js';
import { buildRequireAuth } from '../auth/middleware.js';

export function createNotificationsRouter(deps: {
  pool: Pool;
  config: EnvironmentConfig;
}): Router {
  const { pool, config } = deps;
  const router = express.Router();
  const requireAuth = buildRequireAuth(config.auth);

  router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const { rows } = await pool.query<{
        id: string;
        type: string;
        title: string;
        message: string;
        action_url: string | null;
        action_label: string | null;
        metadata: Record<string, unknown>;
        read_at: string | null;
        created_at: string;
      }>(
        `SELECT id, type, title, message, action_url, action_label, metadata, read_at, created_at
         FROM notifications
         WHERE user_id = $1 AND organization_id = $2
         ORDER BY created_at DESC
         LIMIT $3`,
        [req.auth.userId, req.auth.orgId, limit],
      );

      const unread = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM notifications
         WHERE user_id = $1 AND organization_id = $2 AND read_at IS NULL`,
        [req.auth.userId, req.auth.orgId],
      );

      return res.json({
        unreadCount: Number(unread.rows[0]?.count ?? 0),
        items: rows.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          actionUrl: n.action_url,
          actionLabel: n.action_label,
          metadata: n.metadata ?? {},
          readAt: n.read_at,
          date: n.created_at,
        })),
      });
    } catch (err) {
      console.error('[notifications] list erro:', err);
      return res.status(500).json({ error: 'Erro ao buscar notificações' });
    }
  });

  router.patch('/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    try {
      const { rowCount } = await pool.query(
        `UPDATE notifications SET read_at = NOW()
         WHERE id = $1 AND user_id = $2 AND organization_id = $3 AND read_at IS NULL`,
        [req.params.id, req.auth.userId, req.auth.orgId],
      );
      if (!rowCount) return res.status(404).json({ error: 'Notificação não encontrada' });
      return res.json({ ok: true });
    } catch (err) {
      console.error('[notifications] read erro:', err);
      return res.status(500).json({ error: 'Erro ao marcar notificação' });
    }
  });

  router.post('/notifications/read-all', requireAuth, async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    try {
      await pool.query(
        `UPDATE notifications SET read_at = NOW()
         WHERE user_id = $1 AND organization_id = $2 AND read_at IS NULL`,
        [req.auth.userId, req.auth.orgId],
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error('[notifications] read-all erro:', err);
      return res.status(500).json({ error: 'Erro ao marcar notificações' });
    }
  });

  return router;
}
