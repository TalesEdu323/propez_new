export interface StripePlanPriceIds {
  monthly: string;
  yearly: string;
}

export interface StripePlansConfig {
  pro: StripePlanPriceIds;
  business: StripePlanPriceIds;
}

export interface AuthConfig {
  jwtSecret: string;
  sessionCookieName: string;
  /** Tempo de vida do access token em segundos. */
  accessTtlSeconds: number;
  /** Tempo de vida do refresh token em segundos. */
  refreshTtlSeconds: number;
  /** Cookie Secure=true em produção. */
  cookieSecure: boolean;
}

export interface MailConfig {
  resendApiKey: string | null;
  from: string;
  /** Quando true, o app recusa registros se não houver provedor (prod). */
  required: boolean;
}

export interface EnvironmentConfig {
  appUrl: string;
  databaseUrl: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePlans: StripePlansConfig;
  port: number;
  nodeEnv: string;
  allowedOrigins: string[];
  auth: AuthConfig;
  mail: MailConfig;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function getAllowedOrigins(appUrl: string): string[] {
  const fromEnv = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return Array.from(
    new Set([
      appUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      ...fromEnv,
    ]),
  );
}

export function loadConfig(): EnvironmentConfig {
  const appUrl = getRequiredEnv('APP_URL');
  const port = Number(process.env.PORT || '3000');

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('PORT must be a valid positive number');
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';

  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret) {
    if (isProd) {
      throw new Error('JWT_SECRET obrigatório em produção');
    }
    console.warn('[env] JWT_SECRET ausente — usando fallback inseguro de DEV. Defina JWT_SECRET no .env.');
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim() || null;
  const mailFrom = process.env.MAIL_FROM?.trim() || 'Propez <no-reply@propez.local>';
  if (isProd && !resendApiKey) {
    console.warn('[env] RESEND_API_KEY ausente em produção — verificação de email não funcionará.');
  }

  return {
    appUrl,
    databaseUrl: getRequiredEnv('DATABASE_URL'),
    stripeSecretKey: getRequiredEnv('STRIPE_SECRET_KEY'),
    stripeWebhookSecret: getRequiredEnv('STRIPE_WEBHOOK_SECRET'),
    stripePlans: {
      pro: {
        monthly: getOptionalEnv('STRIPE_PRICE_PRO_MONTHLY'),
        yearly: getOptionalEnv('STRIPE_PRICE_PRO_YEARLY'),
      },
      business: {
        monthly: getOptionalEnv('STRIPE_PRICE_BUSINESS_MONTHLY'),
        yearly: getOptionalEnv('STRIPE_PRICE_BUSINESS_YEARLY'),
      },
    },
    port,
    nodeEnv,
    allowedOrigins: getAllowedOrigins(appUrl),
    auth: {
      jwtSecret: jwtSecret || 'dev-insecure-secret-change-me',
      sessionCookieName: process.env.SESSION_COOKIE_NAME?.trim() || 'propez_session',
      accessTtlSeconds: Number(process.env.AUTH_ACCESS_TTL_SECONDS || 900),
      refreshTtlSeconds: Number(process.env.AUTH_REFRESH_TTL_SECONDS || 60 * 60 * 24 * 30),
      cookieSecure: isProd,
    },
    mail: {
      resendApiKey,
      from: mailFrom,
      required: isProd,
    },
  };
}
