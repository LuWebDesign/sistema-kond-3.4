-- ============================================
-- ⚠️  IMPORTANTE: NO EJECUTES ESTE SCRIPT DIRECTAMENTE
-- ============================================
--
-- Este script es solo de referencia. Usa los scripts específicos:
-- 1. find-your-user-id.sql - Para encontrar tu ID real
-- 2. create-super-admin.sql - Para crear tu super admin
--
-- ============================================

-- Configuración básica de roles (esto SÍ puedes ejecutarlo)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'cliente';

UPDATE usuarios SET rol = 'cliente' WHERE rol IS NULL OR rol = '';

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- Verificar configuración
SELECT rol, COUNT(*) as cantidad
FROM usuarios
GROUP BY rol
ORDER BY rol;