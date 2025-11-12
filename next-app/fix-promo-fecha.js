// Script para actualizar fecha de promoción
// Ejecutar: node next-app/fix-promo-fecha.js

const fs = require('fs');
const path = require('path');

// Leer variables de entorno
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
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixPromoFecha() {
  console.log('🔧 Actualizando fecha de promoción...\n');
  
  try {
    // Actualizar la promo ID 6 para que esté activa hoy
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + 30); // 30 días desde hoy
    const fechaFinStr = fechaFin.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('promociones')
      .update({
        fecha_inicio: '2025-11-01',
        fecha_fin: fechaFinStr
      })
      .eq('id', 6)
      .select();
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.error('❌ No se encontró la promoción con ID 6');
      return;
    }
    
    console.log('✅ Promoción actualizada:');
    console.log(`   - ID: ${data[0].id}`);
    console.log(`   - Nombre: ${data[0].nombre}`);
    console.log(`   - Nueva fecha_inicio: ${data[0].fecha_inicio}`);
    console.log(`   - Nueva fecha_fin: ${data[0].fecha_fin}`);
    console.log('\n🎯 La promoción ahora debería aparecer en el catálogo\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixPromoFecha();
