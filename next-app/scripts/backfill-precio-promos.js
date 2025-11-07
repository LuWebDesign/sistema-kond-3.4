/*
Script: backfill-precio-promos.js
Uso: desde la carpeta next-app ejecutar: node scripts/backfill-precio-promos.js
Requiere: SUPABASE_SERVICE_ROLE_KEY en next-app/.env.local (porque actualiza filas en la BD)

Descripción:
- Lee todas las promociones activas desde `promociones`.
- Lee todos los productos desde `productos`.
- Para cada producto calcula el precio con promociones (aplica percentage_discount y fixed_price como en promoEngine).
- Si el precio calculado difiere del `precio_promos` en la BD, lo actualiza.
*/

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Faltan variables SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL en next-app/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken:false, persistSession:false } })

function isPromoActive(promo) {
  if (!promo.activo) return false
  const today = new Date().toISOString().split('T')[0]
  if (promo.fecha_inicio && promo.fecha_inicio > today) return false
  if (promo.fecha_fin && promo.fecha_fin < today) return false
  return true
}

function appliesToProduct(promo, product) {
  if (!promo) return false
  if (!promo.aplica_a || promo.aplica_a === 'todos') return true
  if (promo.aplica_a === 'categoria' && promo.categoria && product.categoria === promo.categoria) return true
  if (promo.aplica_a === 'producto' && promo.producto_id && product.id === promo.producto_id) return true
  return false
}

function calculateDiscountedPriceForProduct(product, promos) {
  const original = parseFloat(product.precio_unitario || product.precio_unitario === 0 ? product.precio_unitario : (product.precioUnitario || 0))
  const applicable = promos.filter(p => isPromoActive(p) && appliesToProduct(p, product))
  if (applicable.length === 0) return original

  // ordenar por prioridad descendente
  applicable.sort((a,b)=> (b.prioridad||0)-(a.prioridad||0))
  let price = original
  for (const promo of applicable) {
    // tipos: percentage_discount, fixed_price, badge_only (según promoEngine)
    if ((promo.tipo === 'percentage_discount' || promo.tipo === 'porcentaje') && (promo.descuento_porcentaje || promo.descuentoPorcentaje)) {
      const pct = parseFloat(promo.descuento_porcentaje || promo.descuentoPorcentaje || 0)
      price = price * (1 - pct/100)
    } else if (promo.tipo === 'fixed_price' || promo.tipo === 'precio_especial' || promo.tipo === 'precio') {
      const fixed = parseFloat(promo.precio_especial || promo.precioEspecial || promo.valor || 0)
      if (!isNaN(fixed) && fixed > 0) price = Math.min(price, fixed)
    }
    // badge_only no afecta precio
  }
  return Math.max(0, Math.round(price*100)/100)
}

async function run() {
  try {
    console.log('🔍 Leyendo promociones...')
    const { data: promos, error: promosErr } = await supabase.from('promociones').select('*')
    if (promosErr) throw promosErr

    console.log('🔍 Leyendo productos...')
    const { data: productos, error: prodErr } = await supabase.from('productos').select('*')
    if (prodErr) throw prodErr

    console.log(`📦 Encontrados ${productos.length} productos`)

    let updates = 0
    for (const prod of productos) {
      const newPrice = calculateDiscountedPriceForProduct(prod, promos)
      const current = parseFloat(prod.precio_promos || 0)
      if (isNaN(current) || current !== newPrice) {
        // actualizar
        const { error: upErr } = await supabase.from('productos').update({ precio_promos: newPrice }).eq('id', prod.id)
        if (upErr) {
          console.error('❌ Error actualizando producto', prod.id, upErr.message || upErr)
        } else {
          updates++
          console.log(`↺ Actualizado producto ${prod.id} (${prod.nombre}): ${current} -> ${newPrice}`)
        }
      }
    }

    console.log(`✅ Backfill completado. Registros actualizados: ${updates}`)
  } catch (err) {
    console.error('❌ Error:', err.message || err)
  }
}

run()
