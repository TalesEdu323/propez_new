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

export interface SmtpConfig {
  host: string;
  port: number;
  /** true para porta 465 (SSL); false para 587/25 com STARTTLS. */
  secure: boolean;
  user: string | null;
  pass: string | null;
  connectionTimeout: number;
  greetingTimeout: number;
}

export interface MailConfig {
  /** Provedor ativo: smtp, resend ou none (simula no console). */
  provider: 'smtp' | 'resend' | 'none';
  smtp: SmtpConfig | null;
  resendApiKey: string | null;
  from: string;
  /** Quando true, o app recusa registros se não houver provedor (prod). */
  required: boolean;
}

function parseBoolEnv(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Ignora placeholders do .env.example e chaves Resend inválidas. */
function normalizeResendApiKey(raw: string | undefined): string | null {
  const key = raw?.trim() || '';
  if (!key) return null;
  const lower = key.toLowerCase();
  if (lower.includes('preencher') || lower.includes('change-me') || lower.includes('your_')) {
    return null;
  }
  if (!key.startsWith('re_')) return null;
  return key;
}

/** Ignora hosts placeholder do .env.example e valores inválidos para auto-detect. */
function normalizeSmtpHost(raw: string | undefined): string | null {
  const host = raw?.trim() || '';
  if (!host) return null;
  const lower = host.toLowerCase();
  if (
    lower.includes('example.com') ||
    lower.includes('example.org') ||
    lower.includes('preencher') ||
    lower === 'localhost' ||
    lower === '127.0.0.1'
  ) {
    return null;
  }
  return host;
}

export function isMailConfigured(mail: MailConfig): boolean {
  return mail.provider !== 'none';
}

function resolveMailProvider(input: {
  mailProvider: string;
  emailProvider: string;
  smtpHost: string | null;
  resendApiKey: string | null;
}): MailConfig['provider'] {
  const forced = input.mailProvider.trim().toLowerCase();
  const hasSmtp = Boolean(input.smtpHost);
  const hasResend = Boolean(input.resendApiKey);

  if (forced === 'smtp') {
    if (hasSmtp) return 'smtp';
    if (hasResend) return 'resend';
    return 'none';
  }
  if (forced === 'resend') return hasResend ? 'resend' : 'none';

  const emailProv = input.emailProvider.trim().toLowerCase();
  if (emailProv === 'nodemailer' || emailProv === 'smtp') {
    if (hasSmtp) return 'smtp';
  }

  if (hasSmtp) return 'smtp';
  if (hasResend) return 'resend';
  return 'none';
}

export interface EnvironmentConfig {
  appUrl: string;
  /** Site institucional Taggo (rodapé e branding nos e-mails). */
  taggoSiteUrl: string;
  databaseUrl: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePlans: StripePlansConfig;
  port: number;
  nodeEnv: string;
  allowedOrigins: string[];
  auth: AuthConfig;
  mail: MailConfig;
  /**
   * E-mails (lowercase) com acesso ao painel /admin mesmo sem flag
   * is_platform_admin no DB. Usado como fallback para bootstrap.
   */
  platformAdminEmails: string[];
  /** Vercel Blob — `BLOB_READ_WRITE_TOKEN` (Production/Preview). `BLOB_STORE_ID` é auto-injetado. */
  blobReadWriteToken: string | null;
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
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      ...fromEnv,
    ]),
  );
}

