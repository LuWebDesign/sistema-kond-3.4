-- ============================================
-- SCRIPT: Registrar usuario admin en Supabase Auth
-- Ejecutar DESPUÉS de crear el usuario en la tabla usuarios
-- ============================================

-- Paso 1: Obtener el UUID del usuario admin
SELECT id, username, rol FROM usuarios WHERE username = 'admin';

-- Copia el UUID que aparece en id (ejemplo: 12345678-1234-1234-1234-123456789abc)

-- Paso 2: Crear usuario en Auth usando la API REST de Supabase
-- Esto NO se puede hacer directamente desde SQL Editor
-- Debes ejecutar este código JavaScript en la consola del navegador
-- o usar el siguiente script Node.js

/*
INSTRUCCIONES:
1. Abre la consola del navegador en http://localhost:3000
2. Pega y ejecuta el siguiente código JavaScript:

const createAuthUser = async () => {
  const supabaseUrl = 'https://sdudjuomhcywhpyfziel.supabase.co';
  const serviceRoleKey = 'TU_SERVICE_ROLE_KEY_AQUI'; // Desde .env.local
  
  // Obtener el UUID del admin desde la tabla usuarios
  const userId = 'TU_UUID_ADMIN_AQUI'; // El que copiaste del SELECT anterior
  const password = 'TuContraseñaAdmin123!'; // La misma que usaste para el hash bcrypt
  
  const email = `${userId}@kond.local`;
  
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        user_id: userId
      }
    })
  });
  
  const data = await response.json();
  console.log('Usuario Auth creado:', data);
  
  if (data.id) {
    alert('✅ Usuario admin registrado en Supabase Auth');
  } else {
    alert('❌ Error: ' + JSON.stringify(data));
  }
};

createAuthUser();

*/

-- Alternativa: Deshabilitar RLS temporalmente para desarrollo
-- ⚠️ SOLO para desarrollo local, NO para producción
-- ALTER TABLE productos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedidos_catalogo DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedidos_catalogo_items DISABLE ROW LEVEL SECURITY;

-- Para volver a habilitar RLS:
-- ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedidos_catalogo ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pedidos_catalogo_items ENABLE ROW LEVEL SECURITY;
