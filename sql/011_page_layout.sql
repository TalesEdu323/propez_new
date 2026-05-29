-- Layout da página do builder (margens, modo boxed/full)
ALTER TABLE modelos_propostas
  ADD COLUMN IF NOT EXISTS page_layout JSONB;

ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS page_layout JSONB;
