-- ============================================================================
-- Whitelabel admin + fila de solicitações (enterprise / identidade visual)
-- Idempotente. Requer 002_core.sql e 013_org_brand.sql.
-- ============================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS whitelabel_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_platform_settings_updated_at ON platform_settings;
CREATE TRIGGER trg_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_org ON service_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status, created_at DESC);

INSERT INTO platform_settings (key, value)
VALUES
  ('request.whitelabel', '{"mode":"native","externalUrl":null}'::jsonb),
  ('request.enterprise', '{"mode":"external","externalUrl":null}'::jsonb)
ON CONFLICT (key) DO NOTHING;
