# SQL para rodar no Neon — por aplicação

Use **um banco Neon (ou um database) por app**. Não misture: o script do ProSync
exige tabelas `organizations` e `users` que só existem no schema do ProSync.

---

## 1) PropEZ — banco do PropEZ

Ficheiro pronto para colar no Neon: [`neon_APENAS_propEZ.sql`](./neon_APENAS_propEZ.sql)  
(ou o original [`sql/001_integrations.sql`](../sql/001_integrations.sql).)

O servidor PropEZ **já executa** esse script no boot. Só precisa colar no Neon
se quiser aplicar manualmente antes do primeiro deploy.

```sql
-- ============================================================================
-- Integrações PropEZ <-> ProSync <-> Rubrica
-- ----------------------------------------------------------------------------
-- Tabelas usadas pelo backend do PropEZ (server.ts) para:
-- 1. Persistir o mapeamento entre proposta PropEZ, lead do ProSync e documento
--    do Rubrica.
-- 2. Auditar webhooks recebidos (ProSync / Rubrica) para rastreabilidade.
--
-- Este arquivo é idempotente. O startup do server.ts executa automaticamente.
-- ============================================================================

-- Mapping 1:1 proposta <-> lead <-> documento Rubrica
CREATE TABLE IF NOT EXISTS integration_mappings (
  propez_proposal_id TEXT PRIMARY KEY,
  prosync_lead_id TEXT,
  rubrica_document_id TEXT,
  rubrica_signing_url TEXT,
  rubrica_signed_pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  -- status: pending | sent | signed | cancelled | failed
  webhook_secret TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_mappings_prosync_lead
  ON integration_mappings(prosync_lead_id)
  WHERE prosync_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_mappings_rubrica_doc
  ON integration_mappings(rubrica_document_id)
  WHERE rubrica_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_mappings_status
  ON integration_mappings(status);

-- Auditoria de webhooks recebidos / eventos emitidos
CREATE TABLE IF NOT EXISTS integration_events (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,             -- rubrica | prosync | internal
  event TEXT NOT NULL,              -- document.signed, lead.updated, ...
  proposal_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_events_source
  ON integration_events(source);
CREATE INDEX IF NOT EXISTS idx_integration_events_proposal
  ON integration_events(proposal_id)
  WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_events_received_at
  ON integration_events(received_at DESC);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION propez_set_updated_at_integration_mappings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propez_set_updated_at_integration_mappings
  ON integration_mappings;
CREATE TRIGGER trg_propez_set_updated_at_integration_mappings
  BEFORE UPDATE ON integration_mappings
  FOR EACH ROW
  EXECUTE FUNCTION propez_set_updated_at_integration_mappings();
```

**Se o Neon reclamar de `EXECUTE FUNCTION`:** em PostgreSQL antigo use
`EXECUTE PROCEDURE propez_set_updated_at_integration_mappings();` no lugar da
linha do trigger (funções trigger são procedures no sentido clássico).

---

## 2) ProSync — banco do ProSync (não o do PropEZ)

**Pré-requisito:** o schema principal do ProSync já criado (`organizations`,
`users`, etc.). Este script só adiciona tabelas de API key e webhooks.

Ficheiro pronto para colar no Neon: [`neon_APENAS_prosync.sql`](./neon_APENAS_prosync.sql)  
(ou no repo ProSync: `scripts/CREATE_API_KEYS_AND_WEBHOOKS.sql`.)

```sql
-- ============================================================================
-- API Keys + Outbound Webhooks (Integrações machine-to-machine)
-- ----------------------------------------------------------------------------
-- Tabelas necessárias para que sistemas externos (ex.: PropEZ) consumam a API
-- do ProSync sem uma sessão de usuário, e para que o ProSync notifique
-- sistemas externos sobre eventos (lead.created, lead.updated, ...).
-- ============================================================================

-- --- API Keys -----------------------------------------------------------------
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

-- --- Outbound Webhooks --------------------------------------------------------
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

-- --- Deliveries (histórico de entregas) --------------------------------------
CREATE TABLE IF NOT EXISTS outbound_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES outbound_webhooks(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- status: pending | success | failed
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

-- --- updated_at trigger para outbound_webhooks -------------------------------
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

**Se o Neon reclamar de `EXECUTE FUNCTION`:** troque por
`EXECUTE PROCEDURE set_updated_at_outbound_webhooks();`.

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
Prisma), para colar no SQL Editor do Neon se precisares **sem** rodar o Prisma
na máquina:

- [`rubrica_schema_from_prisma.sql`](./rubrica_schema_from_prisma.sql) (~780 linhas)

**Atenção:** se depois fores usar `prisma migrate deploy` no mesmo banco, o
Prisma pode tentar reaplicar migrations (conflito). Nesse fluxo híbrido, o
normal é só usar **uma** abordagem: ou só `migrate deploy`, ou só o SQL + dar
baseline manual ao Prisma (avançado).

Para **regenerar** o ficheiro a partir do repo do Rubrica:

```bash
cd Rubrica-Assinaturas
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script -o ../propez_new/docs/rubrica_schema_from_prisma.sql
```

(Ajusta o caminho `-o` se o clone do `propez_new` estiver doutro sítio.)

Scripts auxiliares em `prisma/migrations/*.sql` soltos (ex. `manual_contacts_neon.sql`)
só se a doc do Rubrica pedir.

---

## Resumo

| App     | Neon / DB        | O que rodar |
|---------|------------------|-------------|
| PropEZ  | URL do PropEZ    | SQL deste doc (seção 1) ou deixar o servidor aplicar `sql/001_integrations.sql` |
| ProSync | URL do ProSync   | SQL deste doc (seção 2), **após** schema base do ProSync |
| Rubrica | URL do Rubrica   | `npx prisma migrate deploy` no projeto Rubrica |
