import express from 'express';
import path from 'path';
import cors from 'cors';
import Stripe from 'stripe';
import type { Application } from 'express';

import { loadConfig } from './env.js';
import { createCorsOptions } from './cors.js';
import { createPool, runStartupMigrations } from './db.js';
import { loadIntegrationsConfig } from './config.js';
import { createRateLimit } from './middleware/rateLimit.js';
import { buildIntegrationsRouter } from './routes/integrations.js';
import { buildWebhooksRouter } from './routes/webhooks.js';
import {
  createCheckoutRouter,
  createStripeWebhookRouter,
} from './routes/stripe.js';
import { createHealthRouter } from './routes/health.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { errorHandler } from './errorHandler.js';
import { logStartupIntegrationDiagnostics } from './startupDiagnostics.js';

/**
 * Monta a aplicação Express com ordem correta de middlewares e rotas.
 *
 * ORDEM CRÍTICA (não reordenar sem análise):
 *   1. CORS
 *   2. Stripe webhook (express.raw) — ANTES do express.json global
 *   3. Integration webhooks (rubrica json / prosync raw em cada rota)
 *   4. express.json global
 *   5. Demais rotas (integrations, health, checkout, notifications)
 *   6. errorHandler (sempre por último)
 */
export async function createApp(): Promise<{ app: Application; config: ReturnType<typeof loadConfig> }> {
  const config = loadConfig();
  const integrationsConfig = loadIntegrationsConfig(config.appUrl);
  const stripe = new Stripe(config.stripeSecretKey);
  const pool = createPool(config);

  await runStartupMigrations(pool);
  logStartupIntegrationDiagnostics(config, integrationsConfig);

  const app = express();
  app.disable('x-powered-by');
  app.use(cors(createCorsOptions(config)));

  // 1) Stripe webhook (raw body) — tem que vir antes do express.json global.
  app.use('/api', createStripeWebhookRouter({ stripe, config }));

  // 2) Integration webhooks com rate-limit próprio; cada rota interna define seu parser.
  const webhooksLimiter = createRateLimit({ windowMs: 60_000, max: 300 });
  app.use(
    '/api/webhooks',
    webhooksLimiter,
    buildWebhooksRouter({ pool, config: integrationsConfig }),
  );

  // 3) JSON global para as demais rotas.
  app.use(express.json({ limit: '1mb' }));

  // 4) Integrations proxy
  const integrationsLimiter = createRateLimit({ windowMs: 60_000, max: 120 });
  app.use(
    '/api/integrations',
    integrationsLimiter,
    buildIntegrationsRouter({ pool, config: integrationsConfig }),
  );

  // 5) Rotas utilitárias
  app.use('/api', createHealthRouter({ pool, integrationsConfig }));
  app.use('/api', createCheckoutRouter({ stripe, config }));
  app.use('/api', createNotificationsRouter());

  // 6) Error handler global sempre por último
  app.use(errorHandler);

  return { app, config };
}

export async function attachViteOrStatic(app: Application, nodeEnv: string): Promise<void> {
  if (nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}
