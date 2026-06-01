-- Nicho/segmento da organização (usado em imagens IA e layouts)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS segment TEXT CHECK (segment IN (
    'consultoria', 'agencia', 'recorrente', 'saas', 'evento', 'generico'
  ));
