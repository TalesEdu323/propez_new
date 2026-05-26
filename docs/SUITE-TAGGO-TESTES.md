# Guia de testes — Suíte Taggo (Propez + ProSync + Rubrica + Site IdP)

> **Documentação principal (siga na ordem):** [suite-taggo/GUIA-COMPLETO.md](./suite-taggo/GUIA-COMPLETO.md)  
> **Checklist para marcar:** [suite-taggo/CHECKLIST.md](./suite-taggo/CHECKLIST.md)  
> **Índice da pasta:** [suite-taggo/README.md](./suite-taggo/README.md)

Este documento complementa o guia com detalhes de testes por fase e troubleshooting.

---

## Visão geral

| Projeto | Pasta | Banco | Papel |
|---------|-------|-------|-------|
| **Site Taggo (IdP)** | `C:\Users\suporte\GitHub\site-novo-tgs` | Neon do site | Login único OIDC (`accounts.taggo.com.br`) |
| **Propez** | `C:\Users\suporte\GitHub\propez_new` | Neon Propez | Orquestrador + credenciais por org |
| **ProSync** | `C:\Users\suporte\GitHub\Prosync` | Neon ProSync | CRM + status de propostas no lead |
| **Rubrica** | `C:\Users\suporte\GitHub\Rubrica-Assinaturas` | Neon Rubrica | Assinaturas |

Cada app usa **banco Postgres separado**. O `TAGGO_SUITE_SECRET` deve ser **idêntico** nos quatro `.env`.

---

## Parte 1 — Gerar segredos (uma vez)

Abra um terminal PowerShell e gere os valores:

```powershell
# Segredo HMAC compartilhado (64 bytes hex) — COPIE O MESMO para os 4 apps
openssl rand -hex 64

# Cookie do IdP (site Taggo)
openssl rand -base64 32

# Secrets OIDC — um por app (propez, prosync, rubrica)
openssl rand -hex 64
openssl rand -hex 64
openssl rand -hex 64

# Chaves RS256 do IdP (site Taggo)
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in private.pem -pubout -out public.pem
```

Para colar os PEMs na env (Vercel/local), substitua quebras de linha por `\n` ou use o conteúdo multiline no painel de secrets.

---

## Parte 2 — Migrations SQL (4 bancos)

Rode cada script no **Neon/console SQL** do banco correspondente. Todos são idempotentes.

### 2.1 Site Taggo (`site-novo-tgs`)

Arquivo: `site-novo-tgs/scripts/sql/taggo-oidc.sql`

Cria: `taggo_identity_users`, `taggo_identity_app_links`, `taggo_authorization_codes`.

Depois:

```powershell
cd C:\Users\suporte\GitHub\site-novo-tgs
npm run db:seed-identity
```

Usa `ADMIN_EMAIL` / `ADMIN_PASSWORD` do `.env.local` (ou `IDENTITY_SEED_*`).

### 2.2 Propez

Arquivos (nesta ordem):

1. `propez_new/sql/005_suite_credentials.sql` — `org_integration_credentials`, `taggo_suite_lookups`
2. `propez_new/sql/006_sso_identity_links.sql` — `taggo_identity_links`

> Se o Propez ainda não tiver schema base, rode antes `sql/002_core.sql` e demais migrations do projeto.

### 2.3 ProSync

Arquivo: `Prosync/scripts/CREATE_SUITE_INTEGRATION.sql`

Cria/atualiza: `taggo_suite_lookups`, colunas em `api_keys`, `lead_external_proposals`, `taggo_identity_links`, `deprecated_at`.

### 2.4 Rubrica

Arquivo: `Rubrica-Assinaturas/scripts/create-suite-integration.sql`

Cria/atualiza: colunas em `api_keys`, `taggo_identity_links`.

Opcional (Fase 5 — deprecar keys manuais):

```sql
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "deprecatedAt" TIMESTAMPTZ;
UPDATE api_keys SET "deprecatedAt" = NOW()
 WHERE "createdBySystem" = FALSE AND "deprecatedAt" IS NULL AND "revokedAt" IS NULL;
```

---

## Parte 3 — Variáveis de ambiente

### 3.1 Mapa de portas (desenvolvimento local)

Evite conflito subindo cada app em uma porta:

| App | Comando | Porta sugerida |
|-----|---------|----------------|
| Site Taggo (IdP) | `npm run dev` | **3000** |
| ProSync | `npx next dev -p 3001` | **3001** |
| Rubrica | `npx next dev -p 3002` | **3002** |
| Propez | `$env:PORT=3003; npm run dev` | **3003** |

### 3.2 Site Taggo — `.env.local`

```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

TAGGO_ISSUER=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

TAGGO_JWT_PRIVATE_KEY_PEM=...
TAGGO_JWT_PUBLIC_KEY_PEM=...
TAGGO_JWT_KID=taggo-1

TAGGO_ACCOUNTS_COOKIE_SECRET=...   # openssl rand -base64 32
TAGGO_SUITE_SECRET=...             # mesmo valor nos 4 apps

# JSON em uma linha — redirect URIs LOCAL para testes
TAGGO_CLIENTS_JSON=[{"clientId":"propez","clientSecret":"SEU_SECRET_PROPEZ","redirectUris":["http://localhost:3003/api/sso/callback"]},{"clientId":"prosync","clientSecret":"SEU_SECRET_PROSYNC","redirectUris":["http://localhost:3001/api/sso/callback"]},{"clientId":"rubrica","clientSecret":"SEU_SECRET_RUBRICA","redirectUris":["http://localhost:3002/api/sso/callback"]}]

ADMIN_EMAIL=teste@taggo.com.br
ADMIN_PASSWORD=Teste123!
```

### 3.3 Propez — `.env`

```env
PORT=3003
APP_URL=http://localhost:3003
DATABASE_URL=postgresql://...

TAGGO_SUITE_SECRET=...             # idêntico
CREDENTIALS_KEY=...                # opcional; senão deriva do suite secret

PROSYNC_API_URL=http://localhost:3001
RUBRICA_API_URL=http://localhost:3002
# PROSYNC_API_KEY e RUBRICA_API_KEY podem ficar vazios se usar suíte nativa

TAGGO_SSO_ISSUER=http://localhost:3000
TAGGO_SSO_CLIENT_ID=propez
TAGGO_SSO_CLIENT_SECRET=SEU_SECRET_PROPEZ
TAGGO_SSO_REDIRECT_URI=http://localhost:3003/api/sso/callback
```

### 3.4 ProSync — `.env.local`

```env
NEXT_PUBLIC_APP_URL=http://localhost:3001
AUTH_SECRET=...

TAGGO_SUITE_SECRET=...             # idêntico
SUITE_ADVANCED_MODE=false

TAGGO_SSO_ISSUER=http://localhost:3000
TAGGO_SSO_CLIENT_ID=prosync
TAGGO_SSO_CLIENT_SECRET=SEU_SECRET_PROSYNC
TAGGO_SSO_REDIRECT_URI=http://localhost:3001/api/sso/callback
```

### 3.5 Rubrica — `.env`

```env
NEXT_PUBLIC_APP_URL=http://localhost:3002
DATABASE_URL=...

TAGGO_SUITE_SECRET=...             # idêntico
NEXT_PUBLIC_SUITE_ADVANCED_MODE=false

TAGGO_SSO_ISSUER=http://localhost:3000
TAGGO_SSO_CLIENT_ID=rubrica
TAGGO_SSO_CLIENT_SECRET=SEU_SECRET_RUBRICA
TAGGO_SSO_REDIRECT_URI=http://localhost:3002/api/sso/callback
```

### 3.6 Produção

Troque `localhost` pelos domínios reais:

