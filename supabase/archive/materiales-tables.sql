-- ============================================
-- TABLA: MATERIALES (archivado)
-- Sistema de inventario de materiales para producción
-- ============================================

-- Tabla principal de materiales
CREATE TABLE IF NOT EXISTS materiales (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),                -- ej: "Acrílico", "MDF", "Vinilo"
  tamano VARCHAR(100),              -- ej: "122x244", "100x200"
  espesor VARCHAR(50),              -- ej: "3mm", "6mm", "12mm"
  unidad VARCHAR(20) DEFAULT 'cm',  -- unidad de medida: cm, mm, m
  costo_unitario NUMERIC(10, 2),   -- costo por unidad
  proveedor VARCHAR(255),           -- nombre del proveedor
  stock NUMERIC(10, 2) DEFAULT 0,  -- stock disponible
  notas TEXT,                       -- observaciones adicionales
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fin de materiales-tables.sql (archivado)
