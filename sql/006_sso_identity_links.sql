-- ============================================================================
-- Suíte Taggo — vínculo SSO (identity_sub → user local)
-- ----------------------------------------------------------------------------
-- Quando o usuário entra via `accounts.taggo.com.br` (Fase 3), o IdP devolve
-- um JWT cujo `sub` é o identityId. Esta tabela mapeia esse identityId para
-- o `users.id` local do Propez, evitando criar duplicatas a cada login.
--
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS taggo_identity_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_sub    TEXT NOT NULL UNIQUE,           -- sub do IdP (cuid)
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  identity_email  TEXT,                           -- email no IdP no momento do link
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taggo_identity_links_user
  ON taggo_identity_links (user_id);

CREATE INDEX IF NOT EXISTS idx_taggo_identity_links_email
  ON taggo_identity_links (LOWER(identity_email));
