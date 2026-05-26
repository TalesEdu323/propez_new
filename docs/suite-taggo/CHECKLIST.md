# Checklist — Suíte Taggo

Marque `[x]` conforme for concluindo. Guia detalhado: [GUIA-COMPLETO.md](./GUIA-COMPLETO.md).

---

## Preparação

- [ ] Node 20+ e openssl disponíveis
- [ ] 4 repositórios na máquina (`site-novo-tgs`, `propez_new`, `Prosync`, `Rubrica-Assinaturas`)
- [ ] 4 `DATABASE_URL` (Neon) anotadas
- [ ] Planilha de segredos preenchida (Passo 1 do guia)

---

## Segredos gerados

- [ ] `TAGGO_SUITE_SECRET` (hex 64) — anotado
- [ ] `TAGGO_ACCOUNTS_COOKIE_SECRET` (base64 32)
- [ ] `SECRET_PROPEZ` (hex 64)
- [ ] `SECRET_PROSYNC` (hex 64)
- [ ] `SECRET_RUBRICA` (hex 64)
- [ ] Par RS256 (`private.pem` + `public.pem`)

---

## SQL (Neon)

- [ ] Site — `sql/SITE-taggo-oidc.sql`
- [ ] Propez — `sql/PROPEZ-suite.sql`
- [ ] ProSync — `sql/PROSYNC-suite.sql`
- [ ] Rubrica — `sql/RUBRICA-suite.sql`

---

## Variáveis de ambiente

- [ ] `site-novo-tgs/.env.local` (template `templates/site-taggo.env.local.example`)
- [ ] `propez_new/.env` (template `templates/propez.env.example`)
- [ ] `Prosync/.env.local` (template `templates/prosync.env.local.example`)
- [ ] `Rubrica-Assinaturas/.env` (template `templates/rubrica.env.example`)
- [ ] `TAGGO_SUITE_SECRET` **igual** nos 4 arquivos
- [ ] `TAGGO_CLIENTS_JSON` com redirect URIs corretos

---

## Serviços no ar

- [ ] Site IdP — http://localhost:3000
- [ ] ProSync — http://localhost:3001
- [ ] Rubrica — http://localhost:3002
- [ ] Propez — http://localhost:3003

---

## IdP

- [ ] `npm run db:seed-identity` no site
- [ ] Login em http://localhost:3000/accounts/login
- [ ] `curl` em `/.well-known/openid-configuration` → 200
- [ ] `curl` em `/api/jwks` → 200

---

## Fase 0 — Lookup

- [ ] Usuário de teste no ProSync ou Rubrica
- [ ] `node scripts/suite-hmac.mjs` gera headers
- [ ] `POST /api/identity/lookup` → `exists: true`

---

## Fase 1 — Service token

- [ ] `POST /api/integrations/credentials/prosync/provision` no Propez
- [ ] Linha em `org_integration_credentials` no Neon Propez

---

## Fase 2 — Credenciais por org

- [ ] `GET /api/integrations/prosync/leads` funciona
- [ ] `npm run check:integrations` → `suite.enabled: true`

---

## Fase 3 — SSO

- [ ] http://localhost:3003/api/sso/start → login → sessão Propez
- [ ] http://localhost:3001/api/sso/start → sessão ProSync
- [ ] http://localhost:3002/api/sso/start → sessão Rubrica
- [ ] `taggo_identity_links` populada após login

---

## Fase 4 — Propostas no ProSync

- [ ] Proposta criada com `prosyncLeadId`
- [ ] Aba **Propostas Propez** no lead mostra item
- [ ] (Opcional) evento manual via `POST /api/partner/proposal-events`

---

## Fase 5 — Migração e UI

- [ ] `npm run migrate:suite-credentials` (se tinha keys globais)
- [ ] `/settings/integrations` mostra aviso (ProSync e Rubrica)
- [ ] `?advanced=1` abre UI legada

---

## Produção (quando for deployar)

- [ ] SQL nos 4 Neon de produção
- [ ] `accounts.taggo.com.br` no Vercel (mesmo projeto do site)
- [ ] Env produção com URLs https
- [ ] SSO testado em produção (1 app)
- [ ] Integração completa validada
- [ ] Keys globais removidas do `.env` Propez

---

**Concluído em:** ___/___/______

**Observações:**

```
(espaço para anotar IDs de teste, emails, UUIDs de lead, etc.)
```
