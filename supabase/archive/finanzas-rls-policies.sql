-- ============================================
-- POLÍTICAS RLS para módulo de finanzas (archivado)
-- ============================================

-- Habilitar RLS en las tablas
ALTER TABLE categorias_financieras ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_financieros ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_cierre ENABLE ROW LEVEL SECURITY;

-- Fin de finanzas-rls-policies.sql (archivado)
