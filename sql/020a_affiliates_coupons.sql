-- ============================================================================
-- Propez — Afiliados + Cupons promocionais
-- Idempotente. Aplicado em runStartupMigrations.
-- ============================================================================

-- Afiliados / parceiros
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  default_coupon_id UUID,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliates_status_check CHECK (status IN ('active', 'paused', 'archived')),
  CONSTRAINT affiliates_code_format CHECK (code ~ '^[A-Za-z0-9_-]{2,40}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_affiliates_code_lower
  ON affiliates (LOWER(code));

CREATE INDEX IF NOT EXISTS idx_affiliates_status
  ON affiliates (status);

-- Cupons promocionais (sync com Stripe)
CREATE TABLE IF NOT EXISTS promo_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  duration TEXT NOT NULL DEFAULT 'once',
  duration_in_months INTEGER,
  max_redemptions INTEGER,
  redemption_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  applies_to_plans TEXT[],
  stripe_coupon_id TEXT,
  stripe_promotion_code_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT promo_coupons_discount_type_check CHECK (discount_type IN ('percent', 'free_months', 'trial_days')),
  CONSTRAINT promo_coupons_duration_check CHECK (duration IN ('once', 'repeating', 'forever')),
  CONSTRAINT promo_coupons_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT promo_coupons_code_format CHECK (code ~ '^[A-Za-z0-9_-]{2,40}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_promo_coupons_code_lower
  ON promo_coupons (LOWER(code));

CREATE INDEX IF NOT EXISTS idx_promo_coupons_status
  ON promo_coupons (status);

-- FK afiliado → cupom padrão (após promo_coupons existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'affiliates_default_coupon_id_fkey'
  ) THEN
    ALTER TABLE affiliates
      ADD CONSTRAINT affiliates_default_coupon_id_fkey
      FOREIGN KEY (default_coupon_id) REFERENCES promo_coupons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Eventos de tracking (clique, view, signup, subscription)
CREATE TABLE IF NOT EXISTS affiliate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  session_id TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_events_type_check CHECK (event_type IN ('click', 'view', 'signup', 'subscription'))
);

CREATE INDEX IF NOT EXISTS idx_affiliate_events_affiliate_created
  ON affiliate_events (affiliate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_events_type_created
  ON affiliate_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_affiliate_events_org
  ON affiliate_events (organization_id)
  WHERE organization_id IS NOT NULL;

-- Comissões por fatura
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT NOT NULL,
  mrr_cents BIGINT NOT NULL DEFAULT 0,
  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  commission_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  paid_notes TEXT NOT NULL DEFAULT '',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT affiliate_commissions_status_check CHECK (status IN ('pending', 'paid', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_affiliate_commissions_invoice
  ON affiliate_commissions (stripe_invoice_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_status
  ON affiliate_commissions (affiliate_id, status);

-- Atribuição de afiliado na organização
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS affiliate_attributed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referred_coupon_code TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_affiliate_id
  ON organizations (affiliate_id)
  WHERE affiliate_id IS NOT NULL;
