-- Crear tabla para estilos personalizados del catálogo
CREATE TABLE IF NOT EXISTS catalog_styles (
  id SERIAL PRIMARY KEY,
  styles JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permitir lectura pública (los estilos se aplican al catálogo público)
ALTER TABLE catalog_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_styles_read_all" ON catalog_styles
  FOR SELECT USING (true);

CREATE POLICY "catalog_styles_write_authenticated" ON catalog_styles
  FOR ALL USING (true) WITH CHECK (true);
