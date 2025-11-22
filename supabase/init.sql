-- ============================================
-- SISTEMA KOND - SCHEMA INICIAL
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

-- Tabla: pedidos_catalogo
CREATE TABLE IF NOT EXISTS pedidos_catalogo (
  id SERIAL PRIMARY KEY,
  cliente_nombre VARCHAR(255) NOT NULL,
  cliente_apellido VARCHAR(255),
  cliente_telefono VARCHAR(50),
  cliente_email VARCHAR(255),
  cliente_direccion TEXT,
  metodo_pago VARCHAR(50), -- 'transferencia' | 'whatsapp' | 'retiro'
  estado_pago VARCHAR(50) DEFAULT 'sin_seña',
  comprobante_url TEXT,
  comprobante_omitido BOOLEAN DEFAULT false,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_solicitud_entrega DATE,
  total NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: pedidos_catalogo_items
CREATE TABLE IF NOT EXISTS pedidos_catalogo_items (
  id SERIAL PRIMARY KEY,
  pedido_catalogo_id INTEGER REFERENCES pedidos_catalogo(id) ON DELETE CASCADE,
  producto_id INTEGER REFERENCES productos(id),
  producto_nombre VARCHAR(255),
  producto_precio NUMERIC(10, 2),
  cantidad INTEGER NOT NULL,
  medidas VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: pedidos_internos
CREATE TABLE IF NOT EXISTS pedidos_internos (
  id SERIAL PRIMARY KEY,
  cliente VARCHAR(255) NOT NULL,
  producto VARCHAR(255),
  cantidad INTEGER,
  fecha_entrega DATE,
  estado VARCHAR(50) DEFAULT 'pendiente',
  precio_unitario NUMERIC(10, 2),
  precio_total NUMERIC(10, 2),
  tiempo_estimado VARCHAR(10),
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'usuario',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_productos_publicado ON productos(publicado);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_fecha ON pedidos_catalogo(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_pedidos_internos_estado ON pedidos_internos(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_productos_updated_at ON productos;
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pedidos_catalogo_updated_at ON pedidos_catalogo;
CREATE TRIGGER update_pedidos_catalogo_updated_at BEFORE UPDATE ON pedidos_catalogo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pedidos_internos_updated_at ON pedidos_internos;
CREATE TRIGGER update_pedidos_internos_updated_at BEFORE UPDATE ON pedidos_internos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (ejecutar después de crear políticas en ambientes controlados)
-- ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedidos_catalogo ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedidos_catalogo_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedidos_internos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Policies: ejemplos (puedes ejecutar estos bloques en SQL Editor)

-- Productos: Lectura pública solo de publicados
-- CREATE POLICY "Lectura pública de productos"
-- ON productos FOR SELECT
-- TO anon, authenticated
-- USING (publicado = true);

-- Productos: Admins pueden ver todos
-- CREATE POLICY "Admins ven todos los productos"
-- ON productos FOR SELECT
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM usuarios
--     WHERE usuarios.id = auth.uid()::integer
--     AND usuarios.rol = 'admin'
--   )
-- );

-- Pedidos catálogo: Cualquiera puede crear (público)
-- CREATE POLICY "Cualquiera puede crear pedidos catálogo"
-- ON pedidos_catalogo FOR INSERT
-- TO anon, authenticated
-- WITH CHECK (true);

-- (Resto de políticas y storage policies tal como indica la guía)

-- Ejemplo de inserción de prueba
-- INSERT INTO productos (nombre, categoria, tipo, medidas, publicado, costo_placa, costo_material)
-- VALUES ('Producto de Prueba','Test','Corporeo','10x10cm', true, 100.00, 50.00);


-- Fin de init.sql
