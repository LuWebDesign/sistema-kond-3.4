import { supabaseAdmin } from '../../../utils/supabaseClient'

export default async function handler(req, res) {
  try {
    const supabase = supabaseAdmin()
    const { action } = req.method === 'GET' ? req.query : req.body

    // ── GET: Leer datos ──
    if (req.method === 'GET') {
      const type = req.query.type || 'movimientos'

      if (type === 'movimientos') {
        // Paginación y selección de columnas para reducir egress
        const page = Math.max(1, parseInt(req.query.page || '1', 10))
        const perPage = Math.min(200, Math.max(1, parseInt(req.query.per_page || '100', 10)))
        const start = (page - 1) * perPage
        const end = start + perPage - 1

        const cols = [
          'id', 'fecha', 'hora', 'tipo', 'monto', 'categoria', 'descripcion', 'metodo_pago', 'pedido_catalogo_id', 'created_at'
        ].join(',')

        const { data, error, count } = await supabase
          .from('movimientos_financieros')
          .select(cols, { count: 'exact' })
          .order('fecha', { ascending: false })
          .order('hora', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .range(start, end)

        if (error) throw error
        return res.status(200).json({ data, pagination: { page, perPage, total: count || (data ? data.length : 0) } })
      }

      if (type === 'categorias') {
        const { data, error } = await supabase
          .from('categorias_financieras')
          .select('id,nombre')
          .order('nombre', { ascending: true })
        if (error) throw error
        return res.status(200).json({ data })
      }

      if (type === 'registros') {
        const { data, error } = await supabase
          .from('registros_cierre')
          .select('id,fecha,total,created_at')
          .order('fecha', { ascending: false })
        if (error) throw error
        return res.status(200).json({ data })
      }

      if (type === 'all') {
        // Para 'all' limitamos movimientos a un conjunto razonable
        const page = Math.max(1, parseInt(req.query.page || '1', 10))
        const perPage = Math.min(200, Math.max(1, parseInt(req.query.per_page || '100', 10)))
        const start = (page - 1) * perPage
        const end = start + perPage - 1

        const movs = await supabase
          .from('movimientos_financieros')
          .select('id,fecha,hora,tipo,monto,categoria,descripcion,metodo_pago,created_at')
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false })
          .range(start, end)

        const cats = await supabase.from('categorias_financieras').select('id,nombre').order('nombre', { ascending: true })
        const regs = await supabase.from('registros_cierre').select('id,fecha,total').order('fecha', { ascending: false })

        if (movs.error) throw movs.error
        if (cats.error) throw cats.error
        if (regs.error) throw regs.error

        return res.status(200).json({
          movimientos: movs.data,
          categorias: cats.data,
          registros: regs.data,
          pagination: { page, perPage }
        })
      }

      return res.status(400).json({ error: 'Tipo no válido' })
    }

    // ── POST: Crear / Acciones ──
    if (req.method === 'POST') {
      if (action === 'createMovimiento') {
        const { movimiento } = req.body
        const movimientoData = {
          tipo: movimiento.tipo,
          monto: parseFloat(movimiento.monto),
          fecha: movimiento.fecha,
          hora: movimiento.hora || null,
          categoria: movimiento.categoria || null,
          descripcion: movimiento.descripcion || null,
          metodo_pago: movimiento.metodoPago || movimiento.metodo_pago || 'efectivo',
          pedido_catalogo_id: movimiento.pedidoCatalogoId || movimiento.pedido_catalogo_id || null
        }
        const { data, error } = await supabase.from('movimientos_financieros').insert([movimientoData]).select().single()
        // Retry sin pedido_catalogo_id si la columna no existe
        if (error && (error.message?.includes('pedido_catalogo_id') || error.code === '42703')) {
          const { pedido_catalogo_id, ...sinRef } = movimientoData
          const { data: d2, error: e2 } = await supabase.from('movimientos_financieros').insert([sinRef]).select().single()
          if (e2) throw e2
          return res.status(200).json({ data: d2 })
        }
        if (error) throw error
        return res.status(200).json({ data })
      }

      if (action === 'createCategoria') {
        const { nombre } = req.body
        const { data, error } = await supabase.from('categorias_financieras').insert([{ nombre }]).select().single()
        if (error) throw error
        return res.status(200).json({ data })
      }

      if (action === 'upsertRegistroCierre') {
        const { registro } = req.body
        const registroData = {
          fecha: registro.fecha,
          efectivo: parseFloat(registro.efectivo || 0),
          transferencia: parseFloat(registro.transferencia || 0),
          tarjeta: parseFloat(registro.tarjeta || 0),
          total: parseFloat(registro.total || 0),
          observaciones: registro.observaciones || null
        }
        const { data, error } = await supabase.from('registros_cierre').upsert([registroData], { onConflict: 'fecha' }).select().single()
        if (error) throw error
        return res.status(200).json({ data })
      }

      return res.status(400).json({ error: 'Acción no válida' })
    }

    // ── PUT: Actualizar ──
    if (req.method === 'PUT') {
      if (action === 'updateMovimiento') {
        const { id, movimiento } = req.body
        const updateData = {}
        if (movimiento.tipo !== undefined) updateData.tipo = movimiento.tipo
        if (movimiento.monto !== undefined) updateData.monto = parseFloat(movimiento.monto)
        if (movimiento.fecha !== undefined) updateData.fecha = movimiento.fecha
        if (movimiento.hora !== undefined) updateData.hora = movimiento.hora
        if (movimiento.categoria !== undefined) updateData.categoria = movimiento.categoria
        if (movimiento.descripcion !== undefined) updateData.descripcion = movimiento.descripcion
        if (movimiento.metodoPago !== undefined) updateData.metodo_pago = movimiento.metodoPago
        if (movimiento.metodo_pago !== undefined) updateData.metodo_pago = movimiento.metodo_pago

        const { data, error } = await supabase.from('movimientos_financieros').update(updateData).eq('id', id).select().single()
        if (error) throw error
        return res.status(200).json({ data })
      }

      if (action === 'updateCategoria') {
        const { id, nombre } = req.body
        const { data, error } = await supabase.from('categorias_financieras').update({ nombre }).eq('id', id).select().single()
        if (error) throw error
        return res.status(200).json({ data })
      }

      if (action === 'bulkUpdateCategoria') {
        const { oldName, newName } = req.body
        const { data, error } = await supabase.from('movimientos_financieros').update({ categoria: newName }).eq('categoria', oldName).select()
        if (error) throw error
        return res.status(200).json({ data })
      }

      return res.status(400).json({ error: 'Acción no válida' })
    }

    // ── DELETE ──
    if (req.method === 'DELETE') {
      const { id, type } = req.body

      if (type === 'movimiento') {
        const { error } = await supabase.from('movimientos_financieros').delete().eq('id', id)
        if (error) throw error
        return res.status(200).json({ success: true })
      }

      if (type === 'categoria') {
        const { error } = await supabase.from('categorias_financieras').delete().eq('id', id)
        if (error) throw error
        return res.status(200).json({ success: true })
      }

      if (type === 'registroCierre') {
        const { error } = await supabase.from('registros_cierre').delete().eq('id', id)
        if (error) throw error
        return res.status(200).json({ success: true })
      }

      return res.status(400).json({ error: 'Tipo no válido' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Error en API finanzas:', error)
    return res.status(500).json({ error: error.message || 'Error interno' })
  }
}
