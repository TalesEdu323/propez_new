-- Logs individuais de erros 5xx (complementa api_error_stats)
CREATE TABLE IF NOT EXISTS api_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_pattern TEXT NOT NULL,
  request_path TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER NOT NULL,
  error_message TEXT,
  error_detail JSONB,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_error_logs_route_created
  ON api_error_logs(route_pattern, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_error_logs_created
  ON api_error_logs(created_at DESC);
