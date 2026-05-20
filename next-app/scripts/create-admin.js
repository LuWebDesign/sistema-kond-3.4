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
const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

if (!tenantId) {
  console.error('❌ Error: Falta NEXT_PUBLIC_TENANT_ID en .env.local');
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

    // Ensure tenant exists in tenants table (satisfy FK on usuarios).
    // If the tenant row does not exist, create a minimal one so this
    // script can be used reliably in local/dev environments.
    const { data: _tenantExists, error: tenantCheckError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single();
    if (tenantCheckError && tenantCheckError.code !== 'PGRST116') {
      throw tenantCheckError;
    }
    if (!_tenantExists) {
      const { error: insertTenantError } = await supabase
        .from('tenants')
        .insert({ id: tenantId, name: 'seeded-tenant' });
      if (insertTenantError) throw insertTenantError;
    }

    // Admin config
    let userId;
    // Admin official email (can be overridden via env vars)
    const adminEmail = process.env.ADMIN_EMAIL || 'megafibro@gmail.com';
    const adminUsername = process.env.ADMIN_USERNAME || adminEmail.split('@')[0];
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!'; // Cambiar después del primer login

    // 1. Verificar si ya existe un usuario admin en la tabla usuarios (tenant-scoped)
    const { data: existingUser, error: fetchError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', adminUsername)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
      throw fetchError;
    }

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
        username: adminUsername,
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
            username: adminUsername,
            password_hash: '', // No necesario con Supabase Auth
            rol: 'admin',
            tenant_id: tenantId,
          });
        
        if (insertError) throw insertError;
      } else {
        // Usar upsert normal
        const { error: upsertError } = await supabase
          .from('usuarios')
          .upsert({
            id: userId,
            username: adminUsername,
            password_hash: '', // No necesario con Supabase Auth
            rol: 'admin',
            tenant_id: tenantId,
          }, {
            onConflict: 'id'
          });

        if (upsertError) throw upsertError;
      }

      console.log(`✅ Registro sincronizado en tabla usuarios: ${adminEmail} (username: ${adminUsername}) - ID: ${userId}`);
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
