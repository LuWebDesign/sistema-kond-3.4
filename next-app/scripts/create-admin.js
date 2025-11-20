// ============================================
// Script para crear usuario admin en Supabase Auth
// Ejecutar desde next-app: node scripts/create-admin.js
// Asegúrate de tener las variables de entorno en .env.local
// ============================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    // console.log('🚀 Creando usuario admin en Supabase Auth...\n');

    // 1. Verificar si ya existe un usuario admin en la tabla usuarios
    const { data: existingUser, error: fetchError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      throw fetchError;
    }

    let userId;
    const adminEmail = 'admin@kond.local';
    const adminPassword = 'Admin123!'; // Cambiar después del primer login

    if (existingUser) {
      // console.log('✓ Usuario admin encontrado en tabla usuarios');
      // console.log(`  ID: ${existingUser.id}`);
      // console.log(`  Username: ${existingUser.username}`);
      // console.log(`  Rol: ${existingUser.rol}\n`);
      userId = existingUser.id;
    } else {
      // console.log('⚠ No se encontró usuario admin en tabla usuarios');
      // console.log('  Creando nuevo registro...\n');
    }

    // 2. Crear usuario en Supabase Auth (usando admin API)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        username: 'admin',
        rol: 'admin'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.code === 'email_exists') {
        // console.log('⚠ Usuario ya existe en Supabase Auth');
        // console.log('  Email:', adminEmail);
        // console.log('  Buscando usuario...\n');
        
        // Obtener el usuario existente
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingAuthUser = users.find(u => u.email === adminEmail);
        if (existingAuthUser) {
          userId = existingAuthUser.id;
          // console.log('✓ Usuario encontrado en Supabase Auth');
          // console.log('  ID:', userId, '\n');
        } else {
          throw new Error('No se pudo encontrar el usuario en Supabase Auth');
        }
      } else {
        throw authError;
      }
    } else {
      // console.log('✓ Usuario creado en Supabase Auth');
      // console.log(`  Email: ${authData.user.email}`);
      // console.log(`  ID: ${authData.user.id}\n`);
      userId = authData.user.id;
    }

    // 3. Actualizar o crear registro en tabla usuarios
    if (userId) {
      // Si ya existe un usuario admin, actualizar su ID al nuevo UUID de auth
      if (existingUser && existingUser.id !== userId) {
        // console.log('⚠ Actualizando ID del usuario admin existente...\n');
        
        // Primero eliminar el registro viejo
        const { error: deleteError } = await supabase
          .from('usuarios')
          .delete()
          .eq('id', existingUser.id);
        
        if (deleteError && deleteError.code !== 'PGRST116') throw deleteError;
        
        // Crear nuevo registro con el UUID de auth
        const { error: insertError } = await supabase
          .from('usuarios')
          .insert({
            id: userId,
            username: 'admin',
            password_hash: '', // No necesario con Supabase Auth
            rol: 'admin',
          });
        
        if (insertError) throw insertError;
      } else {
        // Usar upsert normal
        const { error: upsertError } = await supabase
          .from('usuarios')
          .upsert({
            id: userId,
            username: 'admin',
            password_hash: '', // No necesario con Supabase Auth
            rol: 'admin',
          }, {
            onConflict: 'id'
          });

        if (upsertError) throw upsertError;
      }

      // console.log('✓ Registro sincronizado en tabla usuarios\n');
    }

    // 4. Resumen
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // console.log('✅ USUARIO ADMIN CREADO EXITOSAMENTE');
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // console.log(`Email:    ${adminEmail}`);
    // console.log(`Password: ${adminPassword}`);
    // console.log(`ID:       ${userId}`);
    // console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    // console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createAdminUser();
