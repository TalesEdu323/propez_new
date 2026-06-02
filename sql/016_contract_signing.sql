-- ============================================================================
-- Assinatura nativa de contratos (PropEZ + tecnologia Rubrica)
-- ============================================================================

-- Config de posição da assinatura no modelo
ALTER TABLE modelos_propostas
  ADD COLUMN IF NOT EXISTS signature_config JSONB;

-- Renomear colunas rubrica_* → contract_sign_* (compatível com instalações existentes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'rubrica_document_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'contract_sign_document_id'
  ) THEN
    ALTER TABLE propostas RENAME COLUMN rubrica_document_id TO contract_sign_document_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'rubrica_status'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'contract_sign_status'
  ) THEN
    ALTER TABLE propostas RENAME COLUMN rubrica_status TO contract_sign_status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'rubrica_signing_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'contract_signing_url'
  ) THEN
    ALTER TABLE propostas RENAME COLUMN rubrica_signing_url TO contract_signing_url;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'rubrica_signed_pdf_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'contract_signed_pdf_path'
  ) THEN
    ALTER TABLE propostas RENAME COLUMN rubrica_signed_pdf_url TO contract_signed_pdf_path;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'rubrica_last_sync_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'propostas' AND column_name = 'contract_sign_last_sync_at'
  ) THEN
    ALTER TABLE propostas RENAME COLUMN rubrica_last_sync_at TO contract_sign_last_sync_at;
  END IF;
END $$;

-- Colunas novas se migration fresh
ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS contract_sign_document_id TEXT,
  ADD COLUMN IF NOT EXISTS contract_sign_status TEXT,
  ADD COLUMN IF NOT EXISTS contract_signing_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_signed_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS contract_sign_last_sync_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cliente_documento TEXT;

ALTER TABLE usage_counters
  ADD COLUMN IF NOT EXISTS contract_signatures INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usage_counters' AND column_name = 'rubrica_assinaturas'
  ) THEN
    UPDATE usage_counters
    SET contract_signatures = rubrica_assinaturas
    WHERE contract_signatures = 0 AND rubrica_assinaturas > 0;
  END IF;
END $$;

-- Documentos de contrato
CREATE TABLE IF NOT EXISTS contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proposta_id UUID REFERENCES propostas(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT 'contrato.pdf',
  status TEXT NOT NULL DEFAULT 'UPLOADED',
  original_pdf_path TEXT,
  signed_pdf_path TEXT,
  document_hash TEXT,
  validation_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_documents_org ON contract_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_proposta ON contract_documents(proposta_id);

CREATE TABLE IF NOT EXISTS contract_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
  temp_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  signer_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_signers_document ON contract_signers(document_id);

CREATE TABLE IF NOT EXISTS contract_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
  signer_temp_id TEXT NOT NULL,
  signer_name TEXT NOT NULL DEFAULT '',
  signer_email TEXT NOT NULL DEFAULT '',
  field_type TEXT NOT NULL DEFAULT 'SIGNATURE',
  page INT NOT NULL DEFAULT 1,
  x_pct DOUBLE PRECISION NOT NULL DEFAULT 35,
  y_pct DOUBLE PRECISION NOT NULL DEFAULT 82,
  width_pct DOUBLE PRECISION NOT NULL DEFAULT 30,
  height_pct DOUBLE PRECISION NOT NULL DEFAULT 10,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_fields_document ON contract_fields(document_id);

CREATE TABLE IF NOT EXISTS signature_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES contract_signers(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  signer_email TEXT NOT NULL DEFAULT '',
  signer_name TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  signature_data JSONB,
  authentication_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signature_links_token ON signature_links(token);
CREATE INDEX IF NOT EXISTS idx_signature_links_document ON signature_links(document_id);

DROP TRIGGER IF EXISTS trg_contract_documents_updated_at ON contract_documents;
CREATE TRIGGER trg_contract_documents_updated_at
  BEFORE UPDATE ON contract_documents
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();
