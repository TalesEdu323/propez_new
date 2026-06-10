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
- [ ] `MAIL_FROM` + (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` **ou** `RESEND_API_KEY`) — auth + alertas de proposta/contrato
- [ ] `APP_URL` público e acessível (logo em e-mails: `{APP_URL}/logo.svg`)
- [ ] Migração `sql/007b_notifications.sql` aplicada no boot (tabela `notifications`, colunas `propostas.cliente_email` / `viewed_at`)
- [ ] Se o banco já tinha migrations `014_*` / `020_*` antigas: rodar `npm run migrate:rename-records` uma vez antes do deploy (ver [`sql/README.md`](../sql/README.md))
- [ ] `PROSYNC_API_URL` (default global) + `PROSYNC_WEBHOOK_SECRET` (webhook inbound Propez)
- [ ] `RUBRICA_API_URL` (default global) — chaves `ps_live_` / `dm_live_` por organização em **Configurações → Integrações** (não é obrigatório `PROSYNC_API_KEY` / `RUBRICA_API_KEY` na Vercel)
- [ ] `JWT_SECRET` (>= 32 chars) — também habilita cifra das chaves por org no banco
- [ ] Opcional legado single-tenant: `PROSYNC_API_KEY` / `RUBRICA_API_KEY` no `.env`
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

O repositório inclui [`vercel.json`](../vercel.json) e [`api/index.ts`](../api/index.ts):

- **`dist/`** — frontend (resultado de `npm run build`).
- **`api/index.ts`** — função serverless com o Express (rotas `/api/*`).

**Não** use o preset “Vite” só com output estático — isso gera 404 em `/api/auth/me`.
O `vercel.json` define `framework: null` e o rewrite `/api/*` → função Node.

#### Passo a passo no painel Vercel

1. Importar o repositório Git (ou `vercel link` na pasta do projeto).
2. **Framework Preset:** deixar **Other** (o `vercel.json` na raiz manda no build).
3. Confirmar (ou deixar o ficheiro definir):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm ci`
4. **Environment Variables** → Production (e Preview se quiser):
   - `NODE_ENV=production`
   - `APP_URL=https://<dominio-real>` (ex.: `https://propez.taggo.com.br`)
   - `DATABASE_URL`, `JWT_SECRET`, `STRIPE_*`, mail, integrações — ver checklist
     universal acima.
5. Marcar como **Sensitive** todos os secrets.
6. **Deploy** → aguardar build verde.

#### Validar

```bash
curl https://<APP_URL>/api/health
# deve retornar status "ok"

curl -i https://<APP_URL>/api/auth/me
# sem cookie: HTTP 401 (não 404)
```

Se `/api/health` der **404**, o projeto ainda está como site estático: confirme que
`vercel.json` e `api/index.ts` estão no commit deployado e que o preset não é só Vite.

#### Desenvolvimento local com rotas Vercel

```bash
npm run build
npx vercel dev
```

Usa as rewrites do `vercel.json` (API + SPA). Para dev com HMR, continue com
`npm run dev`.

#### Notas

- `PORT` no `.env` é ignorado na Vercel; não é necessário.
- Após mudar env no painel, fazer **Redeploy**.
- `APP_URL` deve ser o domínio público final (webhooks Stripe/ProSync no mesmo host).
- Copie as mesmas variáveis para o ambiente **Preview** (URLs `*.vercel.app`), não só
  Production — senão login e `/api/health` falham com 500 no preview.
- `DATABASE_URL`: preferir o endpoint **pooler** do Neon (`…-pooler.…neon.tech`).
- **Deployment Protection** (Settings → Deployment Protection): em previews protegidos,
  ficheiros estáticos como `manifest.webmanifest` podem devolver **401** antes de chegar à app.
  Desative a proteção no preview ou use o domínio de produção para testar.
- Erros **500** em `/api/auth/login`: ver **Deployments → Functions → Logs** (falta env,
  DB inacessível ou tabela `sessions` ausente). O deploy inclui `sql/**` para migrations no boot.
- Se **todas** as rotas `/api/*` retornam 500 ou 503, o boot do Express falhou (env ausente,
  migrations ou bug de import no código). Rode localmente `npm run check:server-imports` e
  `npm run check:deploy-env -- --production` antes do redeploy.
- O `.env` local **não** vai para o Git. Copie cada variável para **Vercel → Environment
  Variables** (Production **e** Preview). Use `cp .env.example .env` só na máquina local.

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

Antes de promover, na máquina local (com `.env` preenchido ou exportando vars):

```bash
npm run check:deploy-env -- --production
npm run check:server-imports
```

Depois do deploy:

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

### E-mails transacionais (proposta / contrato)

#### Vercel (produção / preview)

1. Em **Vercel → Settings → Environment Variables**, configure em **Production** e **Preview**:
   - `RESEND_API_KEY` (`re_...`, domínio verificado no painel Resend)
   - `MAIL_FROM` (mesmo endereço verificado, ex. `PropEZ <noreply@taggo.com.br>`)
   - `MAIL_PROVIDER=resend`
2. Redeploy após salvar variáveis.
3. Diagnóstico público: `GET {APP_URL}/api/boot-check` → campo `mail` (`provider`, `configured`, `warnings`).
4. Teste autenticado (platform admin): `POST /api/admin/operations/test-email` com body `{"to":"seu@email.com"}`.
5. Não confie só no `.env` local — a função serverless só lê variáveis do painel Vercel.

SMTP na Vercel é possível mas instável (timeout); o app prioriza Resend automaticamente quando `VERCEL=1`, `RESEND_API_KEY` está definida e `MAIL_PROVIDER` não é `smtp`.

#### Local

Preview de template HTML via SMTP (usa o `.env` local):

```bash
node scripts/test-business-email.mjs seu@email.com proposal_approved
```

Tipos: `proposal_approved`, `proposal_rejected`, `contract_sent`, `contract_signed`, `proposal_paid`.

## Contratos PDF legados (Vercel / Neon)

Na Vercel, o PDF do template de contrato persiste em `contratos_templates.pdf_data`
(BYTEA). Registros criados antes da migration `022` ou com upload perdido podem
ter `source_type = 'pdf'` sem bytes — o preview retorna 404 até **re-upload manual**.

Diagnóstico no Neon SQL Editor:

```sql
SELECT id, organization_id, titulo, pdf_file_name, page_count,
       (pdf_data IS NOT NULL AND length(pdf_data) > 0) AS has_bytes
FROM contratos_templates
WHERE source_type = 'pdf'
ORDER BY created_at DESC;
```

- `has_bytes = false` → abrir o contrato no app e usar **Substituir PDF** na etapa de conteúdo.
- Não há backfill automático: o arquivo original não existe mais no disco efêmero da Vercel.

## Segurança de segredos

- Nunca commitar `.env` (segredos reais). O `.gitignore` ignora `.env` e variantes locais.
- O template versionado é [`.env.example`](../.env.example) (só placeholders
  `<PREENCHER>`). Auditar a cada PR que mexer em variáveis.
- Em produção, preferir o gerenciador de segredos nativo (Secret Manager no
  GCP, AWS Secrets Manager, Vercel Encrypted, Render Secret Files).
- Rotacionar `JWT_SECRET` invalida todas as sessões ativas — fazer em janela
  de manutenção.
- Se um secret vazar em commit/log, considerar comprometido: rotacionar no
  provedor (Stripe → roll key, Neon → reset password, ProSync/Rubrica → revoke
  + recriar API key).
