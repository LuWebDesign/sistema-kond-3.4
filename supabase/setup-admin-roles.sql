-- ============================================
-- MEJORA DEL SISTEMA DE ROLES PARA ADMINS
-- Agregar roles más granulares y super admin
-- ============================================

-- Agregar columna de rol mejorada si no existe
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'cliente';

-- Actualizar roles existentes
UPDATE usuarios SET rol = 'cliente' WHERE rol IS NULL OR rol = '';

-- Crear índices para roles
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- Insertar Super Admin (reemplaza con tus datos reales)
-- IMPORTANTE: Ejecuta esto DESPUÉS de que te hayas logueado con Google OAuth al menos una vez
-- El ID debe ser el mismo que aparece en auth.users para tu cuenta de Google

-- PASO 1: Encuentra tu ID de usuario en auth.users
-- SELECT id, email FROM auth.users WHERE email = 'tu-email@gmail.com';

-- PASO 2: Reemplaza 'TU_USER_ID_AQUI' con el ID que encontraste arriba
-- PASO 3: Reemplaza 'tu-email@gmail.com' con tu email real

INSERT INTO usuarios (id, email, username, nombre, apellido, rol, created_at, updated_at)
VALUES (
  'TU_USER_ID_AQUI',     -- Reemplaza con tu ID real de auth.users
  'tu-email@gmail.com',  -- Reemplaza con tu email real
  'superadmin',
  'Super',
  'Admin',
  'super_admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  rol = 'super_admin',
  updated_at = NOW();

-- Verificar que se creó correctamente
SELECT id, email, username, rol FROM usuarios WHERE rol = 'super_admin';