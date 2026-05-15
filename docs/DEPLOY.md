# Deploy do PropEZ — checklist de variáveis de ambiente

Este runbook documenta como configurar o servidor Node do PropEZ em produção. A
regra geral é: **em produção não se usa o arquivo `.env`**. Cada variável é
cadastrada no painel do provedor escolhido (Cloud Run, Vercel, Render, VPS).
O `dotenv.config()` em [`server.ts`](../server.ts) é no-op quando não existe
`.env`, então só o `process.env` real é lido.

## Como o servidor lê o env

```
process.env
   ├── src/server/env.ts          → loadConfig() (obrigatórias)
   └── src/server/config.ts       → loadIntegrationsConfig() (opcionais)
           ↓
        createApp()
           ↓
        logStartupIntegrationDiagnostics() + GET /api/health
```

- Variáveis obrigatórias (sem elas o boot falha): `APP_URL`, `DATABASE_URL`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET` (em prod).
- Variáveis opcionais (degradam funcionalidade, mas o app sobe): integrações
  ProSync/Rubrica, Resend, price IDs do Stripe, `CORS_ORIGINS`.

## Checklist universal (todas as plataformas)

Marque cada item antes de promover para produção:

- [ ] `NODE_ENV=production`
- [ ] `APP_URL=https://<dominio-real>` (HTTPS, sem barra no final)
- [ ] `PORT` ajustado para o que a plataforma exige (Cloud Run injeta `PORT`)
- [ ] `DATABASE_URL` apontando para Neon/Postgres real com `sslmode=require`
- [ ] `JWT_SECRET` novo, gerado com `openssl rand -hex 64` (NÃO reusar valor de dev)
- [ ] `SESSION_COOKIE_NAME` (default `propez_session` está ok; troque só se houver outro PropEZ no mesmo domínio)
- [ ] `STRIPE_SECRET_KEY` em modo live (`sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` do webhook cadastrado em `{APP_URL}/api/stripe/webhook`
- [ ] `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_PRICE_BUSINESS_MONTHLY`, `STRIPE_PRICE_BUSINESS_YEARLY`
- [ ] `RESEND_API_KEY` + `MAIL_FROM` (sem isso a verificação de email não envia)
- [ ] `PROSYNC_API_URL` + `PROSYNC_API_KEY` (`ps_live_...`) + `PROSYNC_WEBHOOK_SECRET` (mesmo secret cadastrado no outbound webhook do ProSync)
- [ ] `RUBRICA_API_URL` + `RUBRICA_API_KEY` (`dm_live_...`) + `RUBRICA_WEBHOOK_SECRET`
- [ ] `CORS_ORIGINS` com domínios alternativos (www, apex, staging) separados por vírgula

Webhooks externos a registrar nas plataformas parceiras:

- Stripe: endpoint `{APP_URL}/api/stripe/webhook`, eventos mínimos
  `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`.
- ProSync (outbound webhook): URL `{APP_URL}/api/webhooks/prosync`, eventos
  `lead.created`, `lead.updated`, `lead.status_changed`, `lead.sale_confirmed`.
- Rubrica: não precisa registrar — o PropEZ envia a `webhookUrl` dinamicamente
  com o secret em query string a cada `POST /api/integrations/rubrica/send`.

## Por plataforma

### Google Cloud Run

1. Build da imagem (Dockerfile ou Cloud Build).
2. Cadastrar variáveis via console (Service → Edit & Deploy → Variables &
   Secrets) ou CLI:

   ```bash
   gcloud run deploy propez \
     --image gcr.io/<PROJECT>/propez:latest \
     --region us-east1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production,APP_URL=https://app.propez.com,CORS_ORIGINS=https://www.propez.com \
     --set-secrets DATABASE_URL=propez-db-url:latest,JWT_SECRET=propez-jwt:latest,STRIPE_SECRET_KEY=stripe-secret:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook:latest,RESEND_API_KEY=resend-key:latest,PROSYNC_API_KEY=prosync-key:latest,PROSYNC_WEBHOOK_SECRET=prosync-webhook:latest,RUBRICA_API_KEY=rubrica-key:latest,RUBRICA_WEBHOOK_SECRET=rubrica-webhook:latest
   ```

3. Secrets sensíveis devem ir para o **Secret Manager** e ser referenciados via
   `--set-secrets`, nunca como `--set-env-vars`.
4. Cloud Run injeta `PORT` automaticamente — o servidor já respeita
   `process.env.PORT` em [`src/server/env.ts`](../src/server/env.ts).

### Vercel

1. Project Settings → Environment Variables → adicionar uma a uma para os
   environments `Production`, `Preview` e `Development` (se necessário).
2. Marcar como **Sensitive** todos os secrets (`STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, `*_API_KEY`, `*_WEBHOOK_SECRET`,
   `DATABASE_URL`, `RESEND_API_KEY`).
3. `APP_URL` deve refletir o domínio público (não o `*.vercel.app` se você
   tiver domínio customizado — webhooks Stripe/ProSync devem bater no mesmo).
4. Após cada mudança de env, gatilhar um **redeploy** — Vercel não recarrega
   envs em runtime.

### Render / Railway / Fly.io

1. Dashboard do serviço → Environment → adicionar pares chave/valor.
2. Em Render: marcar como **Secret File** ou **Environment Variable** conforme
   sensibilidade.
3. `PORT` é injetado automaticamente nas três plataformas.
4. Sem reload automático — fazer redeploy depois de mudar envs.

### VPS própria (systemd / pm2 / Docker)

Três opções comuns:

1. **systemd**: criar `/etc/propez.env` com as variáveis (permissão `600`,
   owner root) e referenciar no unit file:

   ```ini
   [Service]
   EnvironmentFile=/etc/propez.env
   ExecStart=/usr/bin/node /opt/propez/server.js
   ```

2. **pm2**: usar `ecosystem.config.js` com `env_production` ou
   `pm2 start server.js --update-env` após exportar as envs no shell.
3. **Docker**: rodar com `--env-file /etc/propez.env` (NÃO copie o `.env` para
   dentro da imagem) ou usar `docker secret`/`compose secrets` em Swarm/Compose.

Em qualquer dos três, o arquivo de envs deve ficar **fora** do repositório git e
com permissão restrita (`chmod 600`).

## Validação pós-deploy

```bash
curl https://<APP_URL>/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "database": true,
  "appUrl": "https://app.propez.com",
  "appUrlPublic": true,
  "integrations": { "prosync": true, "rubrica": true },
  "detail": {
    "prosync": { "apiKey": "configured", "webhookSecret": "configured" },
    "rubrica": { "apiKey": "configured" }
  },
  "warnings": []
}
```

Sinais de problema:

- `database: false` → conferir `DATABASE_URL` e regra de IP do Neon.
- `apiKey: "placeholder"` → variável ainda contém `<PREENCHER>`.
- `apiKey: "missing"` → variável não foi cadastrada no provedor.
- `appUrlPublic: false` → `APP_URL` aponta para localhost/HTTP (webhooks
  externos não chegam).
- `warnings: [...]` não vazio → ler cada mensagem; cobrem os erros comuns
  (secret faltando, placeholder, URL local).

Após o health passar, rodar o smoke test ponta a ponta documentado em
[`INTEGRACOES_SMOKE_TEST.md`](INTEGRACOES_SMOKE_TEST.md).

## Segurança de segredos

- Nunca commitar `.env`. O `.gitignore` já bloqueia `.env*` exceto
  `.env.example`.
- `.env.example` só pode conter placeholders (`<PREENCHER>`) e defaults
  públicos. Auditar a cada PR que mexer em variáveis.
- Em produção, preferir o gerenciador de segredos nativo (Secret Manager no
  GCP, AWS Secrets Manager, Vercel Encrypted, Render Secret Files).
- Rotacionar `JWT_SECRET` invalida todas as sessões ativas — fazer em janela
  de manutenção.
- Se um secret vazar em commit/log, considerar comprometido: rotacionar no
  provedor (Stripe → roll key, Neon → reset password, ProSync/Rubrica → revoke
  + recriar API key).
