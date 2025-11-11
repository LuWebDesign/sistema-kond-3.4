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

    // Adicional: contar productos publicados y activos
    try {
      const { data: published, error: pubErr, count } = await supabase
        .from('productos')
        .select('id', { count: 'exact' })
        .eq('publicado', true)
        .eq('active', true);

      if (pubErr) {
        console.warn('⚠️ Error al contar productos publicados:', pubErr.message || pubErr);
      } else {
        console.log(`📦 Productos publicados y activos: ${Array.isArray(published) ? published.length : (count || 0)}`);
      }
    } catch (e) {
      console.warn('⚠️ Falló la consulta de productos publicados:', e && e.message ? e.message : e);
    }

    // Adicional: listar promociones activas
    try {
      const { data: promos, error: promosErr } = await supabase
        .from('promociones')
        .select('*')
        .eq('activo', true)
        .order('prioridad', { ascending: false })
        .limit(20);

      if (promosErr) {
        console.warn('⚠️ Error al listar promociones activas:', promosErr.message || promosErr);
      } else if (promos && promos.length > 0) {
        console.log(`🎯 Promociones activas encontradas: ${promos.length}`);
        promos.slice(0,5).forEach(p => console.log(` - ${p.id}: ${p.nombre} (tipo=${p.tipo}, aplica_a=${p.aplica_a}, producto_id=${p.producto_id})`));
      } else {
        console.log('🎯 No se encontraron promociones activas (tabla vacía o sin promos activas)');
      }
    } catch (e) {
      console.warn('⚠️ Falló la consulta de promociones:', e && e.message ? e.message : e);
    }
    
    // Test 2: Listar tablas disponibles (RPC opcional)
    try {
      const { data: tables, error: tablesError } = await supabase.rpc('get_tables_list');
      if (tablesError) {
        console.warn('\n⚠️ RPC `get_tables_list` devolvió error:', tablesError.message || tablesError);
      } else if (tables) {
        console.log('\n📚 Tablas (RPC):', tables);
      } else {
        console.log('\nℹ️ RPC `get_tables_list` no devolvió datos (puede ser normal)');
      }
    } catch (rpcErr) {
      console.warn('\n⚠️ RPC no disponible o falló:', rpcErr && rpcErr.message ? rpcErr.message : rpcErr);
    }

    console.log('\n✅ Tu proyecto Supabase está listo para usar en esta PC');
    
    // --- Comprobar tablas relacionadas con materiales ---
    try {
      const checks = [
        { name: 'materiales', query: supabase.from('materiales').select('id').limit(5) },
        { name: 'proveedores', query: supabase.from('proveedores').select('id').limit(5) },
        { name: 'tamanos_materiales', query: supabase.from('tamanos_materiales').select('id').limit(5) },
        { name: 'espesores_materiales', query: supabase.from('espesores_materiales').select('id').limit(5) }
      ];

      for (const c of checks) {
        try {
          const { data: d, error: e } = await c.query;
          if (e) {
            console.log(`⚠️ Tabla '${c.name}': no encontrada o error: ${e.message || e}`);
          } else if (d && d.length > 0) {
            console.log(`✅ Tabla '${c.name}' existe y tiene al menos ${d.length} fila(s).`);
          } else {
            console.log(`ℹ️ Tabla '${c.name}' existe pero está vacía.`);
          }
        } catch (inner) {
          console.log(`⚠️ Error comprobando tabla '${c.name}':`, inner && inner.message ? inner.message : inner);
        }
      }
    } catch (e) {
      console.warn('⚠️ Error en comprobación de tablas de materiales:', e && e.message ? e.message : e);
    }
    
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  }
}

testConnection();