/** Diagnóstico de boot sem expor valores — útil quando createApp falha na Vercel. */
export function getConfigBootErrors(): string[] {
  const errors: string[] = [];
  const required = ['APP_URL', 'DATABASE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const;
  for (const name of required) {
    if (!process.env[name]?.trim()) errors.push(`Missing required env var: ${name}`);
  }
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !process.env.JWT_SECRET?.trim()) {
    errors.push('JWT_SECRET obrigatório em produção');
  }
  const port = Number(process.env.PORT || '3000');
  if (process.env.PORT && (!Number.isFinite(port) || port <= 0)) {
    errors.push('PORT must be a valid positive number');
  }
  return errors;
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

  const resendApiKey = normalizeResendApiKey(process.env.RESEND_API_KEY);
  const mailFrom = process.env.MAIL_FROM?.trim() || 'Propez <no-reply@propez.local>';
  const smtpHost = normalizeSmtpHost(process.env.SMTP_HOST || process.env.EMAIL_HOST);
  const smtpPort = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587');
  const smtpSecure = parseBoolEnv(
    process.env.SMTP_SECURE ?? process.env.EMAIL_SECURE,
    smtpPort === 465,
  );
  const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER)?.trim() || null;
  const smtpPass = (process.env.SMTP_PASS || process.env.EMAIL_PASS)?.trim() || null;
  const smtpConnectionTimeout = Number(
    process.env.SMTP_TIMEOUT || process.env.EMAIL_TIMEOUT || '30000',
  );
  const smtpGreetingTimeout = Number(
    process.env.SMTP_GREETING_TIMEOUT || process.env.EMAIL_GREETING_TIMEOUT || '8000',
  );
  const forcedMailProvider = (process.env.MAIL_PROVIDER || '').trim().toLowerCase();

  let mailProvider = resolveMailProvider({
    mailProvider: process.env.MAIL_PROVIDER || '',
    emailProvider: process.env.EMAIL_PROVIDER || '',
    smtpHost,
    resendApiKey,
  });

  if (
    process.env.VERCEL === '1' &&
    mailProvider === 'smtp' &&
    resendApiKey &&
    forcedMailProvider !== 'smtp'
  ) {
    mailProvider = 'resend';
    console.warn(
      '[env] Vercel: usando Resend (RESEND_API_KEY) em vez de SMTP para envio confiável em serverless.',
    );
  } else if (process.env.VERCEL === '1' && mailProvider === 'smtp' && resendApiKey) {
    console.warn(
      '[env] Vercel + MAIL_PROVIDER=smtp: SMTP pode falhar por timeout. Recomendado: MAIL_PROVIDER=resend.',
    );
  }

  if (smtpHost && (!Number.isFinite(smtpPort) || smtpPort <= 0)) {
    throw new Error('SMTP_PORT deve ser um número positivo');
  }

  const smtp: SmtpConfig | null = smtpHost
    ? {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        user: smtpUser,
        pass: smtpPass,
        connectionTimeout: smtpConnectionTimeout,
        greetingTimeout: smtpGreetingTimeout,
      }
    : null;

  if (forcedMailProvider === 'smtp' && !smtpHost && resendApiKey) {
    console.warn(
      '[env] MAIL_PROVIDER=smtp mas SMTP_HOST é inválido/placeholder — usando Resend.',
    );
  } else if (forcedMailProvider === 'smtp' && !smtpHost && !resendApiKey) {
    console.warn(
      '[env] MAIL_PROVIDER=smtp mas SMTP_HOST é inválido/placeholder e RESEND_API_KEY ausente — e-mails desativados.',
    );
  }

  if (isProd && mailProvider === 'none') {
    console.error(
      '[env] CRÍTICO: nenhum provedor de e-mail em produção (SMTP_HOST válido ou RESEND_API_KEY) — auth e notificações por e-mail não funcionarão.',
    );
  } else if (mailProvider === 'smtp') {
    console.info(`[env] Email via SMTP (${smtpHost}:${smtpPort}, secure=${smtpSecure})`);
  } else if (mailProvider === 'resend') {
    console.info('[env] Email via Resend');
  }

  const platformAdminEmails = (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const taggoSiteUrl =
    (process.env.TAGGO_SITE_URL || 'https://taggo.com.br').trim().replace(/\/+$/, '') ||
    'https://taggo.com.br';

  const blobReadWriteToken = process.env.BLOB_READ_WRITE_TOKEN?.trim() || null;
  if ((isProd || process.env.VERCEL === '1') && !blobReadWriteToken) {
    console.warn(
      '[env] BLOB_READ_WRITE_TOKEN ausente — upload de PDF de contrato usará BYTEA legado ou falhará.',
    );
  }

  return {
    appUrl,
    taggoSiteUrl,
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
      provider: mailProvider,
      smtp,
      resendApiKey,
      from: mailFrom,
      required: isProd,
    },
    platformAdminEmails,
    blobReadWriteToken,
  };
}
