// ============================================
// SUPABASE PEDIDO HISTORIAL - CRUD
// Eventos y notas del historial de pedidos catálogo
// ============================================

import { supabase } from './supabaseClient'
import { TENANT_ID } from '../lib/tenant'

/**
 * Obtener historial completo de un pedido (desc por fecha)
 */
export async function getPedidoHistorial(pedidoId) {
  if (!supabase || !pedidoId) return { data: [], error: null }
  const { data, error } = await supabase
    .from('pedido_historial')
    .select('*')
    .eq('pedido_id', pedidoId)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(50)
  return { data: data || [], error }
}

/**
 * Insertar un evento en el historial
 * @param {object} param
 * @param {number|string} param.pedidoId
 * @param {string} param.tipo - 'created'|'estado'|'pago'|'fecha'|'nota'|'calendario'|'guardado'
 * @param {string} param.descripcion
 * @param {string} [param.autor]
 */
export async function addHistorialEvent({ pedidoId, tipo, descripcion, autor = 'Admin' }) {
  if (!supabase || !pedidoId) return { data: null, error: 'No client' }
  const { data, error } = await supabase
    .from('pedido_historial')
    .insert([{
      pedido_id: Number(pedidoId),
      tenant_id: TENANT_ID,
      tipo,
      descripcion,
      autor
    }])
    .select()
    .single()
  return { data, error }
}
