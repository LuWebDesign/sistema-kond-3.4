-- ============================================
-- TABLA: cotizaciones_corte
-- Cotizaciones para servicio de corte láser
-- ============================================

CREATE TABLE IF NOT EXISTS cotizaciones_corte (
  id SERIAL PRIMARY KEY,
  
  -- Información del cliente
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT,
  cliente_email TEXT,
  
  -- Descripción del trabajo
  descripcion TEXT NOT NULL,
  medidas TEXT,
  cantidad INTEGER NOT NULL DEFAULT 1,
  
  -- Costos desglosados
  material_id INTEGER REFERENCES materiales(id),
  material_nombre TEXT,
  costo_material NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  tiempo_maquina TEXT DEFAULT '00:00:00',      -- formato HH:MM:SS
  costo_hora_maquina NUMERIC(12,2) NOT NULL DEFAULT 0,
  costo_tiempo_maquina NUMERIC(12,2) NOT NULL DEFAULT 0,  -- calculado
  
  costo_diseno NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Totales
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  margen NUMERIC(5,2) NOT NULL DEFAULT 0,       -- porcentaje de ganancia
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Estado
  estado TEXT NOT NULL DEFAULT 'pendiente',      -- pendiente | aprobada | rechazada | completada
  notas TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cotizaciones_corte_estado ON cotizaciones_corte(estado);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_corte_created_at ON cotizaciones_corte(created_at DESC);

-- RLS
ALTER TABLE cotizaciones_corte ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden leer todas las cotizaciones
CREATE POLICY "Usuarios autenticados pueden leer cotizaciones"
  ON cotizaciones_corte FOR SELECT
  TO authenticated
  USING (true);

-- Política: usuarios autenticados pueden crear cotizaciones
CREATE POLICY "Usuarios autenticados pueden crear cotizaciones"
  ON cotizaciones_corte FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: usuarios autenticados pueden actualizar cotizaciones
CREATE POLICY "Usuarios autenticados pueden actualizar cotizaciones"
  ON cotizaciones_corte FOR UPDATE
  TO authenticated
  USING (true);

-- Política: usuarios autenticados pueden eliminar cotizaciones
CREATE POLICY "Usuarios autenticados pueden eliminar cotizaciones"
  ON cotizaciones_corte FOR DELETE
  TO authenticated
  USING (true);
