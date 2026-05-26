-- ============================================================================
-- Fluxo configurável de proposta, confirmação dupla de contrato e loja de templates
-- ============================================================================

ALTER TABLE modelos_propostas
  ADD COLUMN IF NOT EXISTS fluxo JSONB NOT NULL DEFAULT '{"steps":["approve","sign","pay"]}'::jsonb;

ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS fluxo JSONB;

UPDATE propostas
SET fluxo = '{"steps":["approve","sign","pay"]}'::jsonb
WHERE fluxo IS NULL;

ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS cliente_contrato_recebido_at TIMESTAMPTZ;

ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS org_contrato_aceito_at TIMESTAMPTZ;

ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS contrato_concluido_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  preview_image_url TEXT,
  elementos JSONB NOT NULL DEFAULT '[]'::jsonb,
  fluxo JSONB NOT NULL DEFAULT '{"steps":["approve","sign","pay"]}'::jsonb,
  servicos_exemplo UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  contrato_texto_exemplo TEXT,
  chave_pix_exemplo TEXT,
  link_pagamento_exemplo TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_published
  ON marketplace_templates(published, sort_order)
  WHERE published = TRUE;

DROP TRIGGER IF EXISTS trg_marketplace_templates_updated_at ON marketplace_templates;
CREATE TRIGGER trg_marketplace_templates_updated_at
  BEFORE UPDATE ON marketplace_templates
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();
