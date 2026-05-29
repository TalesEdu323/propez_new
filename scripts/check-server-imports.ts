/**
 * Garante que todos os módulos do servidor Express carregam sem erros de
 * inicialização (TDZ, imports quebrados, etc.).
 *
 * Roda no CI antes do build — não precisa de Postgres real nem rede.
 */
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
} catch (err) {
  console.error('[check-server-imports] falha ao carregar o servidor:', err);
  process.exit(1);
}
