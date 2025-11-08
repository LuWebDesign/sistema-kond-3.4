#!/usr/bin/env node
// Script: compare-users.js
// - Lista usuarios en auth.users (más campos)
// - Lista filas en la tabla `usuarios`
// - Compara y crea filas faltantes en `usuarios` usando service_role

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env.local si existe
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function run() {
  try {
    console.log('🔍 Listando usuarios en auth.users...');
    const { data: authResp, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) throw authErr;
    const authUsers = authResp.users || [];

    console.log(`  Encontrados ${authUsers.length} usuarios en auth.users`);

    authUsers.forEach(u => {
      console.log(`  - ${u.email} (id: ${u.id}) created_at: ${u.created_at}`);
    });

    console.log('\n🔍 Listando filas en tabla `usuarios`...');
    const { data: dbUsers, error: dbErr } = await supabase
      .from('usuarios')
      .select('*');
    if (dbErr) throw dbErr;
    console.log(`  Encontradas ${dbUsers.length} filas en tabla usuarios`);
    dbUsers.forEach(u => {
      console.log(`  - username: ${u.username} id: ${u.id} rol: ${u.rol} email: ${u.email || '(sin email)'}`);
    });

    // Comparar: por id de auth.user vs id de usuarios
    const dbIds = new Set(dbUsers.map(d => String(d.id)));

    const missing = authUsers.filter(u => !dbIds.has(String(u.id)));

    if (missing.length === 0) {
      console.log('\n✅ No hay usuarios faltantes en la tabla `usuarios`.');
      return;
    }

    console.log(`\n⚠️  Se detectaron ${missing.length} usuarios en auth.users sin fila en \'usuarios\'`);

    for (const u of missing) {
      const email = u.email || '';
      const username = email.split('@')[0] || `user_${u.id.slice(0,6)}`;
      const newRow = {
        id: u.id,
        username,
        rol: 'usuario',
        email,
        created_at: new Date(u.created_at).toISOString()
      };

      console.log(`  -> Creando fila para ${email} (username: ${username})`);
      const { data: insertData, error: insertErr } = await supabase
        .from('usuarios')
        .insert(newRow)
        .select();

      if (insertErr) {
        console.error('     ❌ Error al crear fila:', insertErr.message || insertErr);
      } else {
        console.log('     ✅ Fila creada con id:', insertData && insertData[0] && insertData[0].id);
      }
    }

    console.log('\n🎯 Proceso completado. Revisa la tabla `usuarios` en Supabase Dashboard para confirmar.');

  } catch (err) {
    console.error('❌ Error en compare-users:', err.message || err);
    process.exit(1);
  }
}

run();
