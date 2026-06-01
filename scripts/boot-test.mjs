#!/usr/bin/env node
/** Diagnóstico: simula cold start Vercel (createApp + migrations). */
import dotenv from 'dotenv';

dotenv.config();
process.env.NODE_ENV = 'production';
process.env.VERCEL = '1';

const start = Date.now();
try {
  const { createApp } = await import('../src/server/app.js');
  const { app } = await createApp();
  console.log(`[boot-test] createApp OK em ${Date.now() - start}ms`);
  process.exit(0);
} catch (err) {
  console.error(`[boot-test] FALHOU em ${Date.now() - start}ms:`, err);
  process.exit(1);
}
