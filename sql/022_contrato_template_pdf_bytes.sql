-- PDF do template de contrato em BYTEA (Vercel/serverless sem disco persistente)
ALTER TABLE contratos_templates
  ADD COLUMN IF NOT EXISTS pdf_data BYTEA;
