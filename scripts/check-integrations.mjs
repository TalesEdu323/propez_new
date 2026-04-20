#!/usr/bin/env node
/**
 * Checagem rápida das integrações (camada 1–3 do runbook).
 *
 * - Em CI (GITHUB_ACTIONS ou CI=true): só roda se INTEGRATION_CHECK=true
 *   (evita falhar o pipeline sem servidor Postgres/Propez).
 * - Local: chama GET /api/health e GET /api/integrations/prosync/leads
 *   (o segundo pode retornar 502 se PROSYNC_API_KEY não estiver no .env do servidor).
 *
 * Uso:
 *   npm run check:integrations
 *   PROP_EZ_CHECK_URL=http://127.0.0.1:3000 npm run check:integrations
 */

const baseUrl = (process.env.PROP_EZ_CHECK_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

const inCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const forceCheck = process.env.INTEGRATION_CHECK === 'true';

if (inCi && !forceCheck) {
  console.log(
    '[check-integrations] CI: pulando (defina INTEGRATION_CHECK=true e suba o Propez para validar neste job).',
  );
  process.exit(0);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  console.log('[check-integrations] baseUrl =', baseUrl);

  const health = await getJson(`${baseUrl}/api/health`);
  if (!health.ok) {
    console.error('[check-integrations] GET /api/health falhou:', health.status, health.body);
    process.exit(1);
  }
  console.log('[check-integrations] health OK:', JSON.stringify(health.body));

  // /api/auth/me sem cookie => 401 esperado. Qualquer outra coisa significa que
  // a rota não está montada.
  const me = await getJson(`${baseUrl}/api/auth/me`);
  if (me.status !== 401) {
    console.error(
      '[check-integrations] /api/auth/me deveria retornar 401 sem sessão, retornou',
      me.status,
      me.body,
    );
    process.exit(1);
  }
  console.log('[check-integrations] /api/auth/me OK (401 sem cookie)');

  // /api/public/propostas/<token-falso> => 404 esperado.
  const publicProposal = await getJson(`${baseUrl}/api/public/propostas/nao_existe_123`);
  if (publicProposal.status !== 404) {
    console.error(
      '[check-integrations] /api/public/propostas/:token deveria retornar 404 para token inexistente, retornou',
      publicProposal.status,
      publicProposal.body,
    );
    process.exit(1);
  }
  console.log('[check-integrations] /api/public/propostas/:token OK (404 p/ token inexistente)');

  const leads = await getJson(`${baseUrl}/api/integrations/prosync/leads?limit=1`);
  if (leads.status === 401) {
    console.warn(
      '[check-integrations] /api/integrations/prosync/leads retornou 401 (sem sessão autenticada).',
    );
    console.warn(
      '[check-integrations] Isso é esperado: as integrações agora exigem login. Para validar o proxy, faça login e rode novamente.',
    );
    process.exit(0);
  }
  if (!leads.ok) {
    console.warn(
      '[check-integrations] GET /api/integrations/prosync/leads não OK:',
      leads.status,
      leads.body,
    );
    console.warn(
      '[check-integrations] (esperado se PROSYNC_API_KEY não estiver configurada no servidor Propez)',
    );
    process.exit(1);
  }
  console.log('[check-integrations] prosync proxy respondeu:', leads.status);
  process.exit(0);
}

main().catch((err) => {
  console.error('[check-integrations] erro:', err?.message || err);
  if (err?.cause?.code === 'ECONNREFUSED') {
    console.error('[check-integrations] Servidor não está ouvindo em', baseUrl, '— rode `npm run dev` antes.');
  }
  process.exit(1);
});
