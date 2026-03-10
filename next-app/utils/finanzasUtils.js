// finanzasUtils.js - Utilidades para registrar movimientos financieros desde otros módulos

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
export function registrarMovimiento({
  tipo = 'ingreso',
  monto = 0,
  categoria = '',
  descripcion = '',
  fecha = null,
  clienteName = '',
  pedidoId = null,
  metodoPago = 'efectivo',
  idempotencyKey = null
}) {
  if (typeof window === 'undefined') return null;

  try {
    const finanzas = JSON.parse(localStorage.getItem('finanzas') || '[]');
    // Si se pasó idempotencyKey, comprobar si ya existe
    if (idempotencyKey) {
      const exists = finanzas.some(m => m.idempotencyKey && m.idempotencyKey === idempotencyKey);
      if (exists) {
        // retornar el movimiento existente para idempotencia
        const existing = finanzas.find(m => m.idempotencyKey === idempotencyKey);
        return existing || null;
      }
    }
    
    const fechaFinal = fecha || new Date().toISOString().slice(0, 10);
    const hora = new Date().toTimeString().slice(0, 8);
    
    const movimiento = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      tipo,
      monto: Number(monto),
      categoria,
      descripcion,
      fecha: fechaFinal,
      hora,
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
      window.dispatchEvent(new CustomEvent('finanzasUpdated', { detail: movimiento }));
    }
    
    return movimiento;
  } catch (error) {
    console.error('Error registrando movimiento:', error);
    return null;
  }
}

/**
 * Obtener resumen financiero
 * @returns {Object} Resumen con ingresos, egresos, balance, etc.
 */
export function obtenerResumenFinanciero() {
  if (typeof window === 'undefined') {
    return { ingresosHoy: 0, egresosHoy: 0, equilibrioHoy: 0, balance: 0, porCobrar: 0 };
  }

  try {
    const finanzas = JSON.parse(localStorage.getItem('finanzas') || '[]');
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
  obtenerResumenFinanciero,
  obtenerMovimientosPorFecha,
  obtenerMovimientosPorPedido,
  formatCurrency
};
