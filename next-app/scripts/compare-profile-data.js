#!/usr/bin/env node
// compare-profile-data.js
// Compara información de perfil entre auth.users y la tabla usuarios

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar .env.local si existe
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
  console.error('Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

function emailLocalPart(email) {
  if (!email) return '';
  return String(email).split('@')[0];
}

async function run() {
  try {
    // console.log('🔍 Obteniendo usuarios de auth.users...');
    const { data: authResp, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) throw authErr;
    const authUsers = authResp.users || [];

    // console.log('🔍 Obteniendo filas de la tabla `usuarios`...');
    const { data: dbUsers, error: dbErr } = await supabase.from('usuarios').select('*');
    if (dbErr) throw dbErr;

    const dbById = new Map((dbUsers || []).map(u => [String(u.id), u]));
    const authById = new Map((authUsers || []).map(u => [String(u.id), u]));

    // console.log('\n=== Comparación por usuarios en auth.users ===\n');
    for (const a of authUsers) {
      const id = String(a.id);
      const db = dbById.get(id);
      // console.log(`Usuario auth: ${a.email}  (id: ${id})`);
      if (!db) {
        // console.log('  ❌ No existe fila en tabla `usuarios`');
        // console.log('');
        continue;
      }

      const issues = [];
      // Check username similarity
      const expectedUsername = emailLocalPart(a.email);
      if (db.username && expectedUsername && db.username !== expectedUsername) {
        issues.push(`username diferente (tabla: ${db.username} vs esperado: ${expectedUsername})`);
      }

      // Check email presence in table (if column exists)
      if ('email' in db) {
        if (!db.email || db.email !== a.email) {
          issues.push(`email distinto/ausente en tabla (tabla: ${db.email || '(vacío)'} vs auth: ${a.email})`);
        }
      } else {
        issues.push('columna `email` NO existe en la tabla usuarios');
      }

      // Check rol
      if ('rol' in db) {
        // No info in auth about rol, so just report value
        // nothing to compare unless app stores role in auth.user.user_metadata
        const authRole = (a.user_metadata && a.user_metadata.role) || null;
        if (authRole && authRole !== db.rol) {
          issues.push(`rol distinto (tabla: ${db.rol} vs auth.metadata: ${authRole})`);
        }
      } else {
        issues.push('columna `rol` NO existe en la tabla usuarios');
      }

      if (issues.length === 0) {
        // console.log('  ✅ Coinciden (no se detectaron diferencias importantes)');
      } else {
        // issues.forEach(it => console.log('  ⚠️  ' + it));
      }
      // console.log('');
    }

    // console.log('\n=== Filas en tabla `usuarios` sin auth.user correspondiente ===\n');
    for (const db of dbUsers) {
      const id = String(db.id);
      if (!authById.has(id)) {
        // console.log(`  - username: ${db.username} id: ${id} rol: ${db.rol}`);
      }
    }

    // console.log('\nComparación completada.');

  } catch (err) {
    console.error('Error en compare-profile-data:', err.message || err);
    process.exit(1);
  }
}

run();
