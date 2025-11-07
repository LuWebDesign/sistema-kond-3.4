// API Route: Obtener todos los pedidos del catálogo
// GET /api/pedidos/catalogo

import { supabaseAdmin } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const supabase = supabaseAdmin();

    // Obtener pedidos con sus items
    const { data: pedidos, error } = await supabase
      .from('pedidos_catalogo')
      .select(`
        *,
        pedidos_catalogo_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, pedidos });

  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    return res.status(500).json({ error: 'Error al obtener pedidos' });
  }
}
