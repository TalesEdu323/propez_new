-- =============================================================================
-- RUBRICA — Suíte Taggo (rode no Neon do Rubrica)
-- Fonte: Rubrica-Assinaturas/scripts/create-suite-integration.sql
-- =============================================================================

ALTER TABLE IF EXISTS api_keys
  ADD COLUMN IF NOT EXISTS "createdBySystem" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS api_keys
  ADD COLUMN IF NOT EXISTS "partnerApp" TEXT;

ALTER TABLE IF EXISTS api_keys
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "idx_api_keys_partnerApp"
  ON api_keys ("partnerApp")
  WHERE "partnerApp" IS NOT NULL;

CREATE TABLE IF NOT EXISTS taggo_identity_links (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  identity_sub    TEXT NOT NULL UNIQUE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  identity_email  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taggo_identity_links_user
  ON taggo_identity_links (user_id);

CREATE INDEX IF NOT EXISTS idx_taggo_identity_links_email
  ON taggo_identity_links (LOWER(identity_email));

-- Opcional Fase 5:
-- ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS "deprecatedAt" TIMESTAMPTZ;
-- UPDATE api_keys SET "deprecatedAt" = NOW()
--  WHERE "createdBySystem" = FALSE AND "deprecatedAt" IS NULL AND "revokedAt" IS NULL;
