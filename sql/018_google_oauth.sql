-- ============================================================================
-- Google OAuth: colunas em users para login social
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_provider'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'email';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_provider_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_provider_id TEXT;
  END IF;
END $$;

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
  ON users (auth_provider_id)
  WHERE auth_provider = 'google';

UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL OR auth_provider = '';
