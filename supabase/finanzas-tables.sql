-- ============================================
-- MIGRACIÓN: Tablas para el módulo de finanzas
-- ============================================

-- Tabla: categorias_financieras
CREATE TABLE IF NOT EXISTS categorias_financieras (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar categorías por defecto
INSERT INTO categorias_financieras (nombre) 
VALUES ('Ventas'), ('Materia Prima'), ('Servicios')
ON CONFLICT (nombre) DO NOTHING;

-- Tabla: movimientos_financieros
CREATE TABLE IF NOT EXISTS movimientos_financieros (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL, -- 'ingreso' | 'egreso'
  monto NUMERIC(12, 2) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME,
  categoria VARCHAR(255),
  descripcion TEXT,
  metodo_pago VARCHAR(50), -- 'efectivo' | 'transferencia' | 'tarjeta'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar las consultas
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_financieros(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_financieros(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_categoria ON movimientos_financieros(categoria);

-- Tabla: registros_cierre
CREATE TABLE IF NOT EXISTS registros_cierre (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL UNIQUE,
  efectivo NUMERIC(12, 2) DEFAULT 0,
  transferencia NUMERIC(12, 2) DEFAULT 0,
  tarjeta NUMERIC(12, 2) DEFAULT 0,
  total NUMERIC(12, 2) DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda por fecha
CREATE INDEX IF NOT EXISTS idx_registros_fecha ON registros_cierre(fecha DESC);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categorias_financieras_updated_at
  BEFORE UPDATE ON categorias_financieras
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_movimientos_financieros_updated_at
  BEFORE UPDATE ON movimientos_financieros
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registros_cierre_updated_at
  BEFORE UPDATE ON registros_cierre
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios sobre las tablas
COMMENT ON TABLE categorias_financieras IS 'Categorías personalizables para clasificar movimientos financieros';
COMMENT ON TABLE movimientos_financieros IS 'Registro de todos los ingresos y egresos del negocio';
COMMENT ON TABLE registros_cierre IS 'Cierres de caja diarios con totales por método de pago';
