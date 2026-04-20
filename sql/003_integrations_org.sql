-- ============================================================================
-- Integrations <-> Organizations
-- ----------------------------------------------------------------------------
-- Adiciona organization_id a integration_mappings e integration_events para
-- escopar as integrações ProSync/Rubrica por tenant. Idempotente.
-- ============================================================================

ALTER TABLE integration_mappings
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_integration_mappings_org
  ON integration_mappings(organization_id)
  WHERE organization_id IS NOT NULL;

ALTER TABLE integration_events
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_integration_events_org
  ON integration_events(organization_id)
  WHERE organization_id IS NOT NULL;
