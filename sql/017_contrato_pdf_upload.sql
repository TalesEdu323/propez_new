-- ============================================================================

-- Contratos: upload PDF + posição da assinatura no template

-- ============================================================================



ALTER TABLE contratos_templates

  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'text',

  ADD COLUMN IF NOT EXISTS pdf_path TEXT,

  ADD COLUMN IF NOT EXISTS pdf_file_name TEXT,

  ADD COLUMN IF NOT EXISTS page_count INT,

  ADD COLUMN IF NOT EXISTS signature_config JSONB;



COMMENT ON COLUMN contratos_templates.source_type IS 'text | pdf';

COMMENT ON COLUMN contratos_templates.signature_config IS

  '{"clientField":{"page":1,"xPct":35,"yPct":82,"widthPct":30,"heightPct":10}}';


