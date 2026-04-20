import type { EnvironmentConfig } from './env.js';
import type { IntegrationsConfig } from './config.js';

/**
 * Avisos estruturados no boot: integrações “meio ligadas” e armadilhas comuns
 * (localhost + webhook, secret ausente, placeholders).
 */
export function logStartupIntegrationDiagnostics(
  config: EnvironmentConfig,
  integrations: IntegrationsConfig,
): void {
  const appUrl = config.appUrl.trim();
  const looksLocal =
    /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(appUrl) || appUrl.startsWith('http://');

  const prosyncKey = Boolean(integrations.prosync.apiKey);
  const prosyncSecret = Boolean(integrations.prosync.webhookSecret);
  const rubricaKey = Boolean(integrations.rubrica.apiKey);

  if (appUrl.includes('<PREENCHER>')) {
    console.warn(
      '[startup] APP_URL ainda contém placeholder <PREENCHER> — Stripe redirects e CORS podem falhar.',
    );
  }

  if (prosyncKey && !prosyncSecret) {
    console.warn(
      '[startup] PROSYNC_API_KEY definido mas PROSYNC_WEBHOOK_SECRET vazio — POST /api/webhooks/prosync rejeitará assinaturas (401).',
    );
  }

  if (prosyncKey && looksLocal) {
    console.warn(
      '[startup] APP_URL parece local: o ProSync na nuvem não consegue chamar webhooks para este host. Use túnel (ngrok, Cloudflare Tunnel) ou APP_URL público.',
    );
  }

  if (!prosyncKey) {
    console.info('[startup] ProSync: desligado (PROSYNC_API_KEY ausente).');
  } else {
    console.info('[startup] ProSync: API key carregada; baseUrl=', integrations.prosync.baseUrl);
  }

  if (!rubricaKey) {
    console.info('[startup] Rubrica: desligada (RUBRICA_API_KEY ausente).');
  } else {
    console.info('[startup] Rubrica: API key carregada; baseUrl=', integrations.rubrica.baseUrl);
  }

  const { pro, business } = config.stripePlans;
  const missingPrices = [
    !pro.monthly && 'STRIPE_PRICE_PRO_MONTHLY',
    !pro.yearly && 'STRIPE_PRICE_PRO_YEARLY',
    !business.monthly && 'STRIPE_PRICE_BUSINESS_MONTHLY',
    !business.yearly && 'STRIPE_PRICE_BUSINESS_YEARLY',
  ].filter(Boolean) as string[];

  if (missingPrices.length > 0) {
    console.warn(
      '[startup] Stripe price IDs ausentes (checkout pode falhar):',
      missingPrices.join(', '),
    );
  }
}
