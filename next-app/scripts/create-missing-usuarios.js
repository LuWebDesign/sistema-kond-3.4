#!/usr/bin/env node
// Crea filas faltantes en `usuarios` usando solo columnas existentes

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error('Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function run() {
  try {
    const { data: authResp, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) throw authErr;
    const authUsers = authResp.users || [];

    const { data: dbUsers } = await supabase.from('usuarios').select('id');
    const dbIds = new Set((dbUsers || []).map(d => String(d.id)));

    const missing = authUsers.filter(u => !dbIds.has(String(u.id)));
    if (missing.length === 0) {
      console.log('No hay usuarios faltantes.');
      return;
    }

    for (const u of missing) {
      const email = u.email || '';
      const username = email.split('@')[0] || `user_${u.id.slice(0,6)}`;
      const row = {
        id: u.id,
        username,
        password_hash: '',
        rol: 'usuario',
        created_at: new Date(u.created_at).toISOString()
      };

      console.log(`Creando usuario ${username} (${u.id})`);
      const { data: insertData, error: insertErr } = await supabase
        .from('usuarios')
        .insert(row)
        .select();

      if (insertErr) {
        console.error('  Error al insertar:', insertErr.message || insertErr);
      } else {
        console.log('  Insertado:', insertData && insertData[0] && insertData[0].id);
      }
    }

    console.log('Proceso completado.');
  } catch (err) {
    console.error('Error en create-missing-usuarios:', err.message || err);
    process.exit(1);
  }
}

run();
