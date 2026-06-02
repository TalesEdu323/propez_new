-- PDFs de contrato em BYTEA para ambientes serverless (Vercel) sem disco persistente
ALTER TABLE contract_documents
  ADD COLUMN IF NOT EXISTS original_pdf_data BYTEA,
  ADD COLUMN IF NOT EXISTS signed_pdf_data BYTEA;
