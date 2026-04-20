export interface StripePlanPriceIds {
  monthly: string;
  yearly: string;
}

export interface StripePlansConfig {
  pro: StripePlanPriceIds;
  business: StripePlanPriceIds;
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
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins: getAllowedOrigins(appUrl),
  };
}
