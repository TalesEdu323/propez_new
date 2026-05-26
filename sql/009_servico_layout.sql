-- Layout visual por serviço (mini-builder)
ALTER TABLE servicos
  ADD COLUMN IF NOT EXISTS elementos JSONB NOT NULL DEFAULT '[]'::jsonb;
