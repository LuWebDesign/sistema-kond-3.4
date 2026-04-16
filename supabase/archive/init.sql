-- ============================================
-- SISTEMA KOND - SCHEMA INICIAL (archivado)
-- Generated from GUIA-SUPABASE-SETUP.md
-- ============================================

-- Tabla: productos
CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  tipo VARCHAR(100),
  medidas VARCHAR(100),
  tiempo_unitario VARCHAR(10), -- 'HH:MM:SS'
  publicado BOOLEAN DEFAULT false,
  hidden_in_productos BOOLEAN DEFAULT false,
  unidades_por_placa INTEGER,
  uso_placas INTEGER,
  costo_placa NUMERIC(10, 2),
  costo_material NUMERIC(10, 2),
  imagen_url TEXT,
  imagenes_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fin de init.sql (archivado)
