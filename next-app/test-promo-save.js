// Script de prueba para verificar guardado de promociones
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local manualmente
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPromoSave() {
  console.log('\n🧪 Iniciando test de guardado de promoción...\n');

  // 1. Verificar estructura de la tabla
  console.log('1️⃣ Verificando estructura de tabla promociones...');
  const { data: columns, error: colError } = await supabase
    .rpc('exec_sql', { 
      query: `SELECT column_name, data_type 
              FROM information_schema.columns 
              WHERE table_name = 'promociones' 
              ORDER BY ordinal_position;` 
    });
  
  if (colError) {
    console.log('⚠️ No se pudo verificar estructura (esto es normal si no tienes permisos)');
  } else {
    console.log('✅ Columnas encontradas:', columns);
  }

  // 2. Intentar crear promoción de prueba
  console.log('\n2️⃣ Intentando crear promoción de prueba (buy_x_get_y)...');
  const testPromo = {
    nombre: 'TEST 2x1 - ELIMINAR',
    tipo: 'buy_x_get_y',
    valor: null,
    aplica_a: 'todos',
    categoria: null,
    producto_id: null,
    fecha_inicio: null,
    fecha_fin: null,
    activo: true,
    prioridad: 0,
    badge_texto: 'TEST',
    badge_color: '#ff0000',
    badge_text_color: '#ffffff',
    descuento_porcentaje: null,
    descuento_monto: null,
    precio_especial: null,
    config: { buyQuantity: 2, payQuantity: 1 }
  };

  console.log('📦 Datos a insertar:', JSON.stringify(testPromo, null, 2));

  const { data: insertData, error: insertError } = await supabase
    .from('promociones')
    .insert([testPromo])
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error al insertar:', insertError);
    console.error('Código:', insertError.code);
    console.error('Mensaje:', insertError.message);
    console.error('Detalles:', insertError.details);
    
    // Verificar si el error es por columna faltante
    if (insertError.message.includes('config') || insertError.message.includes('column')) {
      console.log('\n⚠️ POSIBLE CAUSA: La columna "config" no existe en la tabla.');
      console.log('📝 SOLUCIÓN: Ejecuta el archivo sql/add-config-to-promociones.sql en Supabase SQL Editor');
    }
    return;
  }

  console.log('✅ Promoción creada exitosamente!');
  console.log('📊 ID:', insertData.id);
  console.log('📊 Config guardado:', insertData.config);

  // 3. Leer la promoción para verificar
  console.log('\n3️⃣ Verificando lectura de la promoción...');
  const { data: readData, error: readError } = await supabase
    .from('promociones')
    .select('*')
    .eq('id', insertData.id)
    .single();

  if (readError) {
    console.error('❌ Error al leer:', readError);
    return;
  }

  console.log('✅ Promoción leída correctamente');
  console.log('📊 Config leído:', readData.config);

  // 4. Eliminar la promoción de prueba
  console.log('\n4️⃣ Eliminando promoción de prueba...');
  const { error: deleteError } = await supabase
    .from('promociones')
    .delete()
    .eq('id', insertData.id);

  if (deleteError) {
    console.error('❌ Error al eliminar:', deleteError);
    console.log('⚠️ Elimina manualmente la promoción con ID:', insertData.id);
    return;
  }

  console.log('✅ Promoción de prueba eliminada correctamente\n');
  console.log('🎉 TEST COMPLETADO CON ÉXITO!\n');
}

testPromoSave().catch(err => {
  console.error('💥 Error general:', err);
  process.exit(1);
});
