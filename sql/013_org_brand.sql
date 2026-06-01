-- ============================================================================
-- Whitelabel: cores da marca por organização (plano Business)
-- ============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS primary_color TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT;
