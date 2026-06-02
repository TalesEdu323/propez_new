/**
 * Garante que todos os módulos do servidor Express carregam sem erros de
 * inicialização (TDZ, imports quebrados, etc.).
 *
 * Roda no CI antes do build — não precisa de Postgres real nem rede.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** Arquivos em src/lib importados pelo servidor (Node ESM exige .js nas extensões). */
const SERVER_LIB_ENTRYPOINTS = [
  'src/lib/contractVariables.ts',
  'src/lib/pageLayout.ts',
  'src/lib/featureFlags.ts',
  'src/lib/layoutContext.ts',
  'src/lib/ids.ts',
  'src/lib/orgBrand.ts',
  'src/lib/planConfig.ts',
  'src/server/lib/secretCrypto.ts',
];

function assertEsmRelativeImports(filePath: string, visited = new Set<string>()): void {
  const abs = path.resolve(root, filePath);
  if (visited.has(abs)) return;
  visited.add(abs);

  const content = fs.readFileSync(abs, 'utf8');
  const dir = path.dirname(abs);

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('import ') || trimmed.startsWith('import type ')) continue;

    const match = trimmed.match(/^import\s+(?:[\w*{}\s,]+)\s+from\s+['"](\.[^'"]+)['"]/);
    if (!match) continue;

    const spec = match[1];
    if (!spec.startsWith('./')) continue;

    if (spec.endsWith('.js') || spec.endsWith('.json')) {
      const tsPath = path.join(dir, spec.replace(/\.js$/, '.ts'));
      if (fs.existsSync(tsPath)) assertEsmRelativeImports(path.relative(root, tsPath), visited);
      continue;
    }

    throw new Error(
      `[check-server-imports] import ESM sem .js em ${filePath}: "${spec}" (Node na Vercel falha)`,
    );
  }
}

for (const entry of SERVER_LIB_ENTRYPOINTS) {
  assertEsmRelativeImports(entry);
}
console.log('[check-server-imports] imports ESM em src/lib OK');

const CI_DEFAULTS: Record<string, string> = {
  APP_URL: 'http://localhost:3001',
  DATABASE_URL: 'postgresql://ci:ci@localhost:5432/ci?sslmode=disable',
  STRIPE_SECRET_KEY: 'sk_test_ci_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_ci_placeholder',
  JWT_SECRET: 'ci-test-jwt-secret-minimum-32-characters-long',
};

for (const [key, value] of Object.entries(CI_DEFAULTS)) {
  if (!process.env[key]?.trim()) {
    process.env[key] = value;
  }
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

try {
  await import('../src/server/app.js');
  console.log('[check-server-imports] módulos do servidor OK');
  // Garante que createApp() executa (ex.: imports ausentes como createHealthRouter).
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  const { createApp } = await import('../src/server/app.js');
  await createApp();
  console.log('[check-server-imports] createApp OK');
} catch (err) {
  console.error('[check-server-imports] falha ao carregar o servidor:', err);
  process.exit(1);
}
