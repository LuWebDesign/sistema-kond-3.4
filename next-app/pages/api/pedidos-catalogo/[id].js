// ============================================
// API ROUTE: DELETE PEDIDO CATÁLOGO
// Endpoint para eliminar pedidos (solo admins)
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

// Cliente con permisos de administrador (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Solo permitir método DELETE
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'ID de pedido inválido' });
  }

  try {
    console.log('🗑️  API: Eliminando pedido ID:', id);

    // Eliminar pedido (los items se eliminan automáticamente por CASCADE)
    const { error, status, statusText } = await supabaseAdmin
      .from('pedidos_catalogo')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('❌ Error al eliminar:', error);
      return res.status(500).json({ 
        error: 'Error al eliminar pedido',
        details: error.message 
      });
    }

    console.log('✅ Pedido eliminado exitosamente');
    return res.status(200).json({ 
      success: true,
      message: 'Pedido eliminado correctamente' 
    });

  } catch (error) {
    console.error('❌ Excepción al eliminar pedido:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
}
