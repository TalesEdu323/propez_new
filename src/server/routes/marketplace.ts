import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { EnvironmentConfig } from '../env.js';
import { buildRequireAuth } from '../auth/middleware.js';
import { buildRequirePlatformAdmin } from '../auth/platformAdmin.js';
import { proposalFlowConfigSchema } from '../validation/proposalFlow.js';
import { parseProposalFlow } from '../../types/proposalFlow.js';

const builderElement = z.object({}).passthrough();

const adminBodySchema = z.object({
  slug: z.string().trim().min(1).max(80),
  nome: z.string().trim().min(1).max(200),
  descricao: z.string().max(2000).optional().nullable(),
  categoria: z.string().max(100).optional().nullable(),
  preview_image_url: z.string().max(2000).optional().nullable(),
  elementos: z.array(builderElement).default([]),
  fluxo: proposalFlowConfigSchema.optional(),
  contrato_texto_exemplo: z.string().max(200_000).optional().nullable(),
  chave_pix_exemplo: z.string().max(500).optional().nullable(),
  link_pagamento_exemplo: z.string().max(2000).optional().nullable(),
  tier: z.enum(['free', 'pro', 'business']).default('free'),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

function serializeMarketplaceRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    slug: r.slug,
    nome: r.nome,
    descricao: r.descricao,
    categoria: r.categoria,
    previewImageUrl: r.preview_image_url,
    elementos: Array.isArray(r.elementos) ? r.elementos : [],
    fluxo: parseProposalFlow(r.fluxo),
    contratoTextoExemplo: r.contrato_texto_exemplo,
    chavePixExemplo: r.chave_pix_exemplo,
    linkPagamentoExemplo: r.link_pagamento_exemplo,
    tier: r.tier ?? 'free',
    published: !!r.published,
    publishedAt: r.published_at,
    sortOrder: r.sort_order ?? 0,
    createdAt: r.created_at,
  };
}

export function createMarketplaceRouter(deps: {
  pool: Pool;
  config: EnvironmentConfig;
}): Router {
  const { pool, config } = deps;
  const router = express.Router();
  const requireAuth = buildRequireAuth(config.auth);

  router.get('/templates', requireAuth, async (_req: Request, res: Response) => {
    const { rows } = await pool.query(
      `SELECT id, slug, nome, descricao, categoria, preview_image_url, elementos, fluxo,
              contrato_texto_exemplo, chave_pix_exemplo, link_pagamento_exemplo,
              tier, published, published_at, sort_order, created_at
       FROM marketplace_templates
       WHERE published = TRUE
       ORDER BY sort_order ASC, created_at DESC`,
    );
    return res.json(rows.map(serializeMarketplaceRow));
  });

  router.get('/templates/:id', requireAuth, async (req: Request, res: Response) => {
    const { rows } = await pool.query(
      `SELECT id, slug, nome, descricao, categoria, preview_image_url, elementos, fluxo,
              contrato_texto_exemplo, chave_pix_exemplo, link_pagamento_exemplo,
              tier, published, published_at, sort_order, created_at
       FROM marketplace_templates
       WHERE id = $1 AND published = TRUE`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Template não encontrado' });
    return res.json(serializeMarketplaceRow(rows[0]));
  });

  router.post('/templates/:id/clone', requireAuth, async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    const { rows } = await pool.query(
      `SELECT nome, elementos, fluxo, contrato_texto_exemplo, chave_pix_exemplo, link_pagamento_exemplo, tier
       FROM marketplace_templates WHERE id = $1 AND published = TRUE`,
      [req.params.id],
    );
    const src = rows[0];
    if (!src) return res.status(404).json({ error: 'Template não encontrado' });

    const { rows: created } = await pool.query(
      `INSERT INTO modelos_propostas
         (organization_id, nome, elementos, servicos, contrato_texto, chave_pix, link_pagamento, tier, fluxo)
       VALUES ($1, $2, $3::jsonb, '{}'::uuid[], $4, $5, $6, $7, $8::jsonb)
       RETURNING id, nome, elementos, servicos, contrato_id, contrato_texto, chave_pix, link_pagamento, tier, fluxo, created_at`,
      [
        req.auth.orgId,
        `${src.nome} (cópia)`,
        JSON.stringify(src.elementos ?? []),
        src.contrato_texto_exemplo,
        src.chave_pix_exemplo,
        src.link_pagamento_exemplo,
        src.tier ?? 'free',
        JSON.stringify(src.fluxo ?? { steps: ['approve', 'sign', 'pay'] }),
      ],
    );
    const { serializeModelo } = await import('../db/serializers.js');
    return res.status(201).json(serializeModelo(created[0]));
  });

  return router;
}

