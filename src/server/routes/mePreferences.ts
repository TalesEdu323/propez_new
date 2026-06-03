import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { EnvironmentConfig } from '../env.js';
import { buildRequireAuth } from '../auth/middleware.js';

const patchSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.unknown(),
});

export function createMePreferencesRouter(deps: { pool: Pool; config: EnvironmentConfig }) {
  const router = Router();
  const { pool, config } = deps;
  const requireAuth = buildRequireAuth(config.auth);

  router.get('/me/preferences', requireAuth, async (req: Request, res: Response) => {
    try {
      const key = typeof req.query.key === 'string' ? req.query.key.trim() : '';
      const userId = req.auth!.userId;

      if (key) {
        const row = await pool.query<{ pref_value: unknown }>(
          `SELECT pref_value FROM user_ui_preferences WHERE user_id = $1 AND pref_key = $2`,
          [userId, key],
        );
        res.json({ key, value: row.rows[0]?.pref_value ?? null });
        return;
      }

      const rows = await pool.query<{ pref_key: string; pref_value: unknown }>(
        `SELECT pref_key, pref_value FROM user_ui_preferences WHERE user_id = $1`,
        [userId],
      );
      const prefs: Record<string, unknown> = {};
      for (const r of rows.rows) {
        prefs[r.pref_key] = r.pref_value;
      }
      res.json({ prefs });
    } catch (err) {
      console.error('[me/preferences GET]', err);
      res.status(500).json({ error: 'Erro ao carregar preferências' });
    }
  });

  router.patch('/me/preferences', requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Dados inválidos' });
        return;
      }
      const { key, value } = parsed.data;
      const userId = req.auth!.userId;
      await pool.query(
        `INSERT INTO user_ui_preferences (user_id, pref_key, pref_value, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW())
         ON CONFLICT (user_id, pref_key) DO UPDATE SET
           pref_value = EXCLUDED.pref_value,
           updated_at = NOW()`,
        [userId, key, JSON.stringify(value)],
      );
      res.json({ ok: true, key, value });
    } catch (err) {
      console.error('[me/preferences PATCH]', err);
      res.status(500).json({ error: 'Erro ao salvar preferência' });
    }
  });

  return router;
}
