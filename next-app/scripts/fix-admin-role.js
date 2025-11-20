// Script para corregir el rol del usuario admin
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdminRole() {
  try {
    // console.log('🔧 Corrigiendo rol del usuario admin...\n');

    // Actualizar el rol a 'admin'
    const { data, error } = await supabase
      .from('usuarios')
      .update({ rol: 'admin' })
      .eq('username', 'admin')
      .select();

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    // console.log('✅ Rol actualizado correctamente\n');
    // console.log('Usuario:', data[0]);
    // console.log('\n🎉 Ahora puedes hacer login y crear productos!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAdminRole();
