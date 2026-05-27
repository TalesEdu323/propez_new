-- URL base opcional por organização (ProSync / Rubrica próprios de cada cliente)
ALTER TABLE IF EXISTS org_integration_credentials
  ADD COLUMN IF NOT EXISTS api_base_url TEXT;
