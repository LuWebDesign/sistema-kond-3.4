#!/usr/bin/env node
// Imprime todas las filas de la tabla `usuarios` (JSON completo)

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
    const { data, error } = await supabase.from('usuarios').select('*');
    if (error) throw error;
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error imprimiendo usuarios:', err.message || err);
    process.exit(1);
  }
}

run();
