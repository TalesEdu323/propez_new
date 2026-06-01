import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { EnvironmentConfig } from '../env.js';
import { buildRequireAuth } from '../auth/middleware.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { BUSINESS_ONLY_WIDGETS, getIaAllowedWidgets } from '../../lib/featureFlags.js';
import { inferLayoutContext, type OfferType } from '../../lib/layoutContext.js';
import { validateGeneratedLayout, LayoutValidationError } from '../validation/generatedLayout.js';
import { validateGeneratedContract, ContractValidationError } from '../validation/generatedContract.js';
import {
  assertIaAllowed,
  incrementIaUsage,
  IaGateError,
} from '../services/llm/assertIaAllowed.js';
import {
  groqChat,
  parseJsonContent,
  GroqConfigError,
  GroqRateLimitError,
} from '../services/llm/groqClient.js';
import {
  buildLayoutSystemPrompt,
  buildLayoutUserPrompt,
} from '../services/llm/prompts/generateLayout.js';
import {
  buildContractSystemPrompt,
  buildContractUserPrompt,
} from '../services/llm/prompts/generateContract.js';
import {
  hydrateGeneratedLayout,
  inferPageLayoutFromContext,
  rehydrateModelImages,
} from '../services/llm/hydrateGeneratedLayout.js';
import { buildPollinationsImageUrl } from '../services/images/pollinationsImageGenerator.js';
import type { ImageSlot } from '../services/images/imageSlotCatalog.js';
import { searchPhoto } from '../services/images/unsplashResolver.js';
import type { BuilderElement } from '../../types/builder.js';

const OFFER_TYPES = [
  'consultoria',
  'agencia',
  'recorrente',
  'saas',
  'evento',
  'generico',
] as const;

const promptSchema = z.object({
  prompt: z.string().trim().min(20).max(2000),
  useCompanyProfile: z.boolean().optional().default(false),
});

const contractPromptSchema = promptSchema.extend({
  useCompanyProfile: z.boolean().optional().default(true),
});

const generateImageSchema = z.object({
  prompt: z.string().trim().min(10).max(500),
  width: z.number().int().min(400).max(1920).optional(),
  height: z.number().int().min(400).max(1920).optional(),
  negativePrompt: z.string().trim().max(300).optional(),
  source: z.enum(['generate', 'stock']).optional().default('generate'),
  offerType: z.enum(OFFER_TYPES).optional(),
  slot: z
    .enum(['hero_banner', 'card', 'inline', 'avatar', 'gallery', 'carousel'])
    .optional(),
});

const resolveModelImagesSchema = z.object({
  elementos: z.array(z.custom<BuilderElement>()),
  brief: z.string().trim().max(2000).optional(),
  offerType: z.enum(OFFER_TYPES).optional(),
  regenerate: z.union([z.literal('all'), z.array(z.string())]).optional(),
});

function handleIaError(res: Response, err: unknown): void {
  if (err instanceof IaGateError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      requiredPlan: err.requiredPlan,
    });
    return;
  }
  if (err instanceof GroqConfigError) {
    res.status(503).json({ error: 'Serviço de IA temporariamente indisponível.', code: 'ia_unconfigured' });
    return;
  }
  if (err instanceof GroqRateLimitError) {
    res.status(429).json({
      error: 'Muitas gerações agora. Tente novamente em instantes.',
      code: 'groq_rate_limit',
      retryAfter: err.retryAfterSeconds,
    });
    return;
  }
  if (err instanceof LayoutValidationError || err instanceof ContractValidationError) {
    res.status(422).json({ error: err.message, code: 'validation_failed' });
    return;
  }
  console.error('[ia]', err);
  res.status(500).json({ error: 'Não foi possível gerar. Tente reformular sua descrição.' });
}

async function callGroqJson(params: {
  system: string;
  user: string;
  temperature: number;
  max_tokens: number;
}): Promise<unknown> {
  const { content } = await groqChat({
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user },
    ],
    temperature: params.temperature,
    max_tokens: params.max_tokens,
    response_format: { type: 'json_object' },
  });
  return parseJsonContent(content);
}

async function loadOrgImageContext(
  pool: Pool,
  orgId: string,
): Promise<{ segment: OfferType; logoUrl: string | null; name: string | null }> {
  const { rows } = await pool.query<{
    segment: string | null;
    logo_url: string | null;
    name: string;
  }>(`SELECT segment, logo_url, name FROM organizations WHERE id = $1`, [orgId]);
  const row = rows[0];
  const segment = (row?.segment as OfferType) ?? 'generico';
  return {
    segment,
    logoUrl: row?.logo_url?.trim() || null,
    name: row?.name?.trim() || null,
  };
}

