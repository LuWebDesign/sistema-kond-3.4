// API Route: Recalcular costos de productos cuando cambia el costo de un material
// POST /api/admin/materiales/recalculate-productos
//
// Body: { materialId: number, nuevoCosto: number }
//
// Para cada producto con material_id = materialId y active = true:
//   costo_placa  = nuevoCosto
//   precio_unitario = (nuevoCosto / unidades_por_placa) * (1 + margen_material / 100)
//                     (solo si unidades_por_placa > 0)

import { supabaseAdmin } from '../../../../utils/supabaseClient'
import { TENANT_ID } from '../../../../lib/tenant'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Método ${req.method} no permitido` })
  }

  const { materialId, nuevoCosto } = req.body || {}

  if (!materialId || nuevoCosto === undefined || nuevoCosto === null) {
    return res.status(400).json({ error: 'Se requieren materialId y nuevoCosto' })
  }

  const costo = parseFloat(nuevoCosto)
  if (isNaN(costo) || costo < 0) {
    return res.status(400).json({ error: 'nuevoCosto debe ser un número >= 0' })
  }

  const supabase = supabaseAdmin()

  // 1. Buscar todos los productos activos que usen este material
  const { data: productos, error: fetchError } = await supabase
    .from('productos')
    .select('id, unidades_por_placa, margen_material')
    .eq('material_id', materialId)
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)

  if (fetchError) {
    console.error('recalculate-productos fetch error:', fetchError)
    return res.status(500).json({ error: fetchError.message })
  }

  if (!productos || productos.length === 0) {
    return res.status(200).json({ updated: 0, message: 'No hay productos con ese material' })
  }

  // 2. Calcular nuevos valores para cada producto y actualizar en batch
  const updates = productos.map(p => {
    const unidadesPorPlaca = Number(p.unidades_por_placa) || 1
    const margen = Number(p.margen_material) || 0
    const costoMaterial = costo / unidadesPorPlaca
    const precioUnitario = parseFloat((costoMaterial * (1 + margen / 100)).toFixed(2))
    return { id: p.id, costo_placa: costo, precio_unitario: precioUnitario }
  })

  // Supabase no soporta bulk update con valores diferentes por fila vía cliente JS,
  // por lo que ejecutamos upsert aprovechando que id es PK
  const { error: upsertError } = await supabase
    .from('productos')
    .upsert(updates, { onConflict: 'id' })

  if (upsertError) {
    console.error('recalculate-productos upsert error:', upsertError)
    return res.status(500).json({ error: upsertError.message })
  }

  return res.status(200).json({ updated: updates.length })
}