| Variável | Produção |
|----------|----------|
| `TAGGO_ISSUER` / `TAGGO_SSO_ISSUER` | `https://accounts.taggo.com.br` |
| Propez callback | `https://propez.taggo.com.br/api/sso/callback` |
| ProSync callback | `https://prosync.tech/api/sso/callback` |
| Rubrica callback | `https://app.rubrica.com.br/api/sso/callback` |

DNS: aponte `accounts.taggo.com.br` para o **mesmo deploy Vercel** do `site-novo-tgs`.

---

## Parte 4 — Subir os serviços

Ordem recomendada:

```powershell
# Terminal 1 — IdP
cd C:\Users\suporte\GitHub\site-novo-tgs
npm install
npm run dev

# Terminal 2 — ProSync
cd C:\Users\suporte\GitHub\Prosync
npm install
npx next dev -p 3001

# Terminal 3 — Rubrica
cd C:\Users\suporte\GitHub\Rubrica-Assinaturas
npm install
npx next dev -p 3002

# Terminal 4 — Propez
cd C:\Users\suporte\GitHub\propez_new
npm install
$env:PORT="3003"; npm run dev
```

---

## Parte 5 — Script auxiliar HMAC (testes manuais)

Salve como `propez_new/scripts/suite-hmac.mjs` (ou rode inline) para assinar requests à suíte:

```javascript
import crypto from 'node:crypto';

const secret = process.env.TAGGO_SUITE_SECRET;
const app = process.argv[2] || 'propez';
const body = process.argv[3] || '{}';
const ts = Date.now().toString();
const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');

console.log(JSON.stringify({
  'Content-Type': 'application/json',
  'x-taggo-suite-app': app,
  'x-taggo-suite-timestamp': ts,
  'x-taggo-suite-signature': sig,
  body,
}, null, 2));
```

Uso:

```powershell
$env:TAGGO_SUITE_SECRET="seu-secret"
node scripts/suite-hmac.mjs propez '{"email":"teste@exemplo.com","password":"senha123"}'
```

---

## Parte 6 — Checklist de testes por fase

### Fase 0 — Identity lookup (cross-app)

**Objetivo:** Propez descobre se email existe no ProSync/Rubrica.

1. Crie um usuário no ProSync e/ou Rubrica com email `teste@taggo.com.br`.
2. Teste lookup no ProSync:

```powershell
# Gere headers com suite-hmac.mjs, depois:
curl -X POST http://localhost:3001/api/identity/lookup `
  -H "Content-Type: application/json" `
  -H "x-taggo-suite-app: propez" `
  -H "x-taggo-suite-timestamp: TIMESTAMP" `
  -H "x-taggo-suite-signature: sha256=..." `
  -d "{\"email\":\"teste@taggo.com.br\",\"password\":\"SUA_SENHA\"}"
```

Resposta esperada: `{ "exists": true, "passwordMatches": true, "userId": "...", ... }`

3. Registre um usuário novo no Propez (`POST /api/auth/register`) e verifique nos logs se o lookup foi disparado (não bloqueia o signup).

---

### Fase 1 — Service token (provisionamento automático)

**Objetivo:** Propez obtém API key sem UI manual.

1. No Propez, logado como admin de uma org, chame:

```http
POST http://localhost:3003/api/integrations/credentials/prosync/provision
Cookie: propez_session=...
```

2. Ou via ProSync diretamente (HMAC):

```http
POST http://localhost:3001/api/partner/service-token
Body: { "email": "teste@taggo.com.br", "action": "create_or_link", "partner_app": "propez", "scopes": ["crm:read","crm:write"] }
```

Resposta esperada: `{ "apiKey": "ps_live_...", "userId": "...", "organizationId": "..." }`

3. Confirme linha em `org_integration_credentials` no banco Propez (campo cifrado).

4. Liste credenciais:

```http
GET http://localhost:3003/api/integrations/credentials
```

---

### Fase 2 — Credenciais por organização

**Objetivo:** chamadas ProSync/Rubrica usam key da org, não `.env` global.

1. Com credencial provisionada (Fase 1), no Propez:

```http
GET http://localhost:3003/api/integrations/prosync/leads
Cookie: propez_session=...
```

2. Deve retornar leads do ProSync **sem** `PROSYNC_API_KEY` no `.env` do Propez.

3. Health check:

```powershell
cd C:\Users\suporte\GitHub\propez_new
$env:PROP_EZ_CHECK_URL="http://127.0.0.1:3003"
npm run check:integrations
```

Esperado: `suite.enabled: true`, `credentialsEncryption: true`.

---

### Fase 3 — SSO (login único)

**Objetivo:** entrar nos apps via IdP central.

#### 3.1 Discovery OIDC

```powershell
curl http://localhost:3000/.well-known/openid-configuration
curl http://localhost:3000/api/jwks
```

#### 3.2 Login no IdP

1. Abra `http://localhost:3000/accounts/login`
2. Entre com o usuário criado em `db:seed-identity`
3. Deve redirecionar para `/accounts` com sessão ativa

