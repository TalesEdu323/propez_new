-- ============================================================================
-- Propez Admin (platform-level)
-- ----------------------------------------------------------------------------
-- Adiciona flag de super-admin em users e cria stripe_payments para
-- persistir os eventos de pagamento vindos do webhook do Stripe.
--
-- Idempotente. Aplicado automaticamente em runStartupMigrations.
-- ============================================================================

-- ============================================================================
-- 1) Platform admin flag
-- ============================================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_platform_admin
  ON users(is_platform_admin)
  WHERE is_platform_admin = TRUE;

-- ============================================================================
-- 2) Stripe payments (persistência idempotente do webhook)
-- ----------------------------------------------------------------------------
-- Cada linha representa uma cobrança/tentativa que veio do Stripe. A
-- idempotência é garantida pela coluna stripe_event_id (UNIQUE), usada com
-- INSERT ... ON CONFLICT DO NOTHING no handler do webhook.
-- ============================================================================
CREATE TABLE IF NOT EXISTS stripe_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,
  stripe_session_id TEXT,
  stripe_invoice_id TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  payment_method TEXT NOT NULL DEFAULT 'card',
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'brl',
  status TEXT NOT NULL DEFAULT 'paid',
  plan TEXT,
  billing_cycle TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_payments_org_created
  ON stripe_payments(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_payments_status_created
  ON stripe_payments(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_payments_subscription
  ON stripe_payments(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
