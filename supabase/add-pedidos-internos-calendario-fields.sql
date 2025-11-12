-- Agregar campos necesarios para el calendario en pedidos_internos
-- Si los campos ya existen, estas líneas fallarán silenciosamente

ALTER TABLE pedidos_internos 
ADD COLUMN IF NOT EXISTS asignado_al_calendario BOOLEAN DEFAULT false;

ALTER TABLE pedidos_internos 
ADD COLUMN IF NOT EXISTS fecha_asignada_calendario DATE;

-- Crear índice para mejorar las consultas del calendario
CREATE INDEX IF NOT EXISTS idx_pedidos_internos_fecha_asignada 
ON pedidos_internos(fecha_asignada_calendario) 
WHERE asignado_al_calendario = true;

-- Comentario sobre el propósito de estos campos
COMMENT ON COLUMN pedidos_internos.asignado_al_calendario IS 
'Indica si el pedido ha sido asignado a una fecha específica en el calendario de producción';

COMMENT ON COLUMN pedidos_internos.fecha_asignada_calendario IS 
'Fecha específica asignada en el calendario para la producción de este pedido';
