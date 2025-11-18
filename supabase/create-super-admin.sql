-- ============================================
-- SCRIPT PERSONALIZADO PARA TU SUPER ADMIN
-- Reemplaza TU_ID_REAL_AQUI con el ID que encontraste en el paso anterior
-- ============================================

-- Tu ID real de auth.users (reemplaza esto):
-- Ejemplo: '550e8400-e29b-41d4-a716-446655440000'

INSERT INTO usuarios (id, email, username, nombre, apellido, rol, created_at, updated_at)
VALUES (
  'TU_ID_REAL_AQUI',    -- ← PEGA AQUÍ TU ID REAL
  'tu-email@gmail.com', -- ← TU EMAIL REAL
  'superadmin',
  'Super',
  'Admin',
  'super_admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  rol = 'super_admin',
  updated_at = NOW();

-- Verificar que se creó
SELECT id, email, username, rol FROM usuarios WHERE rol = 'super_admin';