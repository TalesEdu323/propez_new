import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import Stripe from 'stripe';
import type { Application } from 'express';

import { loadConfig } from './env.js';
import { createCorsOptions } from './cors.js';
import { createPool, runStartupMigrations } from './db.js';
import { loadIntegrationsConfig } from './config.js';
import { createMailClient } from './mail/resend.js';
import { createRateLimit } from './middleware/rateLimit.js';
import { buildIntegrationsRouter } from './routes/integrations.js';
import { buildWebhooksRouter } from './routes/webhooks.js';
import { createAuthRouter } from './routes/auth.js';
import { createOrganizationsRouter } from './routes/organizations.js';
import { createClientesRouter } from './routes/clientes.js';
import { createServicosRouter } from './routes/servicos.js';
import { createContratosRouter } from './routes/contratos.js';
import { createModelosRouter } from './routes/modelos.js';
import { createPropostasRouter } from './routes/propostas.js';
import { createUsageRouter } from './routes/usage.js';
import { createPublicPropostasRouter } from './routes/publicPropostas.js';
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
 *   1. CORS (credentials:true) + cookie-parser
 *   2. Stripe webhook (express.raw) — ANTES do express.json global
 *   3. Integration webhooks (cada rota tem seu parser)
 *   4. express.json global
 *   5. /api/auth, /api/organizations, /api/clientes, ... (requerem auth)
 *   6. /api/integrations (requer auth), /api/public/* (sem auth)
 *   7. utilitárias (health, checkout, notifications)
 *   8. errorHandler
 */
export async function createApp(): Promise<{ app: Application; config: ReturnType<typeof loadConfig> }> {
  const config = loadConfig();
  const integrationsConfig = loadIntegrationsConfig(config.appUrl);
  const stripe = new Stripe(config.stripeSecretKey);
  const pool = createPool(config);
  const mail = createMailClient(config.mail);

  await runStartupMigrations(pool);
  logStartupIntegrationDiagnostics(config, integrationsConfig);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cors(createCorsOptions(config)));
  app.use(cookieParser());

  // 1) Stripe webhook (raw body) — tem que vir antes do express.json global.
  app.use('/api', createStripeWebhookRouter({ stripe, config }));

  // 2) Integration webhooks com rate-limit próprio.
  const webhooksLimiter = createRateLimit({ windowMs: 60_000, max: 300 });
  app.use(
    '/api/webhooks',
    webhooksLimiter,
    buildWebhooksRouter({ pool, config: integrationsConfig }),
  );

  // 3) JSON global.
  app.use(express.json({ limit: '5mb' }));

  // 4) Auth (rate-limit mais restrito para proteger login/register)
  const authLimiter = createRateLimit({ windowMs: 60_000, max: 30 });
  app.use('/api', authLimiter, createAuthRouter({ pool, config, mail }));

  // 5) CRUDs autenticados (todas com requireAuth internamente)
  app.use('/api/organizations', createOrganizationsRouter({ pool, config }));
  app.use('/api/clientes', createClientesRouter({ pool, config }));
  app.use('/api/servicos', createServicosRouter({ pool, config }));
  app.use('/api/contratos', createContratosRouter({ pool, config }));
  app.use('/api/modelos', createModelosRouter({ pool, config }));
  app.use('/api/propostas', createPropostasRouter({ pool, config }));
  app.use('/api/usage', createUsageRouter({ pool, config }));

  // 6) Integrations proxy (autenticado)
  const integrationsLimiter = createRateLimit({ windowMs: 60_000, max: 120 });
  app.use(
    '/api/integrations',
    integrationsLimiter,
    buildIntegrationsRouter({ pool, config: integrationsConfig, envConfig: config }),
  );

  // 7) Rotas públicas (proposta pelo link)
  app.use('/api/public/propostas', createPublicPropostasRouter({ pool }));

  // 8) Utilitárias
  app.use('/api', createHealthRouter({ pool, integrationsConfig }));
  app.use('/api', createCheckoutRouter({ stripe, config }));
  app.use('/api', createNotificationsRouter());

  // 9) Error handler global sempre por último
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
