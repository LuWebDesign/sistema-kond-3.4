// finanzasUtils.js - Utilidades para registrar movimientos financieros desde otros módulos
import { createMovimiento, getMovimientos } from './supabaseFinanzas';

/**
 * Registrar un movimiento financiero desde cualquier módulo
 * @param {Object} params - Parámetros del movimiento
 * @param {string} params.tipo - Tipo de movimiento: 'ingreso' | 'egreso' | 'gasto' | 'inversion'
 * @param {number} params.monto - Monto del movimiento
 * @param {string} params.categoria - Categoría del movimiento
 * @param {string} params.descripcion - Descripción del movimiento
 * @param {string} params.fecha - Fecha en formato YYYY-MM-DD (opcional, default: hoy)
 * @param {string} params.clienteName - Nombre del cliente (opcional)
 * @param {number} params.pedidoId - ID del pedido relacionado (opcional)
 * @param {string} params.metodoPago - Método de pago: 'efectivo' | 'transferencia' (opcional)
 * @returns {Object} Movimiento creado
 */
export async function registrarMovimiento({
  tipo = 'ingreso',
  monto = 0,
  categoria = '',
  descripcion = '',
  fecha = null,
  clienteName = '',
  pedidoId = null,
  metodoPago = 'efectivo',
  idempotencyKey = null,
  replaceIfExists = false
}) {
  if (typeof window === 'undefined') return null;

  const fechaFinal = fecha || new Date().toISOString().slice(0, 10);
  const horaActual = new Date().toTimeString().slice(0, 8);

  // Intentar guardar en Supabase primero
  try {
    const movimientoData = {
      tipo,
      monto: Number(monto),
      categoria,
      descripcion,
      fecha: fechaFinal,
      hora: horaActual,
      metodo_pago: metodoPago,
      cliente_nombre: clienteName || null,
      pedido_id: pedidoId || null,
      idempotency_key: idempotencyKey || null
    };

    // Si hay idempotencyKey y replaceIfExists, buscar y actualizar
    if (idempotencyKey && replaceIfExists) {
      const { data: existing } = await getMovimientos();
      const existingMov = existing?.find(m => m.idempotency_key === idempotencyKey);
      
      if (existingMov) {
        const { data, error } = await import('./supabaseFinanzas').then(m => 
          m.updateMovimiento(existingMov.id, movimientoData)
        );
        
        if (!error) {
          // Actualizar también localStorage
          updateLocalStorageFinanzas(data);
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('finanzasUpdated', { 
              detail: { ...data, action: 'updated' } 
            }));
          }
          
          return data;
        }
      }
    }

    // Crear nuevo movimiento
    const { data, error } = await createMovimiento(movimientoData);
    
    if (!error && data) {
      // Guardar también en localStorage como backup
      saveToLocalStorage(data);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('finanzasUpdated', { 
          detail: { ...data, action: 'created' } 
        }));
      }
      
      return data;
    }
    
    // Si hay error de Supabase, usar fallback a localStorage
    console.warn('Error en Supabase, usando localStorage:', error);
    return registrarMovimientoLocalStorage({
      tipo, monto, categoria, descripcion, fecha: fechaFinal, 
      hora: horaActual, clienteName, pedidoId, metodoPago, 
      idempotencyKey, replaceIfExists
    });
    
  } catch (error) {
    console.error('Error al registrar movimiento en Supabase:', error);
    // Fallback a localStorage
    return registrarMovimientoLocalStorage({
      tipo, monto, categoria, descripcion, fecha: fechaFinal, 
      hora: horaActual, clienteName, pedidoId, metodoPago, 
      idempotencyKey, replaceIfExists
    });
  }
}

/**
 * Función fallback para guardar en localStorage
 * @private
 */
