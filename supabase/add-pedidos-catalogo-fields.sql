-- ============================================
-- AGREGAR COLUMNAS FALTANTES A pedidos_catalogo
-- Para soportar gestión completa de pedidos en admin
-- ============================================

-- Agregar campos de gestión del pedido
ALTER TABLE pedidos_catalogo 
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS fecha_confirmada_entrega DATE,
ADD COLUMN IF NOT EXISTS fecha_produccion DATE,
ADD COLUMN IF NOT EXISTS fecha_produccion_calendario DATE,
ADD COLUMN IF NOT EXISTS fecha_entrega DATE,
ADD COLUMN IF NOT EXISTS fecha_entrega_calendario DATE,
ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS asignado_al_calendario BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notas TEXT,
ADD COLUMN IF NOT EXISTS notas_admin TEXT;

-- Crear índices para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_estado ON pedidos_catalogo(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_estado_pago ON pedidos_catalogo(estado_pago);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_fecha_entrega ON pedidos_catalogo(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_cliente_email ON pedidos_catalogo(cliente_email);

-- Comentarios para documentación
COMMENT ON COLUMN pedidos_catalogo.estado IS 'Estado del pedido: pendiente, confirmado, en_preparacion, listo, entregado, cancelado';
COMMENT ON COLUMN pedidos_catalogo.fecha_confirmada_entrega IS 'Fecha de entrega confirmada por el admin';
COMMENT ON COLUMN pedidos_catalogo.fecha_produccion IS 'Fecha programada para producción';
COMMENT ON COLUMN pedidos_catalogo.fecha_produccion_calendario IS 'Fecha de producción asignada en calendario';
COMMENT ON COLUMN pedidos_catalogo.fecha_entrega IS 'Fecha real de entrega';
COMMENT ON COLUMN pedidos_catalogo.fecha_entrega_calendario IS 'Fecha de entrega asignada en calendario';
COMMENT ON COLUMN pedidos_catalogo.monto_recibido IS 'Monto recibido (seña o pago total)';
COMMENT ON COLUMN pedidos_catalogo.asignado_al_calendario IS 'Indica si el pedido fue asignado al calendario de producción';
COMMENT ON COLUMN pedidos_catalogo.notas IS 'Notas del cliente';
COMMENT ON COLUMN pedidos_catalogo.notas_admin IS 'Notas internas del administrador';

-- Mensaje de éxito
DO $$
BEGIN
  RAISE NOTICE '✅ Columnas agregadas exitosamente a pedidos_catalogo';
END $$;
