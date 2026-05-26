-- ============================================================================
-- Suíte Taggo — credenciais por organização e auditoria de lookups
-- ----------------------------------------------------------------------------
-- Tabelas para a integração nativa entre Propez, ProSync e Rubrica:
-- - org_integration_credentials: chave cifrada por organização x provider
--   (ProSync/Rubrica). Substitui as variáveis globais PROSYNC_API_KEY /
--   RUBRICA_API_KEY em produção multi-tenant.
-- - taggo_suite_lookups: auditoria de chamadas /api/identity/lookup
--   originadas no Propez (espelho do que já gravamos do lado do alvo).
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_integration_credentials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,                -- 'prosync' | 'rubrica'
  encrypted_api_key   TEXT NOT NULL,                -- AES-256-GCM, base64(iv|tag|ciphertext)
  key_prefix          TEXT,                         -- ex: ps_live_xxxxxx (apenas display)
  external_user_id    TEXT,                         -- userId no app alvo
  external_org_id     TEXT,                         -- organizationId no app alvo (null no Rubrica)
  scopes              TEXT[] NOT NULL DEFAULT '{}',
  source              TEXT NOT NULL DEFAULT 'suite_token',  -- suite_token | env_fallback | manual
  last_verified_at    TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_org_integration_credentials_provider
  ON org_integration_credentials (provider);

CREATE INDEX IF NOT EXISTS idx_org_integration_credentials_external_org
  ON org_integration_credentials (provider, external_org_id)
  WHERE external_org_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS taggo_suite_lookups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_app      TEXT NOT NULL DEFAULT 'propez',
  target_app      TEXT NOT NULL,         -- 'prosync' | 'rubrica'
  email_hash      TEXT NOT NULL,         -- sha256(email)
  exists_in_app   BOOLEAN,
  password_matches BOOLEAN,
  http_status     INT,
  at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taggo_suite_lookups_at
  ON taggo_suite_lookups (at DESC);

CREATE INDEX IF NOT EXISTS idx_taggo_suite_lookups_target
  ON taggo_suite_lookups (target_app, at DESC);
