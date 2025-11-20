// Script de diagnóstico para verificar promociones en catálogo
// Ejecutar: node next-app/test-promociones-catalogo.js

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

async function testPromociones() {
  // console.log('🔍 DIAGNÓSTICO DE PROMOCIONES EN CATÁLOGO\n');
  
  try {
    // 1. Cargar promociones activas
    // console.log('1️⃣ Cargando promociones activas...');
    const { data: promos, error: promosError } = await supabase
      .from('promociones')
      .select('*')
      .eq('activo', true)
      .order('prioridad', { ascending: false });
    
    if (promosError) {
      console.error('❌ Error:', promosError.message);
      return;
    }
    
    // console.log(`✅ Promociones activas: ${promos?.length || 0}\n`);
    
    if (promos && promos.length > 0) {
      promos.forEach(p => {
        // console.log(`📋 Promo ID ${p.id}: ${p.nombre}`);
        // console.log(`   - tipo: ${p.tipo}`);
        // console.log(`   - aplica_a: ${p.aplica_a}`);
        // console.log(`   - producto_id: ${p.producto_id}`);
        // console.log(`   - categoria: ${p.categoria}`);
        // console.log(`   - fecha_inicio: ${p.fecha_inicio}`);
        // console.log(`   - fecha_fin: ${p.fecha_fin}`);
        // console.log(`   - descuento_porcentaje: ${p.descuento_porcentaje}`);
        // console.log(`   - precio_especial: ${p.precio_especial}`);
        // console.log(`   - badge_texto: ${p.badge_texto}`);
        // console.log(`   - badge_color: ${p.badge_color}`);
        // console.log(`   - prioridad: ${p.prioridad}`);
        // console.log('');
      });
    }
    
    // 2. Cargar productos publicados
    console.log('2️⃣ Cargando productos publicados...');
    const { data: productos, error: prodError } = await supabase
      .from('productos')
      .select('*')
      .eq('publicado', true)
      .eq('active', true);
    
    if (prodError) {
      console.error('❌ Error:', prodError.message);
      return;
    }
    
    console.log(`✅ Productos publicados: ${productos?.length || 0}\n`);
    
    if (productos && productos.length > 0) {
      productos.forEach(p => {
        console.log(`📦 Producto ID ${p.id}: ${p.nombre}`);
        console.log(`   - categoria: ${p.categoria}`);
        console.log(`   - tipo: ${p.tipo}`);
        console.log(`   - precio_unitario: $${p.precio_unitario}`);
        console.log(`   - publicado: ${p.publicado}`);
        console.log(`   - active: ${p.active}`);
        console.log('');
      });
    }
    
    // 3. Simular aplicación de promociones
    if (promos && promos.length > 0 && productos && productos.length > 0) {
      console.log('3️⃣ Simulando aplicación de promociones...\n');
      
      // Mapear promos a formato frontend
      const promocionesActivas = promos.map(p => ({
        id: p.id,
        nombre: p.nombre,
        tipo: p.tipo,
        valor: p.valor,
        aplicaA: p.aplica_a,
        categoria: p.categoria,
        productoId: p.producto_id,
        fechaInicio: p.fecha_inicio,
        fechaFin: p.fecha_fin,
        activo: p.activo,
        prioridad: p.prioridad,
        badgeTexto: p.badge_texto,
        badgeColor: p.badge_color,
        badgeTextColor: p.badge_text_color,
        descuentoPorcentaje: p.descuento_porcentaje,
        descuentoMonto: p.descuento_monto,
        precioEspecial: p.precio_especial
      }));
      
      console.log('📊 Promociones mapeadas para motor:');
      console.log(JSON.stringify(promocionesActivas, null, 2));
      console.log('');
      
      // Importar y probar motor de promociones
      const promoEnginePath = path.join(__dirname, 'utils', 'promoEngine.js');
      delete require.cache[require.resolve(promoEnginePath)];
      const { getActivePromotions, applyPromotionsToProduct } = require('./utils/promoEngine.js');
      
      const activePromos = getActivePromotions(promocionesActivas);
      console.log(`✅ Promociones activas después de filtro de fechas: ${activePromos.length}\n`);
      
      if (activePromos.length > 0) {
        activePromos.forEach(ap => {
          console.log(`✓ ${ap.nombre} (aplica_a: ${ap.aplicaA}, tipo: ${ap.tipo})`);
        });
        console.log('');
      }
      
      // Aplicar a cada producto
      productos.forEach(prod => {
        const mappedProd = {
          id: prod.id,
          nombre: prod.nombre,
          categoria: prod.categoria,
          precioUnitario: prod.precio_unitario
        };
        
        const result = applyPromotionsToProduct(mappedProd, activePromos);
        
        console.log(`🎯 ${prod.nombre}:`);
        console.log(`   - Precio original: $${result.originalPrice}`);
        console.log(`   - Precio con descuento: $${result.discountedPrice}`);
        console.log(`   - Tiene promoción: ${result.hasPromotion ? '✅ SÍ' : '❌ NO'}`);
        if (result.hasPromotion) {
          console.log(`   - Badge: ${result.badge || 'N/A'}`);
          console.log(`   - Color badge: ${result.badgeColor || 'N/A'}`);
          console.log(`   - Promociones aplicadas: ${result.promotions?.length || 0}`);
        }
        console.log('');
      });
    }
    
    console.log('✅ Diagnóstico completado\n');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

testPromociones();
