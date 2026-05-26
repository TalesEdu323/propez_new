-- =============================================================================
-- PROSYNC — Suíte Taggo (rode no Neon do ProSync)
-- Fonte: Prosync/scripts/CREATE_SUITE_INTEGRATION.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS taggo_suite_lookups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_app      TEXT NOT NULL,
  target_app      TEXT NOT NULL,
  email_hash      TEXT NOT NULL,
  exists_in_app   BOOLEAN NOT NULL,
  password_matches BOOLEAN,
  at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taggo_suite_lookups_at
  ON taggo_suite_lookups (at DESC);

CREATE INDEX IF NOT EXISTS idx_taggo_suite_lookups_email_hash
  ON taggo_suite_lookups (email_hash);

ALTER TABLE IF EXISTS api_keys
  ADD COLUMN IF NOT EXISTS created_by_system BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS api_keys
  ADD COLUMN IF NOT EXISTS partner_app TEXT;

CREATE INDEX IF NOT EXISTS idx_api_keys_partner_app
  ON api_keys (partner_app)
  WHERE partner_app IS NOT NULL;

CREATE TABLE IF NOT EXISTS lead_external_proposals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source          TEXT NOT NULL,
  external_id     TEXT NOT NULL,
  external_url    TEXT,
  title           TEXT,
  status          TEXT NOT NULL,
  value_cents     BIGINT,
  currency        TEXT DEFAULT 'BRL',
  metadata        JSONB DEFAULT '{}'::jsonb,
  external_created_at TIMESTAMPTZ,
  external_updated_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_external_proposals_lead
  ON lead_external_proposals (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_external_proposals_org
  ON lead_external_proposals (organization_id);

CREATE INDEX IF NOT EXISTS idx_lead_external_proposals_status
  ON lead_external_proposals (status);

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

ALTER TABLE IF EXISTS api_keys
  ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ;

UPDATE api_keys
   SET deprecated_at = NOW()
 WHERE created_by_system = FALSE
   AND deprecated_at IS NULL
   AND (revoked_at IS NULL);
