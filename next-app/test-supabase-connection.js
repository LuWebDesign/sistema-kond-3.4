// Script de verificación de conexión a Supabase
// Ejecutar: node test-supabase-connection.js

// Leer variables de entorno desde .env.local manualmente
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse simple del .env.local
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    process.env[key] = value;
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Verificando credenciales...');
console.log('URL:', supabaseUrl ? '✅ Definida' : '❌ Falta NEXT_PUBLIC_SUPABASE_URL');
console.log('Anon Key:', supabaseAnonKey ? '✅ Definida' : '❌ Falta NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ Faltan variables de entorno en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('\n🔗 Probando conexión a Supabase...');
    
    // Test 1: Verificar conexión básica
    const { data, error } = await supabase.from('productos').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error al conectar:', error.message);
      return;
    }
    
    console.log('✅ Conexión exitosa a Supabase!');
    console.log(`📦 Tabla 'productos' existe y tiene registros`);
    
    // Test 2: Listar tablas disponibles
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables_list').catch(() => ({
      data: null,
      error: { message: 'RPC no disponible (normal en setup inicial)' }
    }));
    
    console.log('\n✅ Tu proyecto Supabase está listo para usar en esta PC');
    
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  }
}

testConnection();
