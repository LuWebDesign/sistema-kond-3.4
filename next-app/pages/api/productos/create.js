// API Route: Crear nuevo producto
// POST /api/productos/create

import { supabaseAdmin } from '../../../utils/supabaseClient';
import { TENANT_ID } from '../../../lib/tenant';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const producto = req.body;

    // Validar datos requeridos
    if (!producto.nombre) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    // Usar cliente admin para crear producto
    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from('productos')
      .insert([{ ...producto, tenant_id: TENANT_ID }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({ success: true, producto: data });

  } catch (error) {
    console.error('Error al crear producto:', error);
    return res.status(500).json({ error: 'Error al crear producto' });
  }
}
