-- ============================================
-- MIGRACIÓN: Tablas para el módulo de marketing (archivado)
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
  prioridad INTEGER DEFAULT 0
);

-- Fin de marketing-tables.sql (archivado)
