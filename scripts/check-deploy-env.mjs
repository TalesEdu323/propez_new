#!/usr/bin/env node
/**
 * Valida variáveis obrigatórias antes de deploy (local ou Vercel).
 *
 * Uso:
 *   npm run check:deploy-env              # lê .env local
 *   npm run check:deploy-env -- --production
 *
 * Na Vercel, compare a saída com Environment Variables → Production e Preview.
 */
import dotenv from 'dotenv';

dotenv.config();

const productionMode =
  process.argv.includes('--production') || process.env.NODE_ENV === 'production';

const REQUIRED = [
  'APP_URL',
  'DATABASE_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

const RECOMMENDED = [
  'MAIL_FROM',
  'PROSYNC_WEBHOOK_SECRET',
  'RUBRICA_WEBHOOK_SECRET',
  'STRIPE_PRICE_PRO_MONTHLY',
  'STRIPE_PRICE_PRO_YEARLY',
  'STRIPE_PRICE_BUSINESS_MONTHLY',
  'STRIPE_PRICE_BUSINESS_YEARLY',
];

function isPlaceholder(value) {
  const v = (value || '').trim();
  if (!v) return true;
  const lower = v.toLowerCase();
  return (
    lower.includes('<preencher') ||
    lower.includes('change-me') ||
    lower.includes('your_') ||
    v === 'postgresql://USER:PASSWORD@HOST/DB?sslmode=require'
  );
}

const missing = [];
const placeholders = [];

for (const key of REQUIRED) {
  const value = process.env[key];
  if (!value?.trim()) {
    missing.push(key);
  } else if (isPlaceholder(value)) {
    placeholders.push(key);
  }
}

const recommendedMissing = RECOMMENDED.filter((key) => !process.env[key]?.trim());

console.log(`[check-deploy-env] modo=${productionMode ? 'production' : 'development'}`);

if (missing.length > 0) {
  console.error('[check-deploy-env] OBRIGATÓRIAS ausentes:');
  for (const key of missing) console.error(`  - ${key}`);
}

if (placeholders.length > 0) {
  console.error('[check-deploy-env] OBRIGATÓRIAS ainda com placeholder:');
  for (const key of placeholders) console.error(`  - ${key}`);
}

if (recommendedMissing.length > 0) {
  console.warn('[check-deploy-env] Recomendadas ausentes (app sobe, funcionalidade degradada):');
  for (const key of recommendedMissing) console.warn(`  - ${key}`);
}

if (productionMode && !process.env.RESEND_API_KEY?.trim() && isPlaceholder(process.env.SMTP_HOST)) {
  console.warn(
    '[check-deploy-env] Nenhum provedor de e-mail válido (SMTP_HOST ou RESEND_API_KEY) — auth por e-mail falhará em produção.',
  );
}

const dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && !dbUrl.includes('-pooler') && (process.env.VERCEL === '1' || productionMode)) {
  console.warn(
    '[check-deploy-env] DATABASE_URL sem "-pooler" no host — prefira o endpoint pooler do Neon na Vercel.',
  );
}

if (missing.length > 0 || placeholders.length > 0) {
  console.error(
    '\n[check-deploy-env] Corrija no painel Vercel (Production + Preview) ou no .env local.',
  );
  console.error('Template: env.example na raiz do repositório.');
  process.exit(1);
}

console.log('[check-deploy-env] variáveis obrigatórias OK');
process.exit(0);
