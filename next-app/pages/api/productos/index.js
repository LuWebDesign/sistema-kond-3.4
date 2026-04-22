// API Route: Obtener todos los productos
// GET /api/productos

import { supabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // egress: optimized - only fetch needed columns
    const { data: productos, error } = await supabase
      .from('productos')
      .select('id, nombre, categoria, tipo, medidas, precio_unitario, precio_promos, publicado, active, hidden_in_productos, stock, imagenes_urls, description, allow_promotions, tags, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ success: true, productos });

  } catch (error) {
    console.error('Error al obtener productos:', error);
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
}
