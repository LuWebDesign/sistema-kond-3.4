-- ============================================
-- MIGRACIÓN: Tablas para el módulo de marketing
-- ============================================

-- Tabla: promociones
CREATE TABLE IF NOT EXISTS promociones (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'porcentaje' | 'monto_fijo' | 'precio_especial' | '2x1' | '3x2'
  valor NUMERIC(10, 2),
  aplica_a VARCHAR(50) NOT NULL, -- 'todos' | 'categoria' | 'producto'
  categoria VARCHAR(255),
  producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
  fecha_inicio DATE,
  fecha_fin DATE,
  activo BOOLEAN DEFAULT true,
  prioridad INTEGER DEFAULT 0,
  
  -- Badges personalizables
  badge_texto VARCHAR(50),
  badge_color VARCHAR(50),
  badge_text_color VARCHAR(50),
  
  -- Configuración de descuento
  descuento_porcentaje NUMERIC(5, 2),
  descuento_monto NUMERIC(10, 2),
  precio_especial NUMERIC(10, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_promociones_activo ON promociones(activo);
CREATE INDEX IF NOT EXISTS idx_promociones_tipo ON promociones(tipo);
CREATE INDEX IF NOT EXISTS idx_promociones_aplica_a ON promociones(aplica_a);
CREATE INDEX IF NOT EXISTS idx_promociones_categoria ON promociones(categoria);
CREATE INDEX IF NOT EXISTS idx_promociones_producto_id ON promociones(producto_id);
CREATE INDEX IF NOT EXISTS idx_promociones_fechas ON promociones(fecha_inicio, fecha_fin);

-- Tabla: cupones
CREATE TABLE IF NOT EXISTS cupones (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'porcentaje' | 'monto_fijo'
  valor NUMERIC(10, 2) NOT NULL,
  monto_minimo NUMERIC(10, 2) DEFAULT 0,
  usos_maximos INTEGER,
  usos_actuales INTEGER DEFAULT 0,
  fecha_inicio DATE,
  fecha_expiracion DATE,
  activo BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para cupones
CREATE INDEX IF NOT EXISTS idx_cupones_codigo ON cupones(codigo);
CREATE INDEX IF NOT EXISTS idx_cupones_activo ON cupones(activo);
CREATE INDEX IF NOT EXISTS idx_cupones_fechas ON cupones(fecha_inicio, fecha_expiracion);

-- Triggers para updated_at
CREATE TRIGGER update_promociones_updated_at
  BEFORE UPDATE ON promociones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cupones_updated_at
  BEFORE UPDATE ON cupones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios sobre las tablas
COMMENT ON TABLE promociones IS 'Promociones aplicables a productos del catálogo';
COMMENT ON TABLE cupones IS 'Cupones de descuento para el checkout';
COMMENT ON COLUMN promociones.tipo IS 'Tipo de promoción: porcentaje, monto_fijo, precio_especial, 2x1, 3x2';
COMMENT ON COLUMN promociones.aplica_a IS 'Alcance de la promoción: todos, categoria, producto';
COMMENT ON COLUMN cupones.tipo IS 'Tipo de descuento: porcentaje o monto_fijo';
