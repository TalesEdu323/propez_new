-- Visitantes anônimos (blog, newsletter modal, analytics) e preferências de UI autenticadas

CREATE TABLE IF NOT EXISTS site_visitors (
  visitor_id TEXT PRIMARY KEY,
  dismissed_newsletter_until TIMESTAMPTZ,
  subscribed_email VARCHAR(255),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_visitors_newsletter_suppress
  ON site_visitors (dismissed_newsletter_until)
  WHERE dismissed_newsletter_until IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_ui_preferences (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pref_key TEXT NOT NULL,
  pref_value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, pref_key)
);
