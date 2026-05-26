-- Notificações in-app + e-mail do cliente na proposta

ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS cliente_email TEXT NOT NULL DEFAULT '';

ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_propostas_cliente_email_lower
  ON propostas (organization_id, (LOWER(cliente_email)))
  WHERE cliente_email <> '';

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_org_created
  ON notifications (organization_id, created_at DESC);