#### 3.3 SSO no Propez

1. Abra `http://localhost:3003/api/sso/start` (ou botão SSO na UI se existir)
2. Fluxo: Propez → IdP (`/accounts/login` se não logado) → callback Propez → sessão Propez
3. Verifique `GET http://localhost:3003/api/sso/status` → `{ "enabled": true }`

Repita para ProSync (`/api/sso/start`) e Rubrica (`/api/sso/start`).

#### 3.4 Vínculo de identidade

Após primeiro login SSO, confira tabela `taggo_identity_links` no banco de cada app.

---

### Fase 4 — Status de propostas no ProSync

**Objetivo:** ProSync mostra propostas Propez no detalhe do lead.

**Pré-requisitos:**

- Proposta Propez com `prosync_lead_id` preenchido (ID do lead no ProSync)
- `TAGGO_SUITE_SECRET` configurado no Propez e ProSync

#### 4.1 Evento manual (curl)

```powershell
# Body exemplo
$body = '{"event":"proposal.created","externalId":"UUID-PROPOSTA","leadId":"UUID-LEAD-PROSYNC","title":"Proposta teste","status":"pendente","valueCents":100000,"currency":"BRL"}'
# Assine com suite-hmac.mjs e POST:
curl -X POST http://localhost:3001/api/partner/proposal-events `
  -H "Content-Type: application/json" `
  -H "x-taggo-suite-app: propez" `
  -H "x-taggo-suite-timestamp: ..." `
  -H "x-taggo-suite-signature: sha256=..." `
  -d $body
```

#### 4.2 Fluxo real no Propez

| Ação | Evento emitido |
|------|----------------|
| Criar proposta com `prosyncLeadId` | `proposal.created` |
| Enviar para Rubrica (`POST /api/integrations/rubrica/send`) | `proposal.sent` |
| Cliente aprova/recusa link público | `proposal.approved` / `proposal.rejected` |
| Webhook Rubrica `document.signed` | `proposal.signed` |

#### 4.3 UI ProSync

1. Abra um lead no CRM
2. Aba **Propostas Propez**
3. Deve listar status, valor e link público

API interna (logado no ProSync):

```http
GET http://localhost:3001/api/partner/proposal-events?leadId=UUID-DO-LEAD
```

---

### Fase 5 — Migração e UI cleanup

#### 5.1 Migrar credenciais globais → por org (Propez)

Se ainda usa `PROSYNC_API_KEY` / `RUBRICA_API_KEY` no `.env`:

```powershell
cd C:\Users\suporte\GitHub\propez_new
npm run migrate:suite-credentials -- --dry-run
npm run migrate:suite-credentials
```

#### 5.2 UI de integrações oculta

- **ProSync:** `http://localhost:3001/settings/integrations` → aviso de suíte nativa. Modo manual: `?advanced=1`
- **Rubrica:** `http://localhost:3002/settings/integrations` → idem. Modo manual: `?advanced=1`

