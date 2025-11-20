#!/usr/bin/env node
// Lista columnas de la tabla `usuarios` usando information_schema

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
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name,ordinal_position,table_schema')
      .eq('table_name', 'usuarios')
      .order('ordinal_position', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      // console.log('No se encontraron columnas para la tabla usuarios (revisa permisos o esquema).');
      return;
    }
    // console.log('Columnas encontradas en usuarios:');
    // data.forEach(c => console.log(` - ${c.column_name} (schema: ${c.table_schema})`));
  } catch (err) {
    console.error('Error consultando information_schema:', err.message || err);
    process.exit(1);
  }
}

run();
