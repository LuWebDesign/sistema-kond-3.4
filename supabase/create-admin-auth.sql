-- ============================================
-- CREAR SUPER ADMIN CON EMAIL Y CONTRASEÑA
-- Sistema simplificado: el admin se crea directamente en Supabase Dashboard
-- ============================================

-- INSTRUCCIONES:
-- 1. Ve a tu proyecto Supabase Dashboard
-- 2. Navega a Authentication > Users
-- 3. Haz clic en "Add user" > "Create new user"
-- 4. Ingresa:
--    - Email: admin@kond.local
--    - Password: Una contraseña segura
--    - Confirma el email automáticamente (marca la opción)
-- 5. Copia el ID del usuario creado
-- 6. Ejecuta las siguientes consultas SQL:

-- PASO 1: Actualizar el usuario en la tabla usuarios con rol super_admin
-- Reemplaza 'USER_ID_AQUI' con el ID del usuario que creaste en el dashboard

UPDATE usuarios
SET
  rol = 'super_admin',
  email = 'admin@kond.local',
  username = 'superadmin',
  nombre = 'Super',
  apellido = 'Admin',
  updated_at = NOW()
WHERE id = 'USER_ID_AQUI';

-- Si el usuario no existe en la tabla usuarios, créalo:
INSERT INTO usuarios (
  id,
  email,
  username,
  nombre,
  apellido,
  rol,
  created_at,
  updated_at
) VALUES (
  'USER_ID_AQUI',
  'admin@kond.local',
  'superadmin',
  'Super',
  'Admin',
  'super_admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  rol = 'super_admin',
  email = 'admin@kond.local',
  username = 'superadmin',
  updated_at = NOW();

-- PASO 2: Verificar que se creó correctamente
SELECT id, email, username, rol FROM usuarios WHERE rol = 'super_admin';

-- PASO 3: Ahora puedes hacer login en /admin/login con:
-- Email: admin@kond.local
-- Password: La contraseña que configuraste en el dashboard