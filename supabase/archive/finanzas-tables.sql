-- ============================================
-- MIGRACIÓN: Tablas para el módulo de finanzas (archivado)
-- ============================================

-- Tabla: categorias_financieras
CREATE TABLE IF NOT EXISTS categorias_financieras (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fin de finanzas-tables.sql (archivado)
