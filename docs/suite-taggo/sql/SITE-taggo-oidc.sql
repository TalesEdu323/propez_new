-- =============================================================================
-- SITE TAGGO (IdP) — rode no Neon do site-novo-tgs
-- Fonte: site-novo-tgs/scripts/sql/taggo-oidc.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS taggo_identity_users (
  id              TEXT PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   TEXT,
  full_name       VARCHAR(255),
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS taggo_identity_app_links (
  id                TEXT PRIMARY KEY,
  identity_id       TEXT NOT NULL REFERENCES taggo_identity_users(id) ON DELETE CASCADE,
  app               VARCHAR(50) NOT NULL,
  external_user_id  TEXT NOT NULL,
  external_org_id   TEXT,
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (app, external_user_id)
);

CREATE INDEX IF NOT EXISTS idx_taggo_identity_app_links_identity
  ON taggo_identity_app_links (identity_id);

CREATE TABLE IF NOT EXISTS taggo_authorization_codes (
  code                    TEXT PRIMARY KEY,
  client_id               TEXT NOT NULL,
  identity_id             TEXT NOT NULL REFERENCES taggo_identity_users(id) ON DELETE CASCADE,
  redirect_uri            TEXT NOT NULL,
  scope                   TEXT NOT NULL,
  nonce                   TEXT,
  code_challenge          TEXT,
  code_challenge_method   TEXT,
  expires_at              TIMESTAMPTZ NOT NULL,
  consumed_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taggo_authorization_codes_expires
  ON taggo_authorization_codes (expires_at);
