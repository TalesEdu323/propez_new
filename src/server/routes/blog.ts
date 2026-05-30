import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';

export function createBlogRouter(deps: { pool: Pool }) {
  const router = Router();
  const { pool } = deps;

  router.get('/blog/posts', async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
      const search = String(req.query.search || '').trim();
      const tag = String(req.query.tag || '').trim();
      const offset = (page - 1) * limit;

      let where = `WHERE status = 'published'`;
      const params: unknown[] = [];
      let idx = 1;

      if (search) {
        where += ` AND (title ILIKE $${idx} OR summary ILIKE $${idx})`;
        params.push(`%${search}%`);
        idx++;
      }
      if (tag) {
        where += ` AND tags IS NOT NULL AND $${idx} = ANY(tags)`;
        params.push(tag);
        idx++;
      }

      const { rows: posts } = await pool.query(
        `SELECT id, title, slug, summary, cover_image, author_name, author_social,
                created_at, published_at, tags
         FROM posts ${where}
         ORDER BY published_at DESC NULLS LAST, created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      );

      const countParams = params.slice();
      const { rows: countRows } = await pool.query(
        `SELECT COUNT(*)::int AS total FROM posts ${where}`,
        countParams,
      );

      res.json({
        posts,
        pagination: { page, limit, total: countRows[0]?.total ?? 0 },
      });
    } catch (err) {
      console.error('[blog/posts]', err);
      res.status(500).json({ error: 'Erro ao listar posts' });
    }
  });

  router.get('/blog/posts/:slug', async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      const { rows } = await pool.query(
        `SELECT id, title, slug, summary, cover_image, author_name, author_social,
                content, tags, created_at, published_at
         FROM posts WHERE slug = $1 AND status = 'published'`,
        [slug],
      );
      if (!rows[0]) {
        res.status(404).json({ error: 'Post não encontrado' });
        return;
      }
      res.json({ post: rows[0] });
    } catch (err) {
      console.error('[blog/post]', err);
      res.status(500).json({ error: 'Erro ao carregar post' });
    }
  });

  router.get('/blog/tags', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT DISTINCT unnest(tags) AS tag FROM posts WHERE status = 'published' AND tags IS NOT NULL ORDER BY tag`,
      );
      res.json({ tags: rows.map((r: { tag: string }) => r.tag) });
    } catch (err) {
      console.error('[blog/tags]', err);
      res.status(500).json({ error: 'Erro ao listar tags' });
    }
  });

  const analyticsSchema = z.object({
    postId: z.string().uuid(),
    sessionId: z.string().max(255).optional(),
    eventType: z.enum(['view', 'click', 'time_on_page']),
    eventData: z.record(z.string(), z.unknown()).optional(),
  });

  router.post('/blog/analytics', async (req: Request, res: Response) => {
    try {
      const parsed = analyticsSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos' });
        return;
      }
      const { postId, sessionId, eventType, eventData } = parsed.data;
      await pool.query(
        `INSERT INTO post_analytics (post_id, session_id, event_type, event_data)
         VALUES ($1, $2, $3, $4)`,
        [postId, sessionId ?? null, eventType, eventData ? JSON.stringify(eventData) : null],
      );
      res.json({ ok: true });
    } catch (err) {
      console.error('[blog/analytics]', err);
      res.status(500).json({ error: 'Erro ao registrar analytics' });
    }
  });

  return router;
}
