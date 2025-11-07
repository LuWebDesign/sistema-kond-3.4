// Script para verificar el estado de la base de datos Supabase
// Ejecutar: node check-database-status.js

const fs = require('fs');
const path = require('path');

// Leer .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseStatus() {
  console.log('🔍 VERIFICANDO ESTADO DE LA BASE DE DATOS\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar tablas existentes
    console.log('\n📊 TABLAS EXISTENTES:');
    const tables = [
      'productos',
      'pedidos_catalogo',
      'pedidos_catalogo_items',
      'pedidos_internos',
      'usuarios',
      'materiales',
      'movimientos_materiales',
      'promociones',
      'gastos',
      'ingresos'
    ];

    const tableStatus = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          tableStatus[table] = { exists: false, count: 0, error: error.message };
        } else {
          tableStatus[table] = { exists: true, count: count || 0 };
        }
      } catch (err) {
        tableStatus[table] = { exists: false, count: 0, error: err.message };
      }
    }

    // Mostrar resultado de tablas
    for (const [table, status] of Object.entries(tableStatus)) {
      if (status.exists) {
        console.log(`  ✅ ${table.padEnd(30)} - ${status.count} registros`);
      } else {
        console.log(`  ❌ ${table.padEnd(30)} - NO EXISTE`);
      }
    }

    // 2. Verificar Storage Buckets
    console.log('\n\n📦 STORAGE BUCKETS:');
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.log('  ❌ Error al listar buckets:', error.message);
      } else if (buckets && buckets.length > 0) {
        buckets.forEach(bucket => {
          console.log(`  ✅ ${bucket.name.padEnd(30)} - ${bucket.public ? 'PUBLIC' : 'PRIVATE'}`);
        });
      } else {
        console.log('  ⚠️  No hay buckets creados');
      }
    } catch (err) {
      console.log('  ❌ Error:', err.message);
    }

    // 3. Verificar usuarios
    console.log('\n\n👥 USUARIOS REGISTRADOS:');
    try {
      const { data: users, error } = await supabase
        .from('usuarios')
        .select('id, username, rol, created_at')
        .limit(10);
      
      if (error) {
        console.log('  ❌ Tabla usuarios no existe o no hay acceso');
      } else if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`  👤 ${user.username.padEnd(20)} - Rol: ${user.rol}`);
        });
      } else {
        console.log('  ⚠️  No hay usuarios registrados');
      }
    } catch (err) {
      console.log('  ❌ Error:', err.message);
    }

    // 4. Verificar RLS (Row Level Security)
    console.log('\n\n🔒 ROW LEVEL SECURITY (RLS):');
    console.log('  ℹ️  Verifica manualmente en Supabase Dashboard > Authentication > Policies');

    // 5. Resumen de archivos SQL disponibles
    console.log('\n\n📄 ARCHIVOS SQL DISPONIBLES EN /supabase:');
    const supabaseDir = path.join(__dirname, '..', 'supabase');
    if (fs.existsSync(supabaseDir)) {
      const sqlFiles = fs.readdirSync(supabaseDir).filter(f => f.endsWith('.sql'));
      sqlFiles.forEach(file => {
        console.log(`  📝 ${file}`);
      });
    }

    // 6. Recomendaciones
    console.log('\n\n💡 RECOMENDACIONES:');
    
    const missingTables = Object.entries(tableStatus)
      .filter(([_, status]) => !status.exists)
      .map(([table, _]) => table);
    
    if (missingTables.length > 0) {
      console.log(`  ⚠️  Faltan ${missingTables.length} tablas:`);
      missingTables.forEach(table => console.log(`     - ${table}`));
      console.log('\n  👉 Ejecutar archivos SQL faltantes en SQL Editor de Supabase');
    }

    if (tableStatus.usuarios && tableStatus.usuarios.count === 0) {
      console.log('  ⚠️  No hay usuarios admin - ejecutar provision-admin-auth.sql');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

checkDatabaseStatus();
