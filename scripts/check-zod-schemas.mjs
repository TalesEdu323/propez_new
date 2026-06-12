#!/usr/bin/env node
/**
 * Falha se encontrar padrões Zod 4 inválidos (ex.: z.record(z.unknown())).
 * Uso: npm run check:zod
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanDir = path.join(root, 'src', 'server');

const BAD_PATTERNS = [
  { re: /z\.record\s*\(\s*z\.unknown\s*\(\s*\)\s*\)/g, label: 'z.record(z.unknown())' },
  { re: /z\.record\s*\(\s*z\.any\s*\(\s*\)\s*\)/g, label: 'z.record(z.any())' },
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

const hits = [];
for (const file of walk(scanDir)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const { re, label } of BAD_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) {
      hits.push(`${path.relative(root, file)} (${label})`);
    }
  }
}

if (hits.length > 0) {
  console.error('[check:zod] Padrões incompatíveis com Zod 4 encontrados:');
  for (const h of hits) console.error(`  - ${h}`);
  console.error('[check:zod] Use z.record(z.string(), z.unknown()) ou z.object({}).passthrough().');
  process.exit(1);
}

console.log('[check:zod] OK — nenhum padrão inválido em src/server');
