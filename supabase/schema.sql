-- ============================================
-- SCHEMA SUPABASE PARA SISTEMA KOND
-- ============================================
-- Este archivo contiene las definiciones de tablas, índices,
-- políticas RLS y funciones para el sistema KOND.

-- ============================================
-- TABLA: productos
-- ============================================
CREATE TABLE IF NOT EXISTS public.productos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT,
  tipo TEXT DEFAULT 'Venta',
  medidas TEXT,
  tiempo_unitario TEXT DEFAULT '00:00:00',
  unidades NUMERIC DEFAULT 1,
  unidades_por_placa NUMERIC DEFAULT 0,
  uso_placas NUMERIC DEFAULT 0,
  costo_placa NUMERIC DEFAULT 0,
  costo_material NUMERIC DEFAULT 0,
  margen_material NUMERIC DEFAULT 0,
  precio_unitario NUMERIC DEFAULT 0,
  ensamble TEXT DEFAULT 'Sin ensamble',
  imagen TEXT, -- URL de Supabase Storage o data URL (transición)
  costo NUMERIC DEFAULT 0,
  material TEXT,
  dimensiones TEXT,
  utilidad NUMERIC DEFAULT 0,
  precio1 NUMERIC DEFAULT 0,
  stock_actual NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT true,
  publicado BOOLEAN DEFAULT false,
  hidden_in_productos BOOLEAN DEFAULT false,
  allow_promotions BOOLEAN DEFAULT true,
  promo_badge TEXT,
  static_promo_price NUMERIC,
  static_promo_start DATE,
  static_promo_end DATE,
  tags TEXT[], -- Array de tags
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON public.productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_publicado ON public.productos(publicado);
CREATE INDEX IF NOT EXISTS idx_productos_active ON public.productos(active);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON public.productos(nombre);

-- ============================================
-- TABLA: pedidos (internos/producción)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pedidos (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT REFERENCES public.productos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  cantidad NUMERIC NOT NULL,
  cliente TEXT,
  observaciones TEXT,
  estado TEXT DEFAULT 'pendiente', -- pendiente, en_proceso, completado, entregado
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON public.pedidos(fecha);
CREATE INDEX IF NOT EXISTS idx_pedidos_producto_id ON public.pedidos(producto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON public.pedidos(estado);

-- ============================================
-- TABLA: pedidos_catalogo (pedidos públicos/clientes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pedidos_catalogo (
  id BIGSERIAL PRIMARY KEY,
  -- Datos del cliente
  cliente_nombre TEXT NOT NULL,
  cliente_apellido TEXT,
  cliente_telefono TEXT,
  cliente_email TEXT,
  cliente_direccion TEXT,
  
  -- Productos del pedido (JSONB para flexibilidad)
  productos JSONB NOT NULL, -- Array de {productId, name, price, quantity, measures, subtotal}
  
  -- Método de pago y estado
  metodo_pago TEXT NOT NULL, -- 'transferencia', 'whatsapp', 'retiro'
  estado_pago TEXT DEFAULT 'sin_seña', -- 'sin_seña', 'seña_pagada', 'pagado'
  comprobante_url TEXT, -- URL en Supabase Storage
  comprobante_omitido BOOLEAN DEFAULT false,
  
  -- Fechas y totales
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_solicitud_entrega DATE,
  total NUMERIC NOT NULL,
  
  -- Calendario/producción
  asignado_al_calendario BOOLEAN DEFAULT false,
  fecha_produccion_calendario DATE,
  fecha_entrega_calendario DATE,
  
  -- Estado general
  estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'confirmado', 'produccion', 'listo', 'entregado', 'cancelado'
  
  -- Cupón aplicado
  cupon_codigo TEXT,
  cupon_descuento NUMERIC DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para pedidos_catalogo
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_fecha_creacion ON public.pedidos_catalogo(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_estado ON public.pedidos_catalogo(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_metodo_pago ON public.pedidos_catalogo(metodo_pago);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_cliente_email ON public.pedidos_catalogo(cliente_email);

-- ============================================
-- TABLA: promociones (marketing)
-- ============================================
CREATE TABLE IF NOT EXISTS public.promociones (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'percentage_discount', 'fixed_price', 'buy_x_get_y', 'free_shipping', 'badge_only'
  summary TEXT,
  start_date DATE,
  end_date DATE,
  badge TEXT,
  color TEXT DEFAULT '#3b82f6',
  text_color TEXT DEFAULT 'auto',
  tags TEXT[],
  active BOOLEAN DEFAULT true,
  product_ids BIGINT[], -- Array de IDs de productos
  config JSONB, -- Configuración específica por tipo de promo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para promociones
CREATE INDEX IF NOT EXISTS idx_promociones_active ON public.promociones(active);
CREATE INDEX IF NOT EXISTS idx_promociones_dates ON public.promociones(start_date, end_date);

-- ============================================
-- TABLA: cupones
-- ============================================
CREATE TABLE IF NOT EXISTS public.cupones (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL, -- 'percentage', 'fixed'
  value NUMERIC NOT NULL,
  min_amount NUMERIC,
  min_quantity INTEGER,
  start_date DATE,
  end_date DATE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para cupones
CREATE INDEX IF NOT EXISTS idx_cupones_code ON public.cupones(code);
CREATE INDEX IF NOT EXISTS idx_cupones_active ON public.cupones(active);

-- ============================================
-- TABLA: finanzas (movimientos financieros)
-- ============================================
CREATE TABLE IF NOT EXISTS public.finanzas (
  id BIGSERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL, -- 'ingreso', 'egreso'
  categoria TEXT,
  monto NUMERIC NOT NULL,
  descripcion TEXT,
  pedido_catalogo_id BIGINT REFERENCES public.pedidos_catalogo(id) ON DELETE SET NULL,
  registro_id BIGINT, -- Para agrupar movimientos de cierre de caja
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para finanzas
CREATE INDEX IF NOT EXISTS idx_finanzas_fecha ON public.finanzas(fecha);
CREATE INDEX IF NOT EXISTS idx_finanzas_tipo ON public.finanzas(tipo);
CREATE INDEX IF NOT EXISTS idx_finanzas_registro_id ON public.finanzas(registro_id);

-- ============================================
-- TABLA: registros (cierres de caja)
-- ============================================
CREATE TABLE IF NOT EXISTS public.registros (
  id BIGSERIAL PRIMARY KEY,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  total_ingresos NUMERIC DEFAULT 0,
  total_egresos NUMERIC DEFAULT 0,
  saldo NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON public.productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pedidos_catalogo_updated_at BEFORE UPDATE ON public.pedidos_catalogo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promociones_updated_at BEFORE UPDATE ON public.promociones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cupones_updated_at BEFORE UPDATE ON public.cupones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================
-- IMPORTANTE: Habilitar RLS y definir políticas según necesidades de seguridad

-- Habilitar RLS en todas las tablas
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_catalogo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según roles)
-- Permitir lectura pública de productos publicados
CREATE POLICY "Productos publicados son visibles públicamente" 
  ON public.productos FOR SELECT
  USING (publicado = true);

-- Permitir lectura de cupones activos
CREATE POLICY "Cupones activos son visibles" 
  ON public.cupones FOR SELECT
  USING (active = true);

-- Permitir inserción de pedidos de catálogo (usuarios anónimos)
CREATE POLICY "Cualquiera puede crear pedidos de catálogo" 
  ON public.pedidos_catalogo FOR INSERT
  WITH CHECK (true);

-- TODO: Definir políticas más restrictivas para admins
-- (crear rol 'admin' y dar permisos completos)
