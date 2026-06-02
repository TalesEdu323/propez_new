-- ============================================================================
-- Google Calendar por usuário (leitura)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_sub VARCHAR(255),
  google_email VARCHAR(255) NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  scopes TEXT,
  source VARCHAR(20) DEFAULT 'google_login',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_google_calendar_user_id
  ON user_google_calendar_connections(user_id)
  WHERE revoked_at IS NULL;

DROP TRIGGER IF EXISTS trg_user_google_calendar_updated_at ON user_google_calendar_connections;
CREATE TRIGGER trg_user_google_calendar_updated_at
  BEFORE UPDATE ON user_google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();
