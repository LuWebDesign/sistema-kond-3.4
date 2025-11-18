-- PASO 1: Ejecuta ESTE query primero para encontrar tu ID real
SELECT id, email, created_at FROM auth.users WHERE email = 'tu-email@gmail.com';

-- El resultado te dará tu ID real (ejemplo: '550e8400-e29b-41d4-a716-446655440000')
-- Copia ese ID y úsalo en el PASO 2