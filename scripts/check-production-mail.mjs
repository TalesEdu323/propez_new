#!/usr/bin/env node
/**
 * Diagnóstico de e-mail em produção (Vercel) via /api/boot-check.
 * Uso: node scripts/check-production-mail.mjs
 * Requer APP_URL no .env ou argumento: node scripts/check-production-mail.mjs https://propez.taggo.com.br
 */
import dotenv from 'dotenv';

dotenv.config();

const appUrl = (process.argv[2] || process.env.APP_URL || '').replace(/\/+$/, '');
if (!appUrl) {
  console.error('Defina APP_URL no .env ou passe a URL: node scripts/check-production-mail.mjs https://...');
  process.exit(1);
}

const url = `${appUrl}/api/boot-check`;
console.log(`[check-production-mail] GET ${url}`);

const res = await fetch(url);
const body = await res.json();

console.log('\n── Status ──');
console.log('HTTP', res.status, 'ok:', body.ok);

if (body.mail) {
  console.log('\n── E-mail (boot-check) ──');
  console.log('provider:', body.mail.provider);
  console.log('configured:', body.mail.configured);
  console.log('from:', body.mail.from);
  console.log('smtpHost:', body.mail.smtpHost);
  console.log('hasResendKey:', body.mail.hasResendKey);
  if (body.mail.warnings?.length) {
    console.log('warnings:');
    for (const w of body.mail.warnings) console.log('  -', w);
  }
} else {
  console.log('\n⚠ Campo mail ausente no boot-check de produção.');
  console.log('Isso significa que o deploy na Vercel ainda NÃO inclui a versão nova do código.');
  console.log('Faça push + redeploy e rode este script de novo.');
  console.log('\n── Enquanto isso (SMTP Hostinger na Vercel) ──');
  console.log('  MAIL_PROVIDER=smtp');
  console.log('  MAIL_FROM=PropEZ <noreplypropez@taggo.com.br>');
  console.log('  SMTP_HOST=smtp.hostinger.com');
  console.log('  SMTP_PORT=465');
  console.log('  SMTP_SECURE=true');
  console.log('  SMTP_USER=noreplypropez@taggo.com.br');
  console.log('  SMTP_PASS=<senha sem aspas no painel>');
  console.log('  SMTP_TIMEOUT=30000');
  console.log('  SMTP_GREETING_TIMEOUT=8000');
  console.log('\n(Opção alternativa: RESEND_API_KEY + MAIL_PROVIDER=resend)');
}

if (!body.mail?.configured) {
  if (body.mail) {
    console.log('\n── E-mail não configurado na função serverless ──');
    if (body.mail.provider === 'none') {
      console.log('provider=none — variáveis SMTP ou Resend ausentes/inválidas na Vercel.');
    }
    console.log('Confira Production + Preview, salve e redeploy.');
  }
  process.exit(1);
}

console.log('\n── Teste autenticado (platform admin) ──');
console.log(`  POST ${appUrl}/api/admin/operations/test-email`);
console.log('  Body: {"to":"seu@email.com"}');
console.log('\n── Envio de proposta ──');
console.log(`  POST ${appUrl}/api/propostas/<id>/send-email`);
process.exit(0);
