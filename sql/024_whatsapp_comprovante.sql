-- WhatsApp para envio de comprovante de pagamento (modelo + proposta).
ALTER TABLE modelos_propostas ADD COLUMN IF NOT EXISTS whatsapp_comprovante TEXT;
ALTER TABLE propostas ADD COLUMN IF NOT EXISTS whatsapp_comprovante TEXT;