#### 5.3 Keys deprecated (ProSync)

Após rodar `CREATE_SUITE_INTEGRATION.sql`, keys manuais antigas têm `deprecated_at` preenchido (não revogadas).

---

## Parte 7 — Ordem sugerida de validação

```
[ ] 1. SQL nos 4 bancos
[ ] 2. TAGGO_SUITE_SECRET igual nos 4 .env
[ ] 3. Site IdP: seed-identity + /.well-known + /api/jwks
[ ] 4. Lookup HMAC (ProSync + Rubrica)
[ ] 5. Service token (ProSync + Rubrica)
[ ] 6. Provision no Propez + list credentials
[ ] 7. GET leads via integração por org
[ ] 8. SSO start → login IdP → callback (Propez, ProSync, Rubrica)
[ ] 9. Criar proposta com prosyncLeadId → ver aba no lead ProSync
[ ] 10. migrate:suite-credentials (se aplicável)
[ ] 11. Confirmar UI integrações oculta (Fase 5)
```

---

## Parte 8 — Problemas comuns

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| `Assinatura inválida` | `TAGGO_SUITE_SECRET` diferente entre apps | Igualar nos 4 `.env` |
| `TAGGO_SUITE_SECRET ausente` no health | Secret < 32 chars ou vazio | `openssl rand -hex 64` |
| SSO redirect loop | `redirect_uri` não está em `TAGGO_CLIENTS_JSON` | Adicionar URI exata |
| SSO `invalid_client` | `clientSecret` diverge IdP ↔ app | Conferir par no JSON e no app |
| `Chaves não configuradas` (JWKS) | PEMs ausentes no site | Preencher `TAGGO_JWT_*_PEM` |
| Propostas não aparecem no lead | `prosync_lead_id` vazio na proposta | Vincular lead ao criar proposta |
| Webhook Rubrica não chega | `APP_URL` local | Usar ngrok ou deploy |
| Cifra indisponível | Sem `CREDENTIALS_KEY` nem suite secret longo | Definir um dos dois (≥32 chars) |

---

## Parte 9 — Produção (checklist rápido)

1. [ ] SQL rodado nos 4 Neon
2. [ ] `accounts.taggo.com.br` → deploy site Taggo (Vercel)
3. [ ] PEMs RS256 + `TAGGO_CLIENTS_JSON` com URLs de produção
4. [ ] `TAGGO_SUITE_SECRET` idêntico em Propez, ProSync, Rubrica, Site
5. [ ] `TAGGO_SSO_*` em cada app com secrets do JSON
6. [ ] `npm run migrate:suite-credentials` no Propez (se tinha keys globais)
7. [ ] Teste SSO em cada produto
8. [ ] Teste criar proposta → aba Propostas Propez no lead
9. [ ] Remover `PROSYNC_API_KEY` / `RUBRICA_API_KEY` globais após validar

---

## Referência de arquivos

| Fase | Propez | ProSync | Rubrica | Site |
|------|--------|---------|---------|------|
| SQL | `sql/005_*.sql`, `006_*.sql` | `scripts/CREATE_SUITE_INTEGRATION.sql` | `scripts/create-suite-integration.sql` | `scripts/sql/taggo-oidc.sql` |
| Lookup | `clients/suiteLookup.ts` | `api/identity/lookup` | `api/identity/lookup` | — |
| Service token | `clients/suiteServiceToken.ts` | `api/partner/service-token` | `api/partner/service-token` | — |
| SSO | `routes/sso.ts` | `api/sso/*` | `api/sso/*` | `api/authorize`, `api/token`, `/accounts/login` |
| Propostas | `clients/suiteProposalEvents.ts` | `api/partner/proposal-events` | — | — |
| Migração | `scripts/migrate-suite-credentials.mjs` | — | — | `scripts/seed-identity.ts` |
