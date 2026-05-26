#!/usr/bin/env node
/**
 * Gera headers HMAC para testar endpoints da suíte Taggo manualmente.
 *
 * Uso:
 *   set TAGGO_SUITE_SECRET=...
 *   node scripts/suite-hmac.mjs propez '{"email":"a@b.com","password":"x"}'
 *
 * Saída: JSON com headers + body prontos para curl/Postman.
 */
import crypto from 'node:crypto';

const secret = process.env.TAGGO_SUITE_SECRET;
if (!secret || secret.length < 32) {
  console.error('Defina TAGGO_SUITE_SECRET (>= 32 chars) no ambiente.');
  process.exit(1);
}

const app = process.argv[2] || 'propez';
const body = process.argv[3] || '{}';
const ts = Date.now().toString();
const sig =
  'sha256=' +
  crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

console.log(
  JSON.stringify(
    {
      headers: {
        'Content-Type': 'application/json',
        'x-taggo-suite-app': app,
        'x-taggo-suite-timestamp': ts,
        'x-taggo-suite-signature': sig,
      },
      body: JSON.parse(body),
      curl_example: `curl -X POST URL -H "Content-Type: application/json" -H "x-taggo-suite-app: ${app}" -H "x-taggo-suite-timestamp: ${ts}" -H "x-taggo-suite-signature: ${sig}" -d '${body.replace(/'/g, "'\\''")}'`,
    },
    null,
    2,
  ),
);
