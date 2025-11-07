-- ============================================
-- SISTEMA KOND - MIGRACIÓN DE USUARIOS A UUID
-- Opción A: Cambiar id de usuarios de SERIAL a UUID
-- ============================================

-- IMPORTANTE: Ejecutar ANTES de las políticas RLS
-- Este script recrea la tabla usuarios con UUID como PK

-- 1. Guardar datos existentes si los hay (opcional)
-- SELECT * FROM usuarios; -- Verificar primero

-- 2. Eliminar tabla usuarios (si está vacía, no hay problema)
DROP TABLE IF EXISTS usuarios CASCADE;

-- 3. Recrear tabla con UUID
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'usuario',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Recrear índice
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- 5. Recrear trigger
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fin de migrate-usuarios-uuid.sql
