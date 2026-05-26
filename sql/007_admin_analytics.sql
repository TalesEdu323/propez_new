-- ============================================================================
-- Propez Admin Analytics (SaaS metrics foundation)
-- Idempotente. Aplicado em runStartupMigrations.
-- ============================================================================

-- UTM / origem (captura futura no signup)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS signup_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS cs_notes TEXT;

-- Eventos de assinatura (MRR breakdown, churn)
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_plan TEXT,
  to_plan TEXT,
  from_cycle TEXT,
  to_cycle TEXT,
  mrr_delta_cents BIGINT NOT NULL DEFAULT 0,
  stripe_event_id TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_org_created
  ON subscription_events(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_events_type_created
  ON subscription_events(event_type, created_at DESC);

-- Snapshot diário de MRR
CREATE TABLE IF NOT EXISTS mrr_snapshots (
  snapshot_date DATE PRIMARY KEY,
  total_mrr_cents BIGINT NOT NULL DEFAULT 0,
  mrr_by_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  active_orgs INTEGER NOT NULL DEFAULT 0,
  new_mrr_cents BIGINT NOT NULL DEFAULT 0,
  expansion_cents BIGINT NOT NULL DEFAULT 0,
  contraction_cents BIGINT NOT NULL DEFAULT 0,
  churn_cents BIGINT NOT NULL DEFAULT 0,
  reactivation_cents BIGINT NOT NULL DEFAULT 0,
  is_estimated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eventos de produto (DAU, adoption, ativação)
CREATE TABLE IF NOT EXISTS product_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_events_name_created
  ON product_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_org_created
  ON product_events(organization_id, created_at DESC);

-- Alertas para platform admin
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  dedupe_key TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_alerts_dedupe_open
  ON admin_alerts(dedupe_key)
  WHERE resolved_at IS NULL AND dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_alerts_open
  ON admin_alerts(created_at DESC)
  WHERE resolved_at IS NULL;

-- Health checks (uptime)
CREATE TABLE IF NOT EXISTS health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ok BOOLEAN NOT NULL,
  latency_ms INTEGER,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_checked
  ON health_checks(checked_at DESC);

-- Erros de API (rollup diário)
CREATE TABLE IF NOT EXISTS api_error_stats (
  stat_date DATE NOT NULL,
  route_pattern TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (stat_date, route_pattern, status_code)
);
