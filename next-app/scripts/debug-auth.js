// ============================================
// Script de diagnóstico de autenticación
// Ejecutar: node scripts/debug-auth.js
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugAuth() {
  try {
    console.log('🔍 DIAGNÓSTICO DE AUTENTICACIÓN\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Listar todos los usuarios en auth.users
    console.log('1️⃣ Usuarios en Supabase Auth (auth.users):');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('   ❌ Error:', authError.message);
    } else {
      console.log(`   Total: ${users.length} usuarios\n`);
      users.forEach((user, idx) => {
        console.log(`   ${idx + 1}. Email: ${user.email}`);
        console.log(`      ID: ${user.id}`);
        console.log(`      Confirmado: ${user.email_confirmed_at ? '✓' : '✗'}`);
        console.log(`      Creado: ${new Date(user.created_at).toLocaleString()}\n`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 2. Listar usuarios en la tabla usuarios
    console.log('2️⃣ Usuarios en tabla usuarios:');
    const { data: dbUsers, error: dbError } = await supabase
      .from('usuarios')
      .select('*');
    
    if (dbError) {
      console.error('   ❌ Error:', dbError.message);
    } else {
      console.log(`   Total: ${dbUsers.length} usuarios\n`);
      dbUsers.forEach((user, idx) => {
        console.log(`   ${idx + 1}. Username: ${user.username}`);
        console.log(`      ID: ${user.id}`);
        console.log(`      Rol: ${user.rol}\n`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 3. Intentar login con las credenciales
    console.log('3️⃣ Prueba de login:');
    const testEmail = 'admin@kond.local';
    const testPassword = 'Admin123!';
    
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}\n`);

    const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (loginError) {
      console.log('   ❌ Login FALLÓ');
      console.log(`   Error: ${loginError.message}\n`);
    } else {
      console.log('   ✅ Login EXITOSO');
      console.log(`   User ID: ${loginData.user.id}`);
      console.log(`   Email: ${loginData.user.email}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

debugAuth();
