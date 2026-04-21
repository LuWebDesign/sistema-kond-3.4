// API Route: Obtener todos los productos
// GET /api/productos

import { supabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Soporte para paginación: ?page=1&per_page=50
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.per_page || '50', 10)));
    const start = (page - 1) * perPage;
    const end = start + perPage - 1;

    const cols = [
      'id', 'nombre', 'categoria', 'tipo', 'precio_unitario', 'imagenes_urls', 'publicado', 'tags', 'created_at'
    ].join(',');

    let productos = null;
    let count = null;
    try {
      const resp = await supabase
        .from('productos')
        .select(cols, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(start, end);
      productos = resp.data; count = resp.count;
    } catch (errSelectCols) {
      console.warn('select(cols) failed, falling back to select(*):', errSelectCols.message || errSelectCols);
      const resp = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false })
        .range(start, end);
      productos = resp.data; // count may be null
    }

    // nota: manejamos errores en los bloques try/catch anteriores

    return res.status(200).json({ success: true, productos, pagination: { page, perPage, total: count || (productos ? productos.length : 0) } });

  } catch (error) {
    console.error('Error al obtener productos:', error);
    // En modo debug, devolver mensaje y stack para diagnóstico local
    if (req.query && req.query.debug === '1') {
      return res.status(500).json({ error: 'Error al obtener productos', message: error.message, stack: error.stack });
    }
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
}
