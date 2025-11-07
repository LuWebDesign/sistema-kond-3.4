// API Route: Obtener todos los productos
// GET /api/productos

import { supabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { data: productos, error } = await supabase
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, productos });

  } catch (error) {
    console.error('Error al obtener productos:', error);
    return res.status(500).json({ error: 'Error al obtener productos' });
  }
}
