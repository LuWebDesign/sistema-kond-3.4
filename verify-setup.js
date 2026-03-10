#!/usr/bin/env node

/**
 * Script de verificación post-migración
 * Verifica que la estructura Supabase esté completa
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando estructura Supabase...\n');

const checks = [
  {
    name: 'Cliente Supabase',
    file: 'supabase/client.js',
    required: true
  },
  {
    name: 'Schema SQL',
    file: 'supabase/schema.sql',
    required: true
  },
  {
    name: 'Storage Buckets SQL',
    file: 'supabase/storage-buckets.sql',
    required: true
  },
  {
    name: 'Script de migración',
    file: 'supabase/migrate-data.js',
    required: true
  },
  {
    name: 'Documentación Supabase',
    file: 'supabase/README.md',
    required: true
  },
  {
    name: 'Variables de entorno ejemplo',
    file: '.env.example',
    required: true
  },
  {
    name: 'Inicializador Supabase',
    file: 'js/supabase-init.js',
    required: true
  },
  {
    name: 'Utils extendidos',
    file: 'js/utils.js',
    required: true
  },
  {
    name: 'Documentación de migración',
    file: 'MIGRACION-SUPABASE.md',
    required: true
  },
  {
    name: 'Backend eliminado',
    file: 'backend',
    shouldNotExist: true
  }
];

let allOk = true;

checks.forEach(check => {
  const filePath = path.join(process.cwd(), check.file);
  const exists = fs.existsSync(filePath);

  if (check.shouldNotExist) {
    if (!exists) {
      console.log(`✅ ${check.name}: Correctamente eliminado`);
    } else {
      console.log(`❌ ${check.name}: Aún existe (debería estar eliminado)`);
      allOk = false;
    }
  } else {
    if (exists) {
      const stats = fs.statSync(filePath);
      const size = stats.isDirectory() ? 'DIR' : `${(stats.size / 1024).toFixed(1)} KB`;
      console.log(`✅ ${check.name}: ${size}`);
    } else {
      console.log(`❌ ${check.name}: No encontrado`);
      if (check.required) allOk = false;
    }
  }
});

console.log('\n' + '='.repeat(50));

if (allOk) {
  console.log('✅ Estructura Supabase completa y correcta\n');
  console.log('📋 Próximos pasos:');
  console.log('1. Crear proyecto en Supabase: https://supabase.com');
  console.log('2. Ejecutar SQL: supabase/schema.sql');
  console.log('3. Ejecutar SQL: supabase/storage-buckets.sql');
  console.log('4. Copiar .env.example a .env.local');
  console.log('5. Configurar credenciales en .env.local');
  console.log('6. Instalar dependencia: npm install @supabase/supabase-js');
  console.log('7. Migrar datos (opcional): node supabase/migrate-data.js\n');
  console.log('📖 Guía completa: supabase/README.md');
  console.log('📄 Resumen cambios: MIGRACION-SUPABASE.md\n');
} else {
  console.log('❌ Faltan algunos archivos requeridos\n');
  process.exit(1);
}
