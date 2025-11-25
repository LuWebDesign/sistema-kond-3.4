-- Crear tabla para configuración de métodos de pago
CREATE TABLE IF NOT EXISTS payment_config (
  id BIGSERIAL PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{
    "transferencia": {"enabled": true, "alias": "", "cbu": "", "titular": "", "banco": ""},
    "whatsapp": {"enabled": true, "numero": "", "mensaje": ""},
    "retiro": {"enabled": true, "direccion": "", "horarios": ""}
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas más rápidas
CREATE INDEX IF NOT EXISTS idx_payment_config_updated_at ON payment_config(updated_at DESC);

-- Comentarios para documentación
COMMENT ON TABLE payment_config IS 'Configuración de métodos de pago disponibles para el catálogo público';
COMMENT ON COLUMN payment_config.config IS 'Configuración JSON de transferencia, whatsapp y retiro';
COMMENT ON COLUMN payment_config.created_at IS 'Fecha de creación del registro';
COMMENT ON COLUMN payment_config.updated_at IS 'Fecha de última actualización';

-- RLS (Row Level Security) - Permitir lectura pública pero escritura solo para admin
ALTER TABLE payment_config ENABLE ROW LEVEL SECURITY;
-- Política para lectura pública (necesario para el catálogo público)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.policyname = 'Permitir lectura pública de configuración de pago'
      AND p.tablename = 'payment_config'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Permitir lectura pública de configuración de pago"
        ON payment_config
        FOR SELECT
        USING (true);
    $policy$;
  END IF;
END
$do$;

-- Política para inserción (solo authenticated users - admin)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.policyname = 'Permitir inserción solo a usuarios autenticados'
      AND p.tablename = 'payment_config'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Permitir inserción solo a usuarios autenticados"
        ON payment_config
        FOR INSERT
        WITH CHECK (true);
    $policy$;
  END IF;
END
$do$;

-- Política para actualización (solo authenticated users - admin)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.policyname = 'Permitir actualización solo a usuarios autenticados'
      AND p.tablename = 'payment_config'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Permitir actualización solo a usuarios autenticados"
        ON payment_config
        FOR UPDATE
        USING (true)
        WITH CHECK (true);
    $policy$;
  END IF;
END
$do$;

-- Política para eliminación (solo authenticated users - admin)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.policyname = 'Permitir eliminación solo a usuarios autenticados'
      AND p.tablename = 'payment_config'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Permitir eliminación solo a usuarios autenticados"
        ON payment_config
        FOR DELETE
        USING (true);
    $policy$;
  END IF;
END
$do$;

-- Insertar configuración por defecto si la tabla está vacía
INSERT INTO payment_config (config)
SELECT '{
  "transferencia": {"enabled": true, "alias": "", "cbu": "", "titular": "", "banco": ""},
  "whatsapp": {"enabled": true, "numero": "", "mensaje": ""},
  "retiro": {"enabled": true, "direccion": "", "horarios": ""}
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM payment_config LIMIT 1);
