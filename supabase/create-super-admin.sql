-- ============================================
-- ACTUALIZAR TU USUARIO EXISTENTE A SUPER ADMIN
-- Usa este script si ya te logueaste con Google y tu usuario existe
-- ============================================

-- PASO 1: Confirma que tu usuario existe
SELECT id, email, username, rol FROM usuarios WHERE email = 'sergionhobj@gmail.com';

-- PASO 2: Actualiza tu usuario existente a Super Admin
UPDATE usuarios
SET
  rol = 'super_admin',
  username = 'superadmin',
  nombre = COALESCE(nombre, 'Super'),
  apellido = COALESCE(apellido, 'Admin'),
  updated_at = NOW()
WHERE email = 'sergionhobj@gmail.com';

-- PASO 3: Verificar que se actualizó correctamente
SELECT id, email, username, rol FROM usuarios WHERE rol = 'super_admin';