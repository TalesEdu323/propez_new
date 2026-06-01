import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { EnvironmentConfig } from '../env.js';
import {
  getAllRequestFlowConfigs,
  setRequestFlowConfig,
  isAllowedIframeUrl,
} from '../services/platformSettings.js';
import { normalizeHexColor } from '../validation/brandColor.js';

const flowConfigSchema = z.object({
  mode: z.enum(['native', 'external']),
  externalUrl: z.string().url().nullable().optional(),
});

const platformSettingsPatchSchema = z.object({
  whitelabel: flowConfigSchema.optional(),
  enterprise: flowConfigSchema.optional(),
});

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().max(5000).optional().nullable(),
  enableWhitelabel: z.boolean().optional(),
});

function allowedIframeOrigins(config: EnvironmentConfig): string[] {
  const raw = process.env.ALLOWED_REQUEST_IFRAME_ORIGINS ?? '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function registerAdminServiceRequestRoutes(
  router: Router,
  deps: { pool: Pool; config: EnvironmentConfig },
): void {
  const { pool, config } = deps;

  router.get('/platform-settings', async (_req: Request, res: Response) => {
    try {
      const configs = await getAllRequestFlowConfigs(pool);
      return res.json(configs);
    } catch (err) {
      console.error('[admin/platform-settings] GET erro:', err);
      return res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
  });

  router.patch('/platform-settings', async (req: Request, res: Response) => {
    const parsed = platformSettingsPatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });
    const origins = allowedIframeOrigins(config);
    try {
      for (const type of ['whitelabel', 'enterprise'] as const) {
        const patch = parsed.data[type];
        if (!patch) continue;
        if (patch.mode === 'external' && patch.externalUrl) {
          if (!isAllowedIframeUrl(patch.externalUrl, origins)) {
            return res.status(400).json({
              error: `URL não permitida para iframe: ${patch.externalUrl}`,
            });
          }
        }
        await setRequestFlowConfig(pool, type, {
          mode: patch.mode,
          externalUrl: patch.externalUrl ?? null,
        });
      }
      const configs = await getAllRequestFlowConfigs(pool);
      return res.json(configs);
    } catch (err) {
      console.error('[admin/platform-settings] PATCH erro:', err);
      return res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  });

  router.get('/requests', async (req: Request, res: Response) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    try {
      const clauses: string[] = [];
      const params: unknown[] = [];
      if (status) {
        params.push(status);
        clauses.push(`sr.status = $${params.length}`);
      }
      if (type) {
        params.push(type);
        clauses.push(`sr.type = $${params.length}`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT sr.id, sr.type, sr.status, sr.payload, sr.admin_notes,
                sr.created_at, sr.reviewed_at,
                o.id AS org_id, o.name AS org_name,
                u.name AS user_name, u.email AS user_email
         FROM service_requests sr
         JOIN organizations o ON o.id = sr.organization_id
         JOIN users u ON u.id = sr.user_id
         ${where}
         ORDER BY sr.created_at DESC
         LIMIT 100`,
        params,
      );
      return res.json(
        rows.map((r) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          payload: r.payload,
          adminNotes: r.admin_notes,
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at,
          organization: { id: r.org_id, name: r.org_name },
          user: { name: r.user_name, email: r.user_email },
        })),
      );
    } catch (err) {
      console.error('[admin/requests] GET erro:', err);
      return res.status(500).json({ error: 'Erro ao listar solicitações' });
    }
  });

  router.patch('/requests/:id', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

    const { action, adminNotes, enableWhitelabel } = parsed.data;
    const status = action === 'approve' ? 'approved' : 'rejected';

    try {
      const { rows: existing } = await pool.query<{
        id: string;
        organization_id: string;
        type: string;
        payload: Record<string, unknown>;
      }>(
        `SELECT id, organization_id, type, payload FROM service_requests WHERE id = $1`,
        [req.params.id],
      );
      const row = existing[0];
      if (!row) return res.status(404).json({ error: 'Solicitação não encontrada' });

      await pool.query(
        `UPDATE service_requests SET
           status = $2,
           admin_notes = COALESCE($3, admin_notes),
           reviewed_by = $4,
           reviewed_at = NOW()
         WHERE id = $1`,
        [req.params.id, status, adminNotes ?? null, req.auth.userId],
      );

      if (action === 'approve' && row.type === 'whitelabel') {
        const payload = row.payload ?? {};
        const primaryColor =
          typeof payload.primaryColor === 'string'
            ? normalizeHexColor(payload.primaryColor)
            : null;
        const logoUrl =
          typeof payload.logoUrl === 'string' ? payload.logoUrl : null;
        const shouldEnable = enableWhitelabel !== false;

        await pool.query(
          `UPDATE organizations SET
             whitelabel_enabled = CASE WHEN $2::boolean THEN TRUE ELSE whitelabel_enabled END,
             primary_color = COALESCE($3, primary_color),
             logo_url = COALESCE($4, logo_url)
           WHERE id = $1`,
          [row.organization_id, shouldEnable, primaryColor, logoUrl],
        );
      }

      return res.json({ ok: true, status });
    } catch (err) {
      console.error('[admin/requests] PATCH erro:', err);
      return res.status(500).json({ error: 'Erro ao revisar solicitação' });
    }
  });
}

export const adminOrgBrandPatchSchema = z.object({
  whitelabelEnabled: z.boolean().optional(),
  logoUrl: z.string().max(500_000).optional().nullable(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  secondaryColor: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
});

export async function applyAdminOrgBrandPatch(
  pool: Pool,
  orgId: string,
  patch: z.infer<typeof adminOrgBrandPatchSchema>,
): Promise<boolean> {
  const { rows } = await pool.query(
    `UPDATE organizations SET
       whitelabel_enabled = COALESCE($2, whitelabel_enabled),
       logo_url = CASE WHEN $3::boolean THEN $4 ELSE logo_url END,
       primary_color = CASE WHEN $5::boolean THEN $6 ELSE primary_color END,
       secondary_color = CASE WHEN $7::boolean THEN $8 ELSE secondary_color END
     WHERE id = $1
     RETURNING id`,
    [
      orgId,
      patch.whitelabelEnabled ?? null,
      'logoUrl' in patch,
      patch.logoUrl ?? null,
      'primaryColor' in patch,
      patch.primaryColor != null ? normalizeHexColor(patch.primaryColor) : null,
      'secondaryColor' in patch,
      patch.secondaryColor != null ? normalizeHexColor(patch.secondaryColor) : null,
    ],
  );
  return rows.length > 0;
}
