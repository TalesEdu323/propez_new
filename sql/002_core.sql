-- ============================================================================
-- Propez Core (multi-tenant SaaS)
-- ----------------------------------------------------------------------------
-- Organizações, usuários, memberships, auth (email verification, password
-- reset, refresh sessions) e entidades de negócio (clientes, serviços,
-- contratos, modelos, propostas, usage_counters).
--
-- Idempotente. Aplicado automaticamente em runStartupMigrations.
-- Requer Neon/Postgres 13+ (usa pgcrypto para gen_random_uuid()).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função genérica reutilizável para manter updated_at em qualquer tabela.
CREATE OR REPLACE FUNCTION propez_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1) Organizations (tenant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  logo_url TEXT,
  signature_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  billing_cycle TEXT,
  trial_ends_at TIMESTAMPTZ,
  plan_started_at TIMESTAMPTZ,
  plan_renews_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  onboarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_organizations_stripe_customer
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_organizations_stripe_subscription
  ON organizations(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();

-- ============================================================================
-- 2) Users + memberships
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_lower ON users ((LOWER(email)));

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();

CREATE TABLE IF NOT EXISTS memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);

-- ============================================================================
-- 3) Email verifications, password resets, sessions (refresh tokens)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user
  ON email_verifications(user_id)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS current_org_id UUID
  REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id) WHERE revoked_at IS NULL;

-- ============================================================================
-- 4) Business entities (escopadas por organization_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  empresa TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clientes_org ON clientes(organization_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email_lower ON clientes(organization_id, (LOWER(email)))
  WHERE email <> '';

DROP TRIGGER IF EXISTS trg_clientes_updated_at ON clientes;
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();

CREATE TABLE IF NOT EXISTS contratos_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  texto TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contratos_org ON contratos_templates(organization_id);

DROP TRIGGER IF EXISTS trg_contratos_updated_at ON contratos_templates;
CREATE TRIGGER trg_contratos_updated_at
  BEFORE UPDATE ON contratos_templates
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();

CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  valor_cents BIGINT NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL DEFAULT 'unico',
  contrato_id UUID REFERENCES contratos_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_servicos_org ON servicos(organization_id);

DROP TRIGGER IF EXISTS trg_servicos_updated_at ON servicos;
CREATE TRIGGER trg_servicos_updated_at
  BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();

CREATE TABLE IF NOT EXISTS modelos_propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  elementos JSONB NOT NULL DEFAULT '[]'::jsonb,
  servicos UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  contrato_id UUID REFERENCES contratos_templates(id) ON DELETE SET NULL,
  contrato_texto TEXT,
  chave_pix TEXT,
  link_pagamento TEXT,
  tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_modelos_org ON modelos_propostas(organization_id);

DROP TRIGGER IF EXISTS trg_modelos_updated_at ON modelos_propostas;
CREATE TRIGGER trg_modelos_updated_at
  BEFORE UPDATE ON modelos_propostas
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();

CREATE TABLE IF NOT EXISTS propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL DEFAULT '',
  modelo_id UUID REFERENCES modelos_propostas(id) ON DELETE SET NULL,
  servicos UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  valor_cents BIGINT NOT NULL DEFAULT 0,
  desconto_cents BIGINT NOT NULL DEFAULT 0,
  recorrente BOOLEAN NOT NULL DEFAULT FALSE,
  ciclo_recorrencia TEXT,
  duracao_recorrencia INTEGER,
  data_envio TIMESTAMPTZ,
  data_validade TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente',
  elementos JSONB NOT NULL DEFAULT '[]'::jsonb,
  contrato_texto TEXT,
  contrato_id UUID REFERENCES contratos_templates(id) ON DELETE SET NULL,
  chave_pix TEXT,
  link_pagamento TEXT,
  pago BOOLEAN NOT NULL DEFAULT FALSE,
  data_pagamento TIMESTAMPTZ,
  creator_plan TEXT,
  public_token TEXT,
  prosync_lead_id TEXT,
  rubrica_document_id TEXT,
  rubrica_status TEXT,
  rubrica_signing_url TEXT,
  rubrica_signed_pdf_url TEXT,
  rubrica_last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_propostas_org ON propostas(organization_id);
CREATE INDEX IF NOT EXISTS idx_propostas_cliente ON propostas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(organization_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_propostas_public_token
  ON propostas(public_token)
  WHERE public_token IS NOT NULL;

DROP TRIGGER IF EXISTS trg_propostas_updated_at ON propostas;
CREATE TRIGGER trg_propostas_updated_at
  BEFORE UPDATE ON propostas
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();

-- ============================================================================
-- 5) Usage counters (quotas mensais por organização)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_counters (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  propostas INTEGER NOT NULL DEFAULT 0,
  ia_geracoes INTEGER NOT NULL DEFAULT 0,
  rubrica_assinaturas INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, month_key)
);

DROP TRIGGER IF EXISTS trg_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER trg_usage_counters_updated_at
  BEFORE UPDATE ON usage_counters
  FOR EACH ROW EXECUTE FUNCTION propez_set_updated_at();
