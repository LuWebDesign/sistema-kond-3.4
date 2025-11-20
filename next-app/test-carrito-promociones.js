// Script para diagnosticar problema de promociones en carrito
const { createClient } = require('@supabase/supabase-js')
const { applyPromotionsToProduct, getActivePromotions } = require('./utils/promoEngine')

// Credenciales de Supabase (desde código previo)
const SUPABASE_URL = 'https://rnsswywuubwnlnfuybdb.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuc3N3eXd1dWJ3bmxuZnV5YmRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwMDA0OTEsImV4cCI6MjA0NjU3NjQ5MX0.MKZqrSl5S5Ll7w3YNj9fIzUGTOCa5SiYIw-I0bWEz10'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function diagnosticarCarrito() {
  // console.log('🛒 Diagnóstico de carrito con promociones\n')

  try {
    // 1. Cargar promociones activas
    // console.log('1️⃣ Cargando promociones activas desde Supabase...')
    const { data: promosData, error: promosError } = await supabase
      .from('promociones')
      .select('*')
      .eq('activo', true)

    if (promosError) {
      console.error('❌ Error cargando promociones:', promosError)
      return
    }

    // console.log(`✅ Promociones encontradas: ${promosData?.length || 0}\n`)

    // Mapear promociones a formato frontend
    const promocionesDb = (promosData || []).map(p => ({
      id: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
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
      precioEspecial: p.precio_especial,
      config: p.configuracion || p.config
    }))

    // promosData.forEach(p => {
    //   console.log(`📋 Promo ID ${p.id}: ${p.nombre}`)
    //   console.log(`   - tipo: ${p.tipo}`)
    //   console.log(`   - aplica_a: ${p.aplica_a}`)
    //   console.log(`   - fecha_inicio: ${p.fecha_inicio}`)
    //   console.log(`   - fecha_fin: ${p.fecha_fin}`)
    //   console.log(`   - descuento_porcentaje: ${p.descuento_porcentaje}`)
    //   console.log(`   - badge_texto: ${p.badge_texto}`)
    //   console.log('')
    // })

    // 2. Filtrar promociones activas por fecha
    // console.log('2️⃣ Aplicando filtro de fechas con motor de promociones...')
    const promocionesActivas = getActivePromotions(promocionesDb)
    // console.log(`✅ Promociones activas después de filtro de fechas: ${promocionesActivas.length}\n`)

    // 3. Cargar un producto de ejemplo
    // console.log('3️⃣ Cargando producto de ejemplo (ID 7)...')
    const { data: productoData, error: productoError } = await supabase
      .from('productos')
      .select('*')
      .eq('id', 7)
      .eq('publicado', true)
      .eq('active', true)
      .single()

    if (productoError || !productoData) {
      console.error('❌ Error cargando producto:', productoError)
      return
    }

    // console.log(`📦 Producto ID ${productoData.id}: ${productoData.nombre}`)
    // console.log(`   - precio_unitario: $${productoData.precio_unitario}`)
    // console.log('')

    // Mapear producto a formato frontend
    const producto = {
      id: productoData.id,
      nombre: productoData.nombre,
      categoria: productoData.categoria,
      tipo: productoData.tipo,
      medidas: productoData.medidas,
      precioUnitario: productoData.precio_unitario,
      publicado: productoData.publicado,
      active: productoData.active,
      imagen: productoData.imagen,
      tiempoUnitario: productoData.tiempo_unitario
    }

    // 4. Aplicar promociones al producto
    // console.log('4️⃣ Aplicando promociones al producto...')
    const productoConPromo = applyPromotionsToProduct(producto, promocionesActivas)
    
    // console.log(`🎯 Resultado para "${producto.nombre}":`)
    // console.log(`   - Tiene promoción: ${productoConPromo.hasPromotion ? '✅ SÍ' : '❌ NO'}`)
    // console.log(`   - Precio original: $${productoConPromo.originalPrice}`)
    // console.log(`   - Precio con descuento: $${productoConPromo.discountedPrice}`)
    // console.log(`   - Badges: ${JSON.stringify(productoConPromo.badges)}`)
    // console.log('')

    // 5. Simular lo que se guarda en el carrito
    // console.log('5️⃣ Simulando lo que se guardaría en el carrito...')
    const productoEnriquecido = {
      ...producto,
      hasPromotion: productoConPromo.hasPromotion,
      precioPromocional: productoConPromo.discountedPrice,
      promotionBadges: productoConPromo.badges
    }

    // console.log('📦 Producto enriquecido (con promoción aplicada):')
    // console.log(`   - precioUnitario: $${productoEnriquecido.precioUnitario}`)
    // console.log(`   - precioPromocional: $${productoEnriquecido.precioPromocional}`)
    // console.log(`   - hasPromotion: ${productoEnriquecido.hasPromotion}`)
    // console.log('')

    // Simular addToCart
    const unitPrice = (productoEnriquecido.precioPromocional !== undefined && productoEnriquecido.precioPromocional !== null) 
      ? productoEnriquecido.precioPromocional 
      : (productoEnriquecido.precioUnitario || 0)

    const itemCarrito = {
      productId: productoEnriquecido.id,
      idProducto: productoEnriquecido.id,
      name: productoEnriquecido.nombre,
      price: unitPrice,
      originalPrice: productoEnriquecido.precioUnitario || unitPrice,
      measures: productoEnriquecido.medidas || '',
      image: productoEnriquecido.imagen,
      quantity: 1,
      tiempoUnitario: productoEnriquecido.tiempoUnitario || '00:00:00',
      precioPorMinuto: productoEnriquecido.precioPorMinuto || 0
    }

    // console.log('🛒 Item que se guardaría en el carrito:')
    // console.log(`   - price (usado para cálculos): $${itemCarrito.price}`)
    // console.log(`   - originalPrice: $${itemCarrito.originalPrice}`)
    // console.log(`   - ¿Precio con descuento?: ${itemCarrito.originalPrice > itemCarrito.price ? '✅ SÍ' : '❌ NO'}`)
    // console.log('')

    // 6. Verificar lógica de renderizado del carrito
    // console.log('6️⃣ Verificando lógica de renderizado del carrito...')
    const original = itemCarrito.originalPrice
    const price = itemCarrito.price
    const totalLine = price * itemCarrito.quantity

    if (original > price) {
      const savings = (original - price) * itemCarrito.quantity
      const percent = Math.round(((original - price) / original) * 100)
      // console.log('✅ El carrito DEBERÍA mostrar:')
      // console.log(`   - Precio con descuento: $${totalLine}`)
      // console.log(`   - Precio original tachado: $${original}`)
      // console.log(`   - Badge de descuento: -${percent}%`)
      // console.log(`   - Mensaje de ahorro: Ahorras $${savings}`)
    } else {
      // console.log('❌ El carrito NO mostrará descuento porque:')
      // console.log(`   - originalPrice ($${original}) NO es mayor que price ($${price})`)
    }

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
  }
}

diagnosticarCarrito()
