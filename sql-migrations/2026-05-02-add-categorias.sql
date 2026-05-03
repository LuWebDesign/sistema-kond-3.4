-- ============================================================
-- MIGRACIÓN: Tabla `categorias` y FK en `productos`
-- Fecha: 2026-05-02
-- ============================================================
-- NOTA: categoria_id puede apuntar a una categoría raíz (parent_id IS NULL)
-- o a una subcategoría (parent_id NOT NULL). La profundidad máxima de la
-- ESTRUCTURA de categorias es 1 nivel; pero un producto puede asignarse
-- a cualquier nivel de la jerarquía.
-- ============================================================

-- ============================================================
-- 1. TABLA: categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categorias (
  id         BIGSERIAL PRIMARY KEY,
  nombre     TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  -- parent_id: NULL = categoría raíz, NOT NULL = subcategoría (máx 1 nivel)
  parent_id  BIGINT REFERENCES public.categorias(id) ON DELETE RESTRICT,
  activa     BOOLEAN NOT NULL DEFAULT true,
  orden      INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.categorias.parent_id IS
  'NULL = categoría raíz. La profundidad máxima es 1 nivel: un nodo con parent_id <> NULL no puede ser padre de otro nodo. Este constraint se aplica en la capa de API, no por CHECK de DB.';

-- ============================================================
-- 2. ÍNDICES: categorias
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_categorias_slug      ON public.categorias(slug);
CREATE INDEX IF NOT EXISTS idx_categorias_parent_id ON public.categorias(parent_id);

-- ============================================================
-- 3. TRIGGER updated_at: categorias
-- ============================================================
-- Reutiliza la función update_updated_at_column() ya definida en schema.sql
CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON public.categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. RLS: categorias
-- ============================================================
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- SELECT público (catálogo / SEO)
CREATE POLICY "Categorias activas son visibles públicamente"
  ON public.categorias FOR SELECT
  USING (activa = true);

-- INSERT / UPDATE / DELETE: solo service role (supabaseAdmin())
-- El service role bypasea RLS por definición. Las API routes admin usan
-- supabaseAdmin() con SUPABASE_SERVICE_ROLE_KEY, por lo que no necesitan
-- políticas explícitas de escritura. Ver design.md → RLS categorias.

-- ============================================================
-- 5. FK en productos: categoria_id
-- ============================================================
-- NOTA: categoria_id puede referenciar una categoría padre O una subcategoría.
-- La columna `categoria` (TEXT) se mantiene intacta como fallback durante la
-- transición. Ver design.md → Migración / Rollout.
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS categoria_id BIGINT
    REFERENCES public.categorias(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.productos.categoria_id IS
  'FK a categorias.id. Puede apuntar a una categoría raíz (parent_id IS NULL) o a una subcategoría (parent_id NOT NULL). La columna categoria (TEXT) se mantiene como fallback hasta confirmar migración completa.';

-- ============================================================
-- 6. ÍNDICE: productos.categoria_id
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON public.productos(categoria_id);

-- ============================================================
-- ROLLBACK (comentado — ejecutar manualmente si es necesario)
-- ============================================================
-- DROP INDEX  IF EXISTS idx_productos_categoria_id;
-- ALTER TABLE public.productos DROP COLUMN IF EXISTS categoria_id;
-- DROP TRIGGER IF EXISTS update_categorias_updated_at ON public.categorias;
-- DROP TABLE  IF EXISTS public.categorias;
