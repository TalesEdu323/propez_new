import type { EnvironmentConfig } from './env.js';
import { isMailConfigured } from './env.js';
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

  // Suíte Taggo (descoberta cross-app + service tokens).
  if (!integrations.suiteSecret) {
    console.info(
      '[startup] Suíte Taggo: desligada (TAGGO_SUITE_SECRET ausente). Sem lookup automático em ProSync.',
    );
  } else if (integrations.suiteSecret.length < 32) {
    console.warn(
      '[startup] TAGGO_SUITE_SECRET muito curto (< 32 chars). Gere com `openssl rand -hex 64`.',
    );
  } else {
    console.info('[startup] Suíte Taggo: secret carregado; lookup cross-app habilitado.');
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

  const { mail } = config;
  if (!isMailConfigured(mail)) {
    if (config.nodeEnv === 'production') {
      console.error(
        '[startup] E-mail: DESATIVADO (provider=none). Configure SMTP_HOST + credenciais ou RESEND_API_KEY.',
      );
    } else {
      console.warn(
        '[startup] E-mail: modo simulação (provider=none). Defina SMTP_* ou RESEND_API_KEY para envio real.',
      );
    }
  } else if (mail.provider === 'smtp') {
    console.info(
      `[startup] E-mail: SMTP ${mail.smtp?.host}:${mail.smtp?.port} (from=${mail.from})`,
    );
  } else if (mail.provider === 'resend') {
    console.info(`[startup] E-mail: Resend (from=${mail.from})`);
  }
}
