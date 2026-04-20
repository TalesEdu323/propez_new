# SQL para rodar no Neon — por aplicação

Use **um banco Neon (ou um database) por app**. Não misture: o script do ProSync
exige tabelas `organizations` e `users` que só existem no schema do ProSync, e
o Propez tem o seu próprio conjunto de tabelas multi-tenant.

---

## 1) Propez — banco do Propez

Ficheiro pronto para colar no Neon:
[`neon_APENAS_propez.sql`](./neon_APENAS_propez.sql) (concatena todos os `sql/*.sql`).

### O que o script cria

O Propez agora é **100% database-backed** (deixou de usar `localStorage`). Ao
rodar o script no Neon (ou deixar o servidor aplicar no boot) você ganha:

| Área | Tabelas |
|------|---------|
| **Tenancy** | `organizations`, `users`, `memberships` |
| **Auth** | `email_verifications`, `password_resets`, `sessions` |
| **CRM** | `clientes` |
| **Serviços** | `servicos`, `contratos_templates` |
| **Modelos & Propostas** | `modelos_propostas`, `propostas` |
| **Quotas** | `usage_counters` |
| **Integrações** | `integration_mappings`, `integration_events` (com `organization_id`) |

Todas as tabelas usam UUID como chave primária (`gen_random_uuid()` via
`pgcrypto`) e têm triggers de `updated_at` automáticos. Indexes e unique
constraints vão todos no script.

### Como aplicar

**Opção A — deixar o servidor aplicar (recomendado):**

```bash
# com DATABASE_URL apontando para o Neon do Propez:
npm run dev
# Logs esperados:
#   [migrations] applied 001_integrations.sql
#   [migrations] applied 002_core.sql
#   [migrations] applied 003_integrations_org.sql
```

**Opção B — aplicar manualmente antes do primeiro deploy:**

1. Abra o SQL Editor do Neon no database do Propez.
2. Cole o conteúdo de [`neon_APENAS_propez.sql`](./neon_APENAS_propez.sql).
3. Execute.

Se o Neon reclamar de `EXECUTE FUNCTION` (Postgres antigo), troque por
`EXECUTE PROCEDURE nome_da_funcao();`.

### Primeiro usuário

Após aplicar o schema, o primeiro usuário é criado pela tela `/register` da UI
(fluxo padrão: cadastro → email de verificação → login). Não há nenhum seed
de admin via SQL — isso é intencional para não deixar credenciais previsíveis.

Ao criar o primeiro usuário:

1. Uma `organization` é criada com o nome da empresa informada.
2. Ele vira `owner` dessa org (`memberships.role = 'owner'`).
3. `seedOrgDefaults` insere 1 contrato template, 1 serviço e 2 modelos iniciais.

### Variáveis de ambiente relacionadas

Ver [`.env.example`](../.env.example) — precisa de:

- `DATABASE_URL` — Neon do Propez
- `JWT_SECRET` — segredo do token de acesso (obrigatório em prod)
- `RESEND_API_KEY` + `MAIL_FROM` — email de verificação/reset
- `APP_URL` — base para o link de reset de senha e `/p/{token}` públicos

---

## 2) ProSync — banco do ProSync (não o do Propez)

**Pré-requisito:** o schema principal do ProSync já criado (`organizations`,
`users`, etc.). Este script só adiciona tabelas de API key e webhooks.

Ficheiro pronto para colar no Neon:
[`neon_APENAS_prosync.sql`](./neon_APENAS_prosync.sql)
(ou no repo ProSync: `scripts/CREATE_API_KEYS_AND_WEBHOOKS.sql`.)

```sql
-- ============================================================================
-- API Keys + Outbound Webhooks (Integrações machine-to-machine)
-- ----------------------------------------------------------------------------
-- Tabelas necessárias para que sistemas externos (ex.: Propez) consumam a API
-- do ProSync sem uma sessão de usuário, e para que o ProSync notifique
-- sistemas externos sobre eventos (lead.created, lead.updated, ...).
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(120) NOT NULL,
  key_prefix VARCHAR(32) NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['crm:read','crm:write']::TEXT[],
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(organization_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS outbound_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbound_webhooks_org ON outbound_webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_outbound_webhooks_active ON outbound_webhooks(organization_id) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS outbound_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES outbound_webhooks(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER,
  response_body TEXT,
  error TEXT,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_webhook ON outbound_webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON outbound_webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created ON outbound_webhook_deliveries(created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at_outbound_webhooks()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_at_outbound_webhooks ON outbound_webhooks;
CREATE TRIGGER trg_set_updated_at_outbound_webhooks
  BEFORE UPDATE ON outbound_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_outbound_webhooks();
```

---

## 3) Rubrica — banco do Rubrica

O Rubrica usa **Prisma**. A forma **oficial** (recomendada) é:

```bash
cd Rubrica-Assinaturas
npx prisma migrate deploy
```

(com `DATABASE_URL` do Neon do Rubrica). Isso aplica `prisma/migrations/*` na
ordem e preenche `_prisma_migrations`.

### SQL único gerado a partir do `schema.prisma` (Neon vazio, sem CLI)

Foi gerado um script equivalente ao schema atual (banco **vazio** → estado do
Prisma), para colar no SQL Editor do Neon se precisar **sem** rodar o Prisma
na máquina:

- [`rubrica_schema_from_prisma.sql`](./rubrica_schema_from_prisma.sql) (~780 linhas)

Para **regenerar** a partir do repo do Rubrica:

```bash
cd Rubrica-Assinaturas
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma \
  --script -o ../propez_new/docs/rubrica_schema_from_prisma.sql
```

---

## Resumo

| App     | Neon / DB        | O que rodar |
|---------|------------------|-------------|
| Propez  | URL do Propez    | [`neon_APENAS_propez.sql`](./neon_APENAS_propez.sql) — ou deixar o servidor aplicar `sql/*.sql` no boot |
| ProSync | URL do ProSync   | [`neon_APENAS_prosync.sql`](./neon_APENAS_prosync.sql), **após** o schema base do ProSync |
| Rubrica | URL do Rubrica   | `npx prisma migrate deploy` no projeto Rubrica (ou [`rubrica_schema_from_prisma.sql`](./rubrica_schema_from_prisma.sql) num banco vazio) |
