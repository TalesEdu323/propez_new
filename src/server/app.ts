import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import Stripe from 'stripe';
import type { Application } from 'express';

import { loadConfig } from './env.js';
import { createCorsOptions } from './cors.js';
import { createPool, runStartupMigrations } from './db.js';
import { loadIntegrationsConfig } from './config.js';
import { createMailClient } from './mail/client.js';
import { normalizeEmailBranding } from './mail/layout.js';
import { createRateLimit } from './middleware/rateLimit.js';
import { buildIntegrationsRouter } from './routes/integrations.js';
import { buildWebhooksRouter } from './routes/webhooks.js';
import { createAuthRouter } from './routes/auth.js';
import { createSsoRouter } from './routes/sso.js';
import { createGoogleAuthRouter } from './routes/googleAuth.js';
import { createGoogleCalendarRouter } from './routes/googleCalendar.js';
import { createSuiteLookup } from './clients/suiteLookup.js';
import { createSuiteServiceTokenClient } from './clients/suiteServiceToken.js';
import { createSuiteProposalEvents } from './clients/suiteProposalEvents.js';
import { createOrgIntegrationCredentialsRepo } from './storage/orgIntegrationCredentials.js';
import { createEnsureSuiteCredential } from './integrations/ensureSuiteCredential.js';
import { createOrganizationsRouter } from './routes/organizations.js';
import { createClientesRouter } from './routes/clientes.js';
import { createServicosRouter } from './routes/servicos.js';
import { createContratosRouter } from './routes/contratos.js';
import { createModelosRouter } from './routes/modelos.js';
import { createPropostasRouter } from './routes/propostas.js';
import { createUsageRouter } from './routes/usage.js';
import { createIaRouter } from './routes/ia.js';
import { createPublicPropostasRouter } from './routes/publicPropostas.js';
import { createSigningRouter, createPublicValidityRouter } from './routes/signing.js';
import { createHealthRouter } from './routes/health.js';
import {
  createCheckoutRouter,
  createStripeWebhookRouter,
} from './routes/stripe.js';
import { createPlatformRouter } from './routes/platform.js';
import { createRequestsRouter } from './routes/requests.js';
import { createSeoRouter } from './routes/seo.js';
import { createBlogRouter } from './routes/blog.js';
import { createNewsletterRouter } from './routes/newsletter.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createAdminRouter } from './routes/admin.js';
import { createAdminPostsRouter } from './routes/adminPosts.js';
import { createMarketplaceRouter, createAdminMarketplaceRouter } from './routes/marketplace.js';
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
  const mail = createMailClient(
    config.mail,
    normalizeEmailBranding(config.appUrl, config.taggoSiteUrl),
  );
  const suiteLookup = createSuiteLookup(integrationsConfig);
  const suiteServiceToken = createSuiteServiceTokenClient(integrationsConfig);
  const orgCredentialsRepo = createOrgIntegrationCredentialsRepo(pool, integrationsConfig);
  const suiteProposalEvents = createSuiteProposalEvents({
    config: integrationsConfig,
    orgCredentialsRepo,
  });
  const ensureSuiteCredential = createEnsureSuiteCredential({
    pool,
    config: integrationsConfig,
    repo: orgCredentialsRepo,
    serviceToken: suiteServiceToken,
  });

  await runStartupMigrations(pool);
  logStartupIntegrationDiagnostics(config, integrationsConfig);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cors(createCorsOptions(config)));
  app.use(cookieParser());

  // 1) Stripe webhook (raw body) — tem que vir antes do express.json global.
  app.use('/api', createStripeWebhookRouter({ stripe, config, pool }));

  // 2) Integration webhooks com rate-limit próprio.
  const webhooksLimiter = createRateLimit({ windowMs: 60_000, max: 300 });
  app.use(
    '/api/webhooks',
    webhooksLimiter,
    buildWebhooksRouter({
      pool,
      config: integrationsConfig,
      orgCredentialsRepo,
    }),
  );

  // 3) JSON global.
  app.use(express.json({ limit: '5mb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (res.statusCode < 500) return;
      // Falhas de proxy de integração (upstream/config) não são bugs da aplicação
      if (req.path.startsWith('/api/integrations')) return;
      const routePattern = req.route?.path
        ? `${req.baseUrl || ''}${req.route.path}`
        : req.path;
      pool
        .query(
          `INSERT INTO api_error_stats (stat_date, route_pattern, status_code, error_count)
           VALUES (CURRENT_DATE, $1, $2, 1)
           ON CONFLICT (stat_date, route_pattern, status_code)
           DO UPDATE SET error_count = api_error_stats.error_count + 1`,
          [routePattern.slice(0, 200), res.statusCode],
        )
        .catch(() => {});
      void start;
    });
    next();
  });

  // 4) Auth (rate-limit mais restrito para proteger login/register)
  const authLimiter = createRateLimit({ windowMs: 60_000, max: 30 });
  app.use('/api', authLimiter, createAuthRouter({ pool, config, mail, suiteLookup }));
  app.use('/api', createSsoRouter({ pool, config }));
  app.use('/api', createGoogleAuthRouter({ pool, config }));

  // 5) CRUDs autenticados (todas com requireAuth internamente)
  app.use('/api/organizations', createOrganizationsRouter({ pool, config }));
  app.use('/api/platform', createPlatformRouter({ pool }));
  app.use('/api/requests', createRequestsRouter({ pool, config }));
  app.use('/api/clientes', createClientesRouter({ pool, config }));
  app.use('/api/servicos', createServicosRouter({ pool, config }));
  app.use('/api/contratos', createContratosRouter({ pool, config }));
  app.use('/api/modelos', createModelosRouter({ pool, config }));
  app.use('/api/propostas', createPropostasRouter({ pool, config, mail, suiteProposalEvents }));
  app.use('/api/usage', createUsageRouter({ pool, config }));
  app.use('/api/ia', createIaRouter({ pool, config }));

  const integrationsLimiter = createRateLimit({ windowMs: 60_000, max: 120 });

  // 6) Google Calendar (autenticado) — antes do proxy genérico de integrações
  app.use(
    '/api/integrations/google-calendar',
    integrationsLimiter,
    createGoogleCalendarRouter({ pool, config }),
  );

  // 6b) Integrations proxy (autenticado)
  app.use(
    '/api/integrations',
    integrationsLimiter,
    buildIntegrationsRouter({
      pool,
      config: integrationsConfig,
      envConfig: config,
      ensureSuiteCredential,
      orgCredentialsRepo,
      suiteProposalEvents,
    }),
  );

  // 7) Rotas públicas (proposta pelo link)
  app.use(
    '/api/public/propostas',
    createPublicPropostasRouter({
      pool,
      mail,
      suiteProposalEvents,
      config,
      integrationsConfig,
      orgCredentialsRepo,
      ensureSuiteCredential,
    }),
  );

  app.use('/api/public/sign', createSigningRouter({ pool, config, mail }));
  app.use('/api/public/validity', createPublicValidityRouter({ pool, config }));

  // 8) Painel admin (super-admin do SaaS) — exige requireAuth + requirePlatformAdmin
  app.use('/api/marketplace', createMarketplaceRouter({ pool, config }));
  app.use('/api/admin', createAdminRouter({ pool, config }));
  app.use('/api/admin', createAdminMarketplaceRouter({ pool, config }));
  app.use('/api', createAdminPostsRouter({ pool, config, mail }));

  // 9) Utilitárias
  app.use('/api', createHealthRouter({ pool, integrationsConfig, config }));
  app.use('/api', createCheckoutRouter({ stripe, config }));
  app.use('/api', createNotificationsRouter({ pool, config }));
  app.use('/api', createBlogRouter({ pool }));
  app.use('/api', createNewsletterRouter({ pool }));

  // SEO (dev/produção local — na Vercel use api/robots.ts e api/sitemap.ts)
  app.use(createSeoRouter({ pool, config }));

  // 10) Error handler global sempre por último
  app.use(errorHandler);

  return { app, config };
}

export async function attachViteOrStatic(
  app: Application,
  nodeEnv: string,
  httpServer: http.Server,
): Promise<void> {
  if (nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Mesmo servidor HTTP do Express — evita segundo bind na 24678 (conflito com 2× npm run dev).
        hmr: disableHmr ? false : { server: httpServer },
      },
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