function registrarMovimientoLocalStorage({
  tipo, monto, categoria, descripcion, fecha, hora, 
  clienteName, pedidoId, metodoPago, idempotencyKey, replaceIfExists
}) {
  try {
    const finanzas = JSON.parse(localStorage.getItem('finanzas') || '[]');
    const fechaFinal = fecha || new Date().toISOString().slice(0, 10);
    const horaActual = new Date().toTimeString().slice(0, 8);

    if (idempotencyKey) {
      const existingIndex = finanzas.findIndex(m => m.idempotencyKey && m.idempotencyKey === idempotencyKey);
      if (existingIndex !== -1) {
        if (!replaceIfExists) {
          return finanzas[existingIndex];
        }

        const existente = finanzas[existingIndex];
        const movimientoActualizado = {
          ...existente,
          tipo: tipo || existente.tipo,
          monto: Number(monto),
          categoria: categoria || existente.categoria,
          descripcion: descripcion || existente.descripcion,
          fecha: fechaFinal,
          hora: horaActual,
          metodoPago: metodoPago || existente.metodoPago
        };

        if (clienteName) movimientoActualizado.clienteName = clienteName;
        if (pedidoId !== null && pedidoId !== undefined) movimientoActualizado.pedidoId = pedidoId;

        finanzas[existingIndex] = movimientoActualizado;
        try {
          localStorage.setItem('finanzas', JSON.stringify(finanzas));
        } catch (e) {
          console.error('Error actualizando finanzas en localStorage:', e);
        }

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('finanzasUpdated', { detail: { ...movimientoActualizado, action: 'updated' } }));
          } catch (evtErr) {
            console.warn('No se pudo emitir evento finanzasUpdated (update):', evtErr);
          }
        }

        return movimientoActualizado;
      }
    }
    
    const movimiento = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      tipo,
      monto: Number(monto),
      categoria,
      descripcion,
      fecha: fechaFinal,
      hora: horaActual,
      metodoPago,
      registrado: false
    };
    
    // Agregar metadata opcional
    if (clienteName) movimiento.clienteName = clienteName;
    if (pedidoId) movimiento.pedidoId = pedidoId;
    if (idempotencyKey) movimiento.idempotencyKey = idempotencyKey;
    
    finanzas.push(movimiento);
    try {
      localStorage.setItem('finanzas', JSON.stringify(finanzas));
    } catch (e) {
      // Intentar fallback simple: push sin metadatos pesados
      try {
        const minimal = finanzas.map(m => ({ id: m.id, tipo: m.tipo, monto: m.monto, fecha: m.fecha, pedidoId: m.pedidoId }));
        localStorage.setItem('finanzas', JSON.stringify(minimal));
      } catch (e2) {
        console.error('Error guardando finanzas (fallback) ', e2);
      }
    }
    
    console.log('[Finanzas] Movimiento registrado:', movimiento);
    
    // Disparar evento personalizado para que la UI se actualice
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('finanzasUpdated', { detail: { ...movimiento, action: 'created' } }));
    }
    
    return movimiento;
  } catch (error) {
    console.error('Error registrando movimiento:', error);
    return null;
  }
}

export function eliminarMovimientoPorIdempotencyKey(idempotencyKey) {
  if (typeof window === 'undefined') return false;
  if (!idempotencyKey) return false;

  try {
    const finanzas = JSON.parse(localStorage.getItem('finanzas') || '[]');
    const index = finanzas.findIndex(m => m.idempotencyKey === idempotencyKey);
    if (index === -1) return false;

    const [removed] = finanzas.splice(index, 1);
    try {
      localStorage.setItem('finanzas', JSON.stringify(finanzas));
    } catch (err) {
      console.error('Error eliminando movimiento en localStorage:', err);
    }

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('finanzasUpdated', { detail: { ...removed, action: 'deleted' } }));
      } catch (evtErr) {
        console.warn('No se pudo emitir evento finanzasUpdated (delete):', evtErr);
      }
    }

    return true;
  } catch (error) {
    console.error('Error eliminando movimiento:', error);
    return false;
  }
}

export function obtenerMovimientoPorIdempotencyKey(idempotencyKey) {
  if (typeof window === 'undefined') return null;
  if (!idempotencyKey) return null;

  try {
    const finanzas = JSON.parse(localStorage.getItem('finanzas') || '[]');
    return finanzas.find(m => m.idempotencyKey === idempotencyKey) || null;
  } catch (error) {
    console.error('Error obteniendo movimiento por idempotencyKey:', error);
    return null;
  }
}

/**
 * Obtener resumen financiero
 * @returns {Object} Resumen con ingresos, egresos, balance, etc.
 */
export async function obtenerResumenFinanciero() {
  if (typeof window === 'undefined') {
    return { ingresosHoy: 0, egresosHoy: 0, equilibrioHoy: 0, balance: 0, porCobrar: 0 };
  }

  try {
    // Intentar obtener de Supabase primero
    const { data: movimientos } = await getMovimientos();
    const finanzas = movimientos || JSON.parse(localStorage.getItem('finanzas') || '[]');
    const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');
    const hoy = new Date().toISOString().slice(0, 10);
    
    const ingresosHoy = finanzas.reduce((sum, m) => {
      return sum + ((m.tipo === 'ingreso' && m.fecha?.startsWith(hoy)) ? Number(m.monto || 0) : 0);
    }, 0);
    
    const egresosHoy = finanzas.reduce((sum, m) => {
      return sum + (((m.tipo === 'egreso' || m.tipo === 'gasto') && m.fecha?.startsWith(hoy)) ? Number(m.monto || 0) : 0);
    }, 0);
    
    const equilibrioHoy = ingresosHoy - egresosHoy;
    
    const balance = finanzas.reduce((acc, m) => {
      if (m.tipo === 'ingreso') return acc + Number(m.monto || 0);
      if (m.tipo === 'egreso' || m.tipo === 'gasto') return acc - Number(m.monto || 0);
      return acc;
    }, 0);
    
    let porCobrar = 0;
    pedidosCatalogo.forEach(p => {
      const total = Number(p.total || 0);
      const estadoPago = p.estadoPago || '';
      if (estadoPago === 'pagado' || estadoPago === 'pagado_total') return;
      if (estadoPago === 'seña_pagada') {
        const sena = Number(p.senaMonto || p.señaMonto || (total * 0.5));
        porCobrar += Math.max(0, total - sena);
      } else {
        porCobrar += total;
      }
    });
    
    return { ingresosHoy, egresosHoy, equilibrioHoy, balance, porCobrar };
  } catch (error) {
    console.error('Error obteniendo resumen financiero:', error);
    return { ingresosHoy: 0, egresosHoy: 0, equilibrioHoy: 0, balance: 0, porCobrar: 0 };
  }
}