export function createIaRouter(deps: { pool: Pool; config: EnvironmentConfig }): Router {
  const { pool, config } = deps;
  const router = express.Router();
  router.use(buildRequireAuth(config.auth));
  router.use(
    createRateLimit({
      windowMs: 60_000,
      max: 10,
      key: (req) => `${req.auth?.orgId ?? req.ip ?? 'anon'}:ia`,
    }),
  );

  const imageLimiter = createRateLimit({
    windowMs: 60_000,
    max: 10,
    key: (req) => `${req.auth?.orgId ?? req.ip ?? 'anon'}:img`,
  });

  router.post('/generate-layout', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    const parsed = promptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Descreva o modelo em 20 a 2000 caracteres.' });
    }

    try {
      const { plan } = await assertIaAllowed(pool, req.auth.orgId);
      const allowed = getIaAllowedWidgets(plan);
      const hasMarketing = BUSINESS_ONLY_WIDGETS.some((t) => allowed.has(t));
      const orgCtx = await loadOrgImageContext(pool, req.auth.orgId);
      const context = inferLayoutContext(parsed.data.prompt, hasMarketing, orgCtx.segment);

      let companyName: string | null = null;
      let organizationLogoUrl: string | null = null;
      if (parsed.data.useCompanyProfile) {
        companyName = orgCtx.name;
        organizationLogoUrl = orgCtx.logoUrl;
      }

      let raw: unknown;
      try {
        raw = await callGroqJson({
          system: buildLayoutSystemPrompt(parsed.data.prompt, plan),
          user: buildLayoutUserPrompt(parsed.data.prompt, companyName),
          temperature: 0.55,
          max_tokens: 6144,
        });
      } catch {
        raw = await callGroqJson({
          system: buildLayoutSystemPrompt(parsed.data.prompt, plan),
          user: buildLayoutUserPrompt(parsed.data.prompt, companyName),
          temperature: 0.45,
          max_tokens: 6144,
        });
      }

      const validated = validateGeneratedLayout(raw, allowed);
      const elementos = await hydrateGeneratedLayout(validated, {
        userPrompt: parsed.data.prompt,
        context,
        allowed,
        imageMode: 'generate',
        organizationLogoUrl,
      });
      const pageLayout = inferPageLayoutFromContext(context);

      await incrementIaUsage(pool, req.auth.orgId);
      return res.json({ elementos, pageLayout, offerType: context.offerType });
    } catch (err) {
      handleIaError(res, err);
    }
  });

  router.post('/resolve-model-images', imageLimiter, async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    const parsed = resolveModelImagesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Dados inválidos para resolver imagens.' });
    }

    try {
      const orgCtx = await loadOrgImageContext(pool, req.auth.orgId);
      const offerType = parsed.data.offerType ?? orgCtx.segment;
      const elementos = await rehydrateModelImages(parsed.data.elementos, {
        offerType,
        imageMode: 'generate',
        organizationLogoUrl: orgCtx.logoUrl,
        brief: parsed.data.brief,
        regenerate: parsed.data.regenerate,
      });
      return res.json({ elementos, offerType });
    } catch (err) {
      handleIaError(res, err);
    }
  });

  router.post('/generate-image', imageLimiter, async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    const parsed = generateImageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Descreva a imagem em 10 a 500 caracteres.' });
    }

    try {
      const { prompt, width, height, source, offerType: bodyOfferType, slot } = parsed.data;
      const orgCtx = await loadOrgImageContext(pool, req.auth.orgId);
      const offerType = bodyOfferType ?? orgCtx.segment;

      if (source === 'stock') {
        const url = await searchPhoto(prompt, offerType);
        return res.json({ url, source: 'stock' as const });
      }

      const generated = buildPollinationsImageUrl({
        prompt,
        width,
        height,
        offerType,
        slot: slot as ImageSlot | undefined,
      });

      return res.json({
        url: generated.url,
        width: generated.width,
        height: generated.height,
        source: 'generate' as const,
      });
    } catch (err) {
      handleIaError(res, err);
    }
  });

  router.post('/generate-contract', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    const parsed = contractPromptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Descreva o contrato em 20 a 2000 caracteres.' });
    }

    try {
      await assertIaAllowed(pool, req.auth.orgId);

      let company: { companyName: string | null; companyCnpj: string | null } | null = null;
      if (parsed.data.useCompanyProfile) {
        const { rows } = await pool.query<{ name: string; cnpj: string | null }>(
          `SELECT name, cnpj FROM organizations WHERE id = $1`,
          [req.auth.orgId],
        );
        const org = rows[0];
        if (org) {
          company = {
            companyName: org.name?.trim() || null,
            companyCnpj: org.cnpj?.trim() || null,
          };
        }
      }

      const raw = await callGroqJson({
        system: buildContractSystemPrompt(),
        user: buildContractUserPrompt(parsed.data.prompt, company),
        temperature: 0.3,
        max_tokens: 8192,
      });

      const contract = validateGeneratedContract(raw);
      await incrementIaUsage(pool, req.auth.orgId);
      return res.json(contract);
    } catch (err) {
      handleIaError(res, err);
    }
  });

  return router;
}
