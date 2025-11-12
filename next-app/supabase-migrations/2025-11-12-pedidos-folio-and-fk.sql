-- Migración: Folio de pedidos y FK pedidos_movimientos
-- Fecha: 2025-11-12

-- 1) Agregar columna de folio legible en pedidos_catalogo
ALTER TABLE pedidos_catalogo
  ADD COLUMN IF NOT EXISTS nro_pedido TEXT UNIQUE;

-- 1b) Agregar columna de folio legible en pedidos_internos
ALTER TABLE pedidos_internos
  ADD COLUMN IF NOT EXISTS nro_pedido TEXT UNIQUE;

-- 2) Completar folio para pedidos existentes (PC-YYYY-##### basado en ID)
UPDATE pedidos_catalogo
SET nro_pedido = 'PC-' || EXTRACT(YEAR FROM COALESCE(fecha_creacion, NOW()))::text || '-' || LPAD(id::text, 5, '0')
WHERE nro_pedido IS NULL;

-- 2b) Completar folio para pedidos internos existentes (PI-YYYY-##### basado en ID)
UPDATE pedidos_internos
SET nro_pedido = 'PI-' || EXTRACT(YEAR FROM COALESCE(fecha_creacion, NOW()))::text || '-' || LPAD(id::text, 5, '0')
WHERE nro_pedido IS NULL;

-- 3) Agregar relación formal desde movimientos a pedidos
ALTER TABLE movimientos_financieros
  ADD COLUMN IF NOT EXISTS pedido_id INTEGER REFERENCES pedidos_catalogo(id) ON DELETE SET NULL;

-- 4) Index para consultas por pedido
CREATE INDEX IF NOT EXISTS idx_movimientos_financieros_pedido_id ON movimientos_financieros(pedido_id);

-- 5) (Opcional) Completar pedido_id usando idempotency_key si la columna existe.
--    Algunos entornos antiguos no tienen idempotency_key todavía.
ALTER TABLE movimientos_financieros ADD COLUMN IF NOT EXISTS idempotency_key TEXT; -- segura si ya existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='movimientos_financieros' AND column_name='idempotency_key'
  ) THEN
    EXECUTE 'UPDATE movimientos_financieros m
             SET pedido_id = SUBSTRING(m.idempotency_key FROM ''^pedido:([0-9]+):'')::INTEGER
             WHERE m.pedido_id IS NULL AND m.idempotency_key ~ ''^pedido:[0-9]+:'' ';
  END IF;
END $$;

-- 6) Fallback: completar pedido_id desde descripcion si contiene 'PedidoID: <ID>'
UPDATE movimientos_financieros m
SET pedido_id = SUBSTRING(m.descripcion FROM 'PedidoID: ([0-9]+)')::INTEGER
WHERE m.pedido_id IS NULL AND m.descripcion ILIKE '%PedidoID:%';

-- 7) Opcional: validar duplicados de nro_pedido (debe ser único)
-- Si falla por duplicados, revisar manualmente antes de activar UNIQUE de forma estricta.
-- ALTER TABLE pedidos_catalogo ADD CONSTRAINT pedidos_catalogo_nro_pedido_key UNIQUE(nro_pedido);