/**
 * Obtener movimientos por fecha
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Array} Lista de movimientos
 */
export function obtenerMovimientosPorFecha(fecha) {
  if (typeof window === 'undefined') return [];

  try {
    const finanzas = JSON.parse(localStorage.getItem('finanzas') || '[]');
    return finanzas.filter(m => m.fecha?.startsWith(fecha));
  } catch (error) {
    console.error('Error obteniendo movimientos por fecha:', error);
    return [];
  }
}

/**
 * Obtener movimientos por pedido
 * @param {number} pedidoId - ID del pedido
 * @returns {Array} Lista de movimientos relacionados al pedido
 */
export function obtenerMovimientosPorPedido(pedidoId) {
  if (typeof window === 'undefined') return [];

  try {
    const finanzas = JSON.parse(localStorage.getItem('finanzas') || '[]');
    return finanzas.filter(m => m.pedidoId === pedidoId);
  } catch (error) {
    console.error('Error obteniendo movimientos por pedido:', error);
    return [];
  }
}

/**
 * Formatear monto como moneda
 * @param {number} value - Valor a formatear
 * @returns {string} Valor formateado
 */
export function formatCurrency(value) {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  } catch (e) {
    return `$${value || 0}`;
  }
}

export default {
  registrarMovimiento,
  eliminarMovimientoPorIdempotencyKey,
  obtenerMovimientoPorIdempotencyKey,
  obtenerResumenFinanciero,
  obtenerMovimientosPorFecha,
  obtenerMovimientosPorPedido,
  formatCurrency
};

// ============================================
// FUNCIONES HELPER PRIVADAS
// ============================================

/**
 * Guardar movimiento en localStorage como backup
 * @private
 */
function saveToLocalStorage(movimiento) {
  try {
    const finanzas = JSON.parse(localStorage.getItem('finanzas') || '[]');
    
    // Convertir de snake_case a camelCase
    const movimientoLocal = {
      id: movimiento.id,
      tipo: movimiento.tipo,
      monto: movimiento.monto,
      categoria: movimiento.categoria,
      descripcion: movimiento.descripcion,
      fecha: movimiento.fecha,
      hora: movimiento.hora,
      metodoPago: movimiento.metodo_pago,
      clienteName: movimiento.cliente_nombre,
      pedidoId: movimiento.pedido_id,
      idempotencyKey: movimiento.idempotency_key,
      registrado: true, // Marca que viene de Supabase
      supabaseId: movimiento.id
    };
    
    finanzas.push(movimientoLocal);
    localStorage.setItem('finanzas', JSON.stringify(finanzas));
  } catch (error) {
    console.warn('Error guardando en localStorage:', error);
  }
}

/**
 * Actualizar movimiento en localStorage
 * @private
 */
function updateLocalStorageFinanzas(movimiento) {
  try {
    const finanzas = JSON.parse(localStorage.getItem('finanzas') || '[]');
    const index = finanzas.findIndex(m => m.supabaseId === movimiento.id || m.id === movimiento.id);
    
    if (index !== -1) {
      finanzas[index] = {
        id: movimiento.id,
        tipo: movimiento.tipo,
        monto: movimiento.monto,
        categoria: movimiento.categoria,
        descripcion: movimiento.descripcion,
        fecha: movimiento.fecha,
        hora: movimiento.hora,
        metodoPago: movimiento.metodo_pago,
        clienteName: movimiento.cliente_nombre,
        pedidoId: movimiento.pedido_id,
        idempotencyKey: movimiento.idempotency_key,
        registrado: true,
        supabaseId: movimiento.id
      };
      
      localStorage.setItem('finanzas', JSON.stringify(finanzas));
    }
  } catch (error) {
    console.warn('Error actualizando localStorage:', error);
  }
}
