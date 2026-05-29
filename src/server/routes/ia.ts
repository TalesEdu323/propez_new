import express from 'express';
import type { Request, Response, Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { EnvironmentConfig } from '../env.js';
import { buildRequireAuth } from '../auth/middleware.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { getAllowedWidgets } from '../../lib/featureFlags.js';
import { validateGeneratedLayout, LayoutValidationError } from '../../lib/validateGeneratedLayout.js';
import { validateGeneratedContract, ContractValidationError } from '../../lib/validateGeneratedContract.js';
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

const promptSchema = z.object({
  prompt: z.string().trim().min(20).max(2000),
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

export function createIaRouter(deps: { pool: Pool; config: EnvironmentConfig }): Router {
  const { pool, config } = deps;
  const router = express.Router();
  router.use(buildRequireAuth(config.auth));
  router.use(
    createRateLimit({
      windowMs: 60_000,
      max: 10,
      key: (req) => `${req.auth?.orgId ?? req.ip ?? 'anon'}`,
    }),
  );

  router.post('/generate-layout', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    const parsed = promptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Descreva o modelo em 20 a 2000 caracteres.' });
    }

    try {
      const { plan } = await assertIaAllowed(pool, req.auth.orgId);
      const allowed = getAllowedWidgets(plan);
      const allowedTypes = [...allowed];

      let raw: unknown;
      try {
        raw = await callGroqJson({
          system: buildLayoutSystemPrompt(allowedTypes),
          user: buildLayoutUserPrompt(parsed.data.prompt),
          temperature: 0.4,
          max_tokens: 4096,
        });
      } catch {
        raw = await callGroqJson({
          system: buildLayoutSystemPrompt(allowedTypes),
          user: buildLayoutUserPrompt(parsed.data.prompt),
          temperature: 0.35,
          max_tokens: 4096,
        });
      }

      const elementos = validateGeneratedLayout(raw, allowed);
      await incrementIaUsage(pool, req.auth.orgId);
      return res.json({ elementos });
    } catch (err) {
      handleIaError(res, err);
    }
  });

  router.post('/generate-contract', async (req: Request, res: Response) => {
    if (!req.auth) return res.status(401).end();
    const parsed = promptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Descreva o contrato em 20 a 2000 caracteres.' });
    }

    try {
      await assertIaAllowed(pool, req.auth.orgId);

      const raw = await callGroqJson({
        system: buildContractSystemPrompt(),
        user: buildContractUserPrompt(parsed.data.prompt),
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
