import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { EnvironmentConfig } from '../env.js';
import { buildRequireAuth } from '../auth/middleware.js';
import { buildRequirePlatformAdmin } from '../auth/platformAdmin.js';
import type { MailClient } from '../mail/client.js';
import { scheduleNewsletterForPost } from '../services/blogNewsletter.js';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

const postBodySchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).optional(),
  summary: z.string().nullable().optional(),
  cover_image: z.string().nullable().optional(),
  author_name: z.string().nullable().optional(),
  author_social: z.string().nullable().optional(),
  content: z.array(z.record(z.string(), z.unknown())).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export function createAdminPostsRouter(deps: {
  pool: Pool;
  config: EnvironmentConfig;
  mail: MailClient;
}) {
  const router = Router();
  const { pool, config, mail } = deps;
  const requireAuth = buildRequireAuth(config.auth);
  const requirePlatformAdmin = buildRequirePlatformAdmin({ pool, config });

  router.use(requireAuth);
  router.use(requirePlatformAdmin);

  router.get('/admin/posts', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, title, slug, summary, cover_image, status, published_at, created_at, updated_at, tags
         FROM posts ORDER BY updated_at DESC`,
      );
      res.json({ posts: rows });
    } catch (err) {
      console.error('[admin/posts]', err);
      res.status(500).json({ error: 'Erro ao listar posts' });
    }
  });

  router.post('/admin/posts', async (req: Request, res: Response) => {
    try {
      const parsed = postBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos' });
        return;
      }
      const d = parsed.data;
      const slug = d.slug || slugify(d.title);
      const { rows } = await pool.query(
        `INSERT INTO posts (title, slug, summary, cover_image, author_name, author_social, content, tags, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          d.title,
          slug,
          d.summary ?? null,
          d.cover_image ?? null,
          d.author_name ?? null,
          d.author_social ?? null,
          JSON.stringify(d.content ?? []),
          d.tags ?? [],
          d.status ?? 'draft',
        ],
      );
      res.status(201).json({ post: rows[0] });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === '23505') {
        res.status(409).json({ error: 'Slug já existe' });
        return;
      }
      console.error('[admin/posts POST]', err);
      res.status(500).json({ error: 'Erro ao criar post' });
    }
  });

  router.get('/admin/posts/:id', async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM posts WHERE id = $1`, [req.params.id]);
      if (!rows[0]) {
        res.status(404).json({ error: 'Post não encontrado' });
        return;
      }
      res.json({ post: rows[0] });
    } catch (err) {
      console.error('[admin/posts GET]', err);
      res.status(500).json({ error: 'Erro ao carregar post' });
    }
  });

  router.patch('/admin/posts/:id', async (req: Request, res: Response) => {
    try {
      const parsed = postBodySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos' });
        return;
      }
      const { rows: existing } = await pool.query<{ status: string; published_at: string | null }>(
        `SELECT status, published_at FROM posts WHERE id = $1`,
        [req.params.id],
      );
      if (!existing[0]) {
        res.status(404).json({ error: 'Post não encontrado' });
        return;
      }

      const d = parsed.data;
      const fields: string[] = [];
      const values: unknown[] = [];
      let i = 1;

      const setField = (col: string, val: unknown) => {
        fields.push(`${col} = $${i++}`);
        values.push(val);
      };

      if (d.title !== undefined) setField('title', d.title);
      if (d.slug !== undefined) setField('slug', d.slug);
      if (d.summary !== undefined) setField('summary', d.summary);
      if (d.cover_image !== undefined) setField('cover_image', d.cover_image);
      if (d.author_name !== undefined) setField('author_name', d.author_name);
      if (d.author_social !== undefined) setField('author_social', d.author_social);
      if (d.content !== undefined) setField('content', JSON.stringify(d.content));
      if (d.tags !== undefined) setField('tags', d.tags);
      if (d.status !== undefined) setField('status', d.status);

      if (fields.length === 0) {
        res.status(400).json({ error: 'Nada para atualizar' });
        return;
      }

      values.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE posts SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
        values,
      );
      const post = rows[0];
      const wasPublished = existing[0].status === 'published';
      const nowPublished = post.status === 'published';
      const firstPublish = !wasPublished && nowPublished && !existing[0].published_at;

      if (firstPublish) {
        scheduleNewsletterForPost({
          pool,
          mail,
          appUrl: config.appUrl,
          post: {
            id: post.id,
            title: post.title,
            slug: post.slug,
            summary: post.summary,
            cover_image: post.cover_image,
          },
        });
      }

      res.json({ post });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === '23505') {
        res.status(409).json({ error: 'Slug já existe' });
        return;
      }
      console.error('[admin/posts PATCH]', err);
      res.status(500).json({ error: 'Erro ao atualizar post' });
    }
  });

  router.delete('/admin/posts/:id', async (req: Request, res: Response) => {
    try {
      await pool.query(`DELETE FROM posts WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error('[admin/posts DELETE]', err);
      res.status(500).json({ error: 'Erro ao excluir post' });
    }
  });

  return router;
}