export function createAdminMarketplaceRouter(deps: {
  pool: Pool;
  config: EnvironmentConfig;
}): Router {
  const { pool, config } = deps;
  const router = express.Router();
  const requireAuth = buildRequireAuth(config.auth);
  const requirePlatformAdmin = buildRequirePlatformAdmin({ pool, config });
  router.use(requireAuth, requirePlatformAdmin);

  router.get('/marketplace/templates', async (_req: Request, res: Response) => {
    const { rows } = await pool.query(
      `SELECT id, slug, nome, descricao, categoria, preview_image_url, elementos, fluxo,
              tier, published, published_at, sort_order, created_at
       FROM marketplace_templates ORDER BY sort_order ASC, created_at DESC`,
    );
    return res.json(rows.map(serializeMarketplaceRow));
  });

  router.post('/marketplace/templates', async (req: Request, res: Response) => {
    const parsed = adminBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });
    const d = parsed.data;
    const { rows } = await pool.query(
      `INSERT INTO marketplace_templates
         (slug, nome, descricao, categoria, preview_image_url, elementos, fluxo,
          contrato_texto_exemplo, chave_pix_exemplo, link_pagamento_exemplo, tier, published, published_at, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12, CASE WHEN $12 THEN NOW() ELSE NULL END, $13, $14)
       RETURNING id, slug, nome, descricao, categoria, preview_image_url, elementos, fluxo,
                 tier, published, published_at, sort_order, created_at`,
      [
        d.slug,
        d.nome,
        d.descricao ?? null,
        d.categoria ?? null,
        d.preview_image_url ?? null,
        JSON.stringify(d.elementos),
        JSON.stringify(d.fluxo ?? { steps: ['approve', 'sign', 'pay'] }),
        d.contrato_texto_exemplo ?? null,
        d.chave_pix_exemplo ?? null,
        d.link_pagamento_exemplo ?? null,
        d.tier,
        d.published ?? false,
        d.sort_order ?? 0,
        req.auth?.userId ?? null,
      ],
    );
    return res.status(201).json(serializeMarketplaceRow(rows[0]));
  });

  router.patch('/marketplace/templates/:id', async (req: Request, res: Response) => {
    const parsed = adminBodySchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });
    const d = parsed.data;
    const { rows } = await pool.query(
      `UPDATE marketplace_templates SET
         slug = COALESCE($2, slug),
         nome = COALESCE($3, nome),
         descricao = CASE WHEN $4::boolean THEN $5 ELSE descricao END,
         categoria = CASE WHEN $6::boolean THEN $7 ELSE categoria END,
         preview_image_url = CASE WHEN $8::boolean THEN $9 ELSE preview_image_url END,
         elementos = CASE WHEN $10::boolean THEN $11::jsonb ELSE elementos END,
         fluxo = CASE WHEN $12::boolean THEN $13::jsonb ELSE fluxo END,
         tier = COALESCE($14, tier),
         published = COALESCE($15, published),
         published_at = CASE WHEN $16::boolean THEN (CASE WHEN $15 THEN NOW() ELSE NULL END) ELSE published_at END,
         sort_order = COALESCE($17, sort_order)
       WHERE id = $1
       RETURNING id, slug, nome, descricao, categoria, preview_image_url, elementos, fluxo,
                 tier, published, published_at, sort_order, created_at`,
      [
        req.params.id,
        d.slug ?? null,
        d.nome ?? null,
        'descricao' in d,
        d.descricao ?? null,
        'categoria' in d,
        d.categoria ?? null,
        'preview_image_url' in d,
        d.preview_image_url ?? null,
        d.elementos !== undefined,
        d.elementos !== undefined ? JSON.stringify(d.elementos) : null,
        d.fluxo !== undefined,
        d.fluxo !== undefined ? JSON.stringify(d.fluxo) : null,
        d.tier ?? null,
        d.published ?? null,
        'published' in d,
        d.sort_order ?? null,
      ],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Template não encontrado' });
    return res.json(serializeMarketplaceRow(rows[0]));
  });

  router.delete('/marketplace/templates/:id', async (req: Request, res: Response) => {
    const { rowCount } = await pool.query(`DELETE FROM marketplace_templates WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Template não encontrado' });
    return res.json({ ok: true });
  });

  return router;
}
