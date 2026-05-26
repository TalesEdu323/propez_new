-- =============================================================================
-- PROPEZ — Suíte Taggo (rode no Neon do Propez)
-- Ordem: 005 → 006
-- Idempotente.
-- =============================================================================

-- ---------- 005_suite_credentials.sql ----------
CREATE TABLE IF NOT EXISTS org_integration_credentials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  encrypted_api_key   TEXT NOT NULL,
  key_prefix          TEXT,
  external_user_id    TEXT,
  external_org_id     TEXT,
  scopes              TEXT[] NOT NULL DEFAULT '{}',
  source              TEXT NOT NULL DEFAULT 'suite_token',
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
  target_app      TEXT NOT NULL,
  email_hash      TEXT NOT NULL,
  exists_in_app   BOOLEAN,
  password_matches BOOLEAN,
  http_status     INT,
  at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taggo_suite_lookups_at
  ON taggo_suite_lookups (at DESC);

CREATE INDEX IF NOT EXISTS idx_taggo_suite_lookups_target
  ON taggo_suite_lookups (target_app, at DESC);

-- ---------- 006_sso_identity_links.sql ----------
CREATE TABLE IF NOT EXISTS taggo_identity_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_sub    TEXT NOT NULL UNIQUE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  identity_email  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taggo_identity_links_user
  ON taggo_identity_links (user_id);

CREATE INDEX IF NOT EXISTS idx_taggo_identity_links_email
  ON taggo_identity_links (LOWER(identity_email));
