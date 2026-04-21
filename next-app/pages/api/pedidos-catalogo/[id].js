import { supabaseAdmin, createSignedUrlForComprobante } from '../../../utils/supabaseClient'

export default async function handler(req, res) {
	const { id } = req.query
	if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

	try {
		const supabase = supabaseAdmin()

		// Columnas base (omitimos comprobante_url por defecto)
		const baseCols = [
			'id', 'cliente_nombre', 'cliente_apellido', 'cliente_telefono', 'cliente_email',
			'cliente_direccion', 'fecha_creacion', 'total', 'metodo_pago', 'estado', 'comprobante_omitido', 'created_at', 'updated_at'
		]
		if (req.query.include_comprobante === '1') baseCols.push('comprobante_url')

		const cols = baseCols.join(',')

		const { data: pedidos, error } = await supabase
			.from('pedidos_catalogo')
			.select(cols)
			.eq('id', id)
			.limit(1)

		if (error) throw error
		const pedido = (pedidos && pedidos[0]) || null
		if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' })

		// Cargar items asociados
		const { data: items, error: itemsError } = await supabase
			.from('pedidos_catalogo_items')
				.select('id,pedido_catalogo_id,producto_id,producto_nombre,producto_precio,cantidad,medidas')
			.eq('pedido_catalogo_id', pedido.id)

		if (itemsError) throw itemsError


		// Si se pidió incluir el comprobante, y existe, convertir a signed URL cuando corresponda
		if (req.query.include_comprobante === '1' && pedido.comprobante_url) {
			const comp = pedido.comprobante_url
			// Si es data URL o ya es HTTP, lo dejamos tal cual
			if (!/^data:/.test(comp) && !/^https?:\/\//.test(comp)) {
				// Asumimos que es un path en el bucket 'comprobantes'
				const signed = await createSignedUrlForComprobante(comp, 60 * 60)
				if (signed) pedido.comprobante_url = signed
			}
		}

		return res.status(200).json({ pedido: { ...pedido, items: items || [] } })
	} catch (error) {
		console.error('Error en /api/pedidos-catalogo/[id]:', error)
		return res.status(500).json({ error: error.message || 'Error interno' })
	}
}

