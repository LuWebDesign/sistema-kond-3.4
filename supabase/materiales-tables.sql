-- ============================================
-- TABLA: MATERIALES
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

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_materiales_nombre ON materiales(nombre);
CREATE INDEX IF NOT EXISTS idx_materiales_tipo ON materiales(tipo);
CREATE INDEX IF NOT EXISTS idx_materiales_proveedor ON materiales(proveedor);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_materiales_updated_at ON materiales;
CREATE TRIGGER update_materiales_updated_at BEFORE UPDATE ON materiales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLAS AUXILIARES: PROVEEDORES, TAMAÑOS, ESPESORES
-- ============================================

-- Proveedores (catálogo normalizado)
CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) UNIQUE NOT NULL,
  contacto VARCHAR(255),
  telefono VARCHAR(50),
  email VARCHAR(255),
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tamaños comunes (catálogo normalizado)
CREATE TABLE IF NOT EXISTS tamanos_materiales (
  id SERIAL PRIMARY KEY,
  valor VARCHAR(100) UNIQUE NOT NULL,  -- ej: "122x244", "100x200"
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Espesores comunes (catálogo normalizado)
CREATE TABLE IF NOT EXISTS espesores_materiales (
  id SERIAL PRIMARY KEY,
  valor VARCHAR(50) UNIQUE NOT NULL,  -- ej: "3mm", "6mm", "12mm"
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);
CREATE INDEX IF NOT EXISTS idx_tamanos_valor ON tamanos_materiales(valor);
CREATE INDEX IF NOT EXISTS idx_espesores_valor ON espesores_materiales(valor);

-- Triggers auxiliares
DROP TRIGGER IF EXISTS update_proveedores_updated_at ON proveedores;
CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON proveedores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE materiales IS 'Inventario de materiales para producción';
COMMENT ON COLUMN materiales.nombre IS 'Nombre identificatorio del material';
COMMENT ON COLUMN materiales.tipo IS 'Tipo de material (Acrílico, MDF, Vinilo, etc.)';
COMMENT ON COLUMN materiales.tamano IS 'Dimensiones del material (ej: 122x244)';
COMMENT ON COLUMN materiales.espesor IS 'Espesor del material (ej: 3mm, 6mm)';
COMMENT ON COLUMN materiales.stock IS 'Stock disponible en la unidad especificada';
COMMENT ON COLUMN materiales.costo_unitario IS 'Costo por unidad en ARS';

COMMENT ON TABLE proveedores IS 'Catálogo de proveedores de materiales';
COMMENT ON TABLE tamanos_materiales IS 'Tamaños comunes de materiales normalizados';
COMMENT ON TABLE espesores_materiales IS 'Espesores comunes de materiales normalizados';
