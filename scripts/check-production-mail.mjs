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
  console.log(
    '\n⚠ Campo mail ausente — faça deploy da versão atual e rode de novo.',
  );
  console.log('Enquanto isso, confira na Vercel: RESEND_API_KEY, MAIL_PROVIDER=resend, MAIL_FROM');
}

if (!body.mail?.configured) {
  console.log('\n── Ação na Vercel (Production + Preview) ──');
  console.log('  RESEND_API_KEY=re_...');
  console.log('  MAIL_PROVIDER=resend');
  console.log('  MAIL_FROM=PropEZ <noreply@...>');
  console.log('Redeploy após salvar.');
  process.exit(1);
}

console.log('\n── Teste autenticado (platform admin) ──');
console.log(`  POST ${appUrl}/api/admin/operations/test-email`);
console.log('  Body: {"to":"seu@email.com"}');
console.log('\n── Envio de proposta ──');
console.log(`  POST ${appUrl}/api/propostas/<id>/send-email`);
process.exit(0);
