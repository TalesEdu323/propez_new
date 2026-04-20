-- Neon: base de dados do PROP EZ (DATABASE_URL do PropEZ)
-- Idempotente.

CREATE TABLE IF NOT EXISTS integration_mappings (
  propez_proposal_id TEXT PRIMARY KEY,
  prosync_lead_id TEXT,
  rubrica_document_id TEXT,
  rubrica_signing_url TEXT,
  rubrica_signed_pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  webhook_secret TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_mappings_prosync_lead
  ON integration_mappings(prosync_lead_id)
  WHERE prosync_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_mappings_rubrica_doc
  ON integration_mappings(rubrica_document_id)
  WHERE rubrica_document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_integration_mappings_status
  ON integration_mappings(status);

CREATE TABLE IF NOT EXISTS integration_events (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  event TEXT NOT NULL,
  proposal_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_valid BOOLEAN,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_events_source
  ON integration_events(source);
CREATE INDEX IF NOT EXISTS idx_integration_events_proposal
  ON integration_events(proposal_id)
  WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_events_received_at
  ON integration_events(received_at DESC);

CREATE OR REPLACE FUNCTION propez_set_updated_at_integration_mappings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_propez_set_updated_at_integration_mappings
  ON integration_mappings;
CREATE TRIGGER trg_propez_set_updated_at_integration_mappings
  BEFORE UPDATE ON integration_mappings
  FOR EACH ROW
  EXECUTE FUNCTION propez_set_updated_at_integration_mappings();
