import Layout from '../components/Layout'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency } from '../utils/catalogUtils'
import { getAllPedidosInternos, createPedidoInterno } from '../utils/supabasePedidosInternos'
import { getAllProductos, mapProductoToFrontend } from '../utils/supabaseProductos'
import { getPedidosCatalogoParaCalendario, updatePedidoCatalogo } from '../utils/supabasePedidos'

// Util de tiempo a nivel de módulo para uso en todos los componentes
const timeToMinutes = (timeStr = '00:00:00') => {
  const [h = 0, m = 0, s = 0] = (timeStr || '00:00:00').split(':').map(Number)
  return (Number(h) * 60) + Number(m) + (Number(s) / 60)
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pedidos, setPedidos] = useState([])
  const [products, setProducts] = useState([])
  const [pedidosCatalogo, setPedidosCatalogo] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedPedidoToAssign, setSelectedPedidoToAssign] = useState(null)
  const [selectedAssignDate, setSelectedAssignDate] = useState(null)
  const [monthStats, setMonthStats] = useState({
    totalPedidos: 0,
    totalTiempo: 0,
    totalValor: 0
  })

  // Indexación por fecha para evitar filtros costosos por render
  const internosByDate = useMemo(() => {
    const map = Object.create(null)
    try {
      (pedidos || []).forEach(p => {
        const f = p.fechaEntrega || p.fecha
        if (!f) return
        const dateStr = String(f)
        if (!map[dateStr]) map[dateStr] = []
        map[dateStr].push(p)
      })
    } catch (e) { /* noop */ }
    return map
  }, [pedidos])

  const catalogoByDate = useMemo(() => {
    const map = Object.create(null)
    try {
      (pedidosCatalogo || []).forEach(p => {
        if (!p || p.estado === 'entregado') return
        const prodDate = p.fechaProduccionCalendario || p.fechaProduccion || null
        const entregaDate = p.fechaEntregaCalendario || p.fechaConfirmadaEntrega || null
        if (prodDate) {
          const ds = String(prodDate)
          if (!map[ds]) map[ds] = []
          map[ds].push({ data: p, role: 'produccion' })
        }
        if (entregaDate) {
          const ds = String(entregaDate)
          if (!map[ds]) map[ds] = []
          map[ds].push({ data: p, role: 'entrega' })
        }
      })
    } catch (e) { /* noop */ }
    return map
  }, [pedidosCatalogo])

  // Cargar datos desde Supabase
  const loadData = useCallback(async () => {
    try {
      const [pedidosResult, productsResult, catalogoResult] = await Promise.all([
        getAllPedidosInternos(),
        getAllProductos(),
        getPedidosCatalogoParaCalendario()
      ])
      setPedidos(pedidosResult.data || [])
      setProducts(productsResult.data ? productsResult.data.map(mapProductoToFrontend) : [])
      setPedidosCatalogo(catalogoResult.data || [])
    } catch (error) {
      console.error('Error loading calendar data:', error)
      setPedidos([])
      setProducts([])
      setPedidosCatalogo([])
    }
  }, [])

  // Helpers de tiempo (usamos la función a nivel de módulo)

  // Obtener pedidos internos de un día específico (por fechaEntrega)
  const getPedidosInternosDelDia = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0]
    return internosByDate[dateStr] || []
  }, [internosByDate])

  // Obtener pedidos de catálogo asignados a un día (producción o entrega) y no entregados
  const getPedidosCatalogoDelDia = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0]
    return catalogoByDate[dateStr] || []
  }, [catalogoByDate])

  // Calcular estadísticas del mes
  const calculateMonthStats = useCallback(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Pedidos internos del mes (por fechaEntrega)
    const monthPedidosInternos = (pedidos || []).filter(pedido => {
      const f = pedido.fechaEntrega || pedido.fecha
      if (!f) return false
      const d = new Date(`${f}T00:00:00`)
      return d.getFullYear() === year && d.getMonth() === month
    })

    // Pedidos catálogo asignados del mes (contabilizar tiempo/valor SOLO en fecha de producción)
    const monthPedidosCatalogo = (pedidosCatalogo || []).filter(p => {
      if (p.estado === 'entregado') return false
      const prodDate = p.fechaProduccionCalendario || p.fechaProduccion || null
      if (!prodDate) return false
      const d = new Date(`${prodDate}T00:00:00`)
      return d.getFullYear() === year && d.getMonth() === month
    })

    const totalPedidos = monthPedidosInternos.length + monthPedidosCatalogo.length
    let totalTiempo = 0
    let totalValor = 0

    // Internos
    monthPedidosInternos.forEach(pedido => {
      if (Array.isArray(pedido.productos) && pedido.productos.length) {
        pedido.productos.forEach(prod => {
          const producto = products.find(p => String(p.id) === String(prod.id))
          if (producto) {
            const mins = timeToMinutes(producto.tiempoUnitario || '00:00:30') * (Number(prod.cantidad) || 1)
            totalTiempo += mins
            totalValor += (Number(producto.precioUnitario) || 0) * (Number(prod.cantidad) || 1)
          }
        })
      } else if (pedido.productoId) {
        const producto = products.find(p => String(p.id) === String(pedido.productoId))
        if (producto) {
          const qty = Number(pedido.cantidad) || 1
          const mins = timeToMinutes(producto.tiempoUnitario || '00:00:30') * qty
          totalTiempo += mins
          totalValor += (Number(producto.precioUnitario) || 0) * qty
        }
      }
    })

    // Catálogo (producción)
    monthPedidosCatalogo.forEach(p => {
      const items = Array.isArray(p.productos) ? p.productos : []
      items.forEach(it => {
        // Resolver producto por id (id/idProducto/productId) si existe en base
        const prodId = it.productId || it.idProducto || it.id
        const producto = products.find(px => String(px.id) === String(prodId))
        const qty = Number(it.cantidad) || 1
        if (producto) {
          const mins = timeToMinutes(producto.tiempoUnitario || it.tiempoUnitario || '00:00:30') * qty
          totalTiempo += mins
          totalValor += (Number(producto.precioUnitario) || Number(it.precioUnitario) || Number(it.subtotal || 0) / Math.max(1, qty) || 0) * qty
        } else {
          // Fallback si no hay producto en base
          const mins = timeToMinutes(it.tiempoUnitario || '00:00:30') * qty
          totalTiempo += mins
          totalValor += (Number(it.precioUnitario) || Number(it.subtotal || 0) / Math.max(1, qty) || 0) * qty
        }
      })
    })

    setMonthStats({ totalPedidos, totalTiempo, totalValor })
  }, [currentDate, pedidos, pedidosCatalogo, products])

  // Efectos
  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    calculateMonthStats()
  }, [calculateMonthStats])

  // Navegación del calendario
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  // Obtener días del mes
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() === 0 ? 7 : firstDay.getDay() // Lunes = 1, Domingo = 7

    const days = []
    
    // Días del mes anterior (para completar la primera semana)
    for (let i = startingDay - 1; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i)
      days.push({ date: prevDate, isCurrentMonth: false })
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({ date, isCurrentMonth: true })
    }
    
    // Días del mes siguiente (para completar la última semana)
    const totalCells = 42 // 6 semanas × 7 días
    while (days.length < totalCells) {
      const nextDate = new Date(year, month + 1, days.length - daysInMonth - startingDay + 2)
      days.push({ date: nextDate, isCurrentMonth: false })
    }
    
    return days
  }

  // Abrir modal del día
  const handleDayClick = (date) => {
    setSelectedDate(date)
    setShowDayModal(true)
  }

  // Obtener pedidos de catálogo pendientes de asignación
  const getPendingCatalogOrders = useCallback(() => {
    return pedidosCatalogo.filter(p => 
      p.estado !== 'entregado' && 
      !p.asignadoAlCalendario &&
      (p.estadoPago === 'seña_pagada' || p.estadoPago === 'pagado_total')
    )
  }, [pedidosCatalogo])

  // Abrir modal de asignación
  const handleOpenAssignModal = (pedido = null) => {
    setSelectedPedidoToAssign(pedido)
    setSelectedAssignDate(null)
    setShowAssignModal(true)
  }

  // Cerrar modal de asignación
  const handleCloseAssignModal = () => {
    setShowAssignModal(false)
    setSelectedPedidoToAssign(null)
    setSelectedAssignDate(null)
  }

  // Confirmar asignación de pedido al calendario
  const handleConfirmAssign = async () => {
    if (!selectedPedidoToAssign || !selectedAssignDate) return

    try {
      const clienteNombre = typeof selectedPedidoToAssign.cliente === 'string'
        ? selectedPedidoToAssign.cliente
        : `${selectedPedidoToAssign.cliente?.nombre || ''} ${selectedPedidoToAssign.cliente?.apellido || ''}`.trim()

      // Crear pedido interno en Supabase
      const { data: newInterno } = await createPedidoInterno({
        fechaEntrega: selectedAssignDate,
        cliente: clienteNombre,
        estado: 'en_produccion',
        asignadoAlCalendario: true,
        fechaAsignadaCalendario: selectedAssignDate
      })

      // Marcar pedido de catálogo como asignado en Supabase
      await updatePedidoCatalogo(selectedPedidoToAssign.id, {
        asignadoAlCalendario: true,
        fechaConfirmadaEntrega: selectedAssignDate,
        fechaProduccionCalendario: selectedAssignDate,
        estado: 'en_produccion'
      })

      // Disparar eventos para sincronizar otras páginas
      window.dispatchEvent(new CustomEvent('pedidos:updated'))
      window.dispatchEvent(new CustomEvent('pedidosCatalogo:updated'))

      handleCloseAssignModal()
      alert(`Pedido #${selectedPedidoToAssign.id} asignado correctamente para ${selectedAssignDate}`)

      // Recargar datos desde Supabase
      await loadData()
    } catch (error) {
      console.error('Error al asignar pedido:', error)
      alert('Error al asignar pedido. Intenta nuevamente.')
    }
  }

  // Formatear tiempo
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return `${hours}h ${mins}m`
  }

  // Obtener nombre del mes
  const getMonthName = () => {
    return currentDate.toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const days = useMemo(() => getDaysInMonth(), [currentDate])
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  return (
    <Layout title="Calendario - Sistema KOND">
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '24px' 
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--person-color)',
              marginBottom: '8px'
            }}>
              📅 Calendario de Producción
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Vista mensual de pedidos y planificación de entregas
            </p>
          </div>
          
          <button
            onClick={() => handleOpenAssignModal()}
            style={{
              background: 'var(--accent-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📅 Asignar Pedidos
            {getPendingCatalogOrders().length > 0 && (
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.8rem'
              }}>
                {getPendingCatalogOrders().length}
              </span>
            )}
          </button>
        </div>

        {/* Estadísticas del mes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              📦 Pedidos del Mes
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#3b82f6', margin: 0 }}>
              {monthStats.totalPedidos}
            </p>
          </div>
          
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              ⏱️ Tiempo Total
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6', margin: 0 }}>
              {formatTime(monthStats.totalTiempo)}
            </p>
          </div>
          
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              💰 Valor Total
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', margin: 0 }}>
              {formatCurrency(monthStats.totalValor)}
            </p>
          </div>
        </div>

        {/* Calendario */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          {/* Header del calendario */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <button
              onClick={() => navigateMonth(-1)}
              style={{
                background: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ← Anterior
            </button>
            
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              textTransform: 'capitalize'
            }}>
              {getMonthName()}
            </h2>
            
            <button
              onClick={() => navigateMonth(1)}
              style={{
                background: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Siguiente →
            </button>
          </div>

          {/* Días de la semana */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px',
            marginBottom: '1px'
          }}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div
                key={day}
                style={{
                  background: 'var(--bg-secondary)',
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: 'var(--text-secondary)'
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '1px'
          }}>
            {days.map((dayInfo, index) => {
              const dateStr = dayInfo.date.toISOString().split('T')[0]
              const pedidosInternosDelDia = getPedidosInternosDelDia(dayInfo.date)
              const pedidosCatalogoDelDia = getPedidosCatalogoDelDia(dayInfo.date)
              const pedidosCount = (pedidosInternosDelDia?.length || 0) + (pedidosCatalogoDelDia?.length || 0)
              const isToday = dateStr === todayStr
              const hasPedidos = pedidosCount > 0

              return (
                <div
                  key={index}
                  onClick={() => dayInfo.isCurrentMonth && handleDayClick(dayInfo.date)}
                  style={{
                    minHeight: '80px',
                    background: dayInfo.isCurrentMonth 
                      ? (isToday ? 'var(--accent-blue)20' : 'var(--bg-secondary)')
                      : 'var(--bg-tertiary)',
                    border: isToday ? '2px solid var(--accent-blue)' : 'none',
                    padding: '8px',
                    cursor: dayInfo.isCurrentMonth ? 'pointer' : 'default',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: dayInfo.isCurrentMonth ? 1 : 0.5
                  }}
                >
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: isToday ? '700' : '600',
                    color: dayInfo.isCurrentMonth 
                      ? (isToday ? 'var(--accent-blue)' : 'var(--text-primary)')
                      : 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    {dayInfo.date.getDate()}
                  </div>
                  
                  {hasPedidos && (
                    <div style={{
                      background: '#10b981',
                      color: 'white',
                      borderRadius: '12px',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      alignSelf: 'flex-start'
                    }}>
                      {pedidosCount} pedido{pedidosCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Botón para ir a hoy */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{
              background: 'transparent',
              color: 'var(--accent-blue)',
              border: '1px solid var(--accent-blue)',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📅 Ir a Hoy
          </button>
        </div>

        {/* Modal del día */}
        {showDayModal && selectedDate && (
          <DayModal 
            date={selectedDate}
            pedidosInternos={getPedidosInternosDelDia(selectedDate)}
            pedidosCatalogo={getPedidosCatalogoDelDia(selectedDate)}
            products={products}
            onClose={() => setShowDayModal(false)}
          />
        )}

        {/* Modal de Asignar Pedidos */}
        {showAssignModal && (
          <AssignOrderModal
            pedidosCatalogo={getPendingCatalogOrders()}
            selectedPedido={selectedPedidoToAssign}
            selectedDate={selectedAssignDate}
            onPedidoSelect={setSelectedPedidoToAssign}
            onDateSelect={setSelectedAssignDate}
            onConfirm={handleConfirmAssign}
            onClose={handleCloseAssignModal}
          />
        )}
      </div>
    </Layout>
  )
}

// Modal para mostrar detalles del día
function DayModal({ date, pedidosInternos = [], pedidosCatalogo = [], products, onClose }) {
  const dateStr = date.toLocaleDateString('es-ES', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  // Combinar pedidos de ambos orígenes para mostrar
  const combined = useMemo(() => {
    const arr = []
    ;(pedidosInternos || []).forEach(p => arr.push({ tipo: 'interno', data: p }))
    ;(pedidosCatalogo || []).forEach(entry => {
      // entry puede venir como objeto con {data, role} desde catalogoByDate
      if (entry && typeof entry === 'object' && 'data' in entry) {
        arr.push({ tipo: 'catalogo', data: entry.data, role: entry.role || 'desconocido' })
      } else {
        // compat: si viniera crudo (no debería tras nuestra indexación)
        arr.push({ tipo: 'catalogo', data: entry, role: 'desconocido' })
      }
    })
    return arr
  }, [pedidosInternos, pedidosCatalogo])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            textTransform: 'capitalize'
          }}>
            📅 {dateStr}
          </h2>
          
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '8px'
            }}
          >
            ×
          </button>
        </div>

        {combined.length > 0 ? (
          <div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '16px'
            }}>
              📦 Pedidos del Día ({combined.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {combined.map(item => (
                <PedidoCard 
                  key={`${item.tipo}-${item.data?.id ?? item.data?.idPedido ?? 'sinid'}-${item.role || 'na'}`}
                  pedido={item.data}
                  tipo={item.tipo}
                  role={item.role}
                  products={products}
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            padding: '40px'
          }}>
            <p style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</p>
            <p>No hay pedidos programados para este día</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Tarjeta de pedido en el modal
function PedidoCard({ pedido, tipo = 'interno', role, products }) {
  let totalValue = 0
  let totalTime = 0

  // Calcular valores del pedido
  if (Array.isArray(pedido.productos) && pedido.productos.length) {
    pedido.productos.forEach(prod => {
      const prodId = prod.productId || prod.idProducto || prod.id
      const producto = products.find(p => String(p.id) === String(prodId))
      const qty = Number(prod.cantidad) || 1
      if (producto) {
        totalValue += (Number(producto.precioUnitario) || 0) * qty
        const minutes = timeToMinutes(producto.tiempoUnitario || prod.tiempoUnitario || '00:00:30') * qty
        totalTime += minutes
      } else {
        totalValue += (Number(prod.precioUnitario) || Number(prod.subtotal || 0) / Math.max(1, qty) || 0) * qty
        const minutes = timeToMinutes(prod.tiempoUnitario || '00:00:30') * qty
        totalTime += minutes
      }
    })
  } else if (pedido.productoId) {
    const producto = products.find(p => String(p.id) === String(pedido.productoId))
    const qty = Number(pedido.cantidad) || 1
    if (producto) {
      totalValue += (Number(producto.precioUnitario) || 0) * qty
      totalTime += timeToMinutes(producto.tiempoUnitario || '00:00:30') * qty
    }
  }

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return `${hours}h ${mins}m`
  }

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h4 style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary)'
        }}>
          Pedido #{pedido.id}
        </h4>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            background: tipo === 'catalogo' ? '#e1705520' : '#3b82f620',
            color: tipo === 'catalogo' ? '#e17055' : '#3b82f6',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            {tipo === 'catalogo' ? 'Catálogo' : (pedido.source === 'catalogo' ? 'Interno (Catálogo)' : 'Interno')}
          </span>
          {tipo === 'catalogo' && role && (
            <span style={{
              background: role === 'produccion' ? '#f59e0b20' : '#10b98120',
              color: role === 'produccion' ? '#f59e0b' : '#10b981',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: 600
            }}>
              {role === 'produccion' ? 'Producción' : (role === 'entrega' ? 'Entrega' : role)}
            </span>
          )}
          <span style={{
            background: '#10b98120',
            color: '#10b981',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            {pedido.estado || 'Pendiente'}
          </span>
        </div>
      </div>

      {pedido.cliente && (
        <p style={{
          margin: '0 0 8px 0',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          Cliente: {typeof pedido.cliente === 'string' ? pedido.cliente : (pedido.cliente.nombre || pedido.cliente.apellido ? `${pedido.cliente.nombre || ''} ${pedido.cliente.apellido || ''}`.trim() : 'N/A')}
        </p>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '12px',
        fontSize: '0.9rem'
      }}>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Productos: </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {pedido.productos?.length || 0}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Tiempo: </span>
          <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
            {formatTime(totalTime)}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-secondary)' }}>Valor: </span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>

      {pedido.productos && pedido.productos.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <details>
            <summary style={{
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              fontWeight: 500
            }}>
              Ver productos ({pedido.productos.length})
            </summary>
            <div style={{ marginTop: '8px', paddingLeft: '16px' }}>
              {pedido.productos.map((prod, index) => {
                const prodId = prod.productId || prod.idProducto || prod.id
                const producto = products.find(p => String(p.id) === String(prodId))
                return (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    fontSize: '0.8rem',
                    borderBottom: index < pedido.productos.length - 1 ? '1px solid var(--border-color)' : 'none'
                  }}>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {producto?.nombre || prod.nombre || `Producto ${prodId}`} × {prod.cantidad || 1}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {(() => {
                        const qty = Number(prod.cantidad) || 1
                        const unit = (producto?.precioUnitario) ?? (prod.precioUnitario) ?? (Number(prod.subtotal || 0) / Math.max(1, qty))
                        const price = (unit ?? 0) * qty
                        return formatCurrency(price)
                      })()}
                    </span>
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

// Modal para asignar pedidos de catálogo al calendario
function AssignOrderModal({ 
  pedidosCatalogo = [], 
  selectedPedido, 
  selectedDate, 
  onPedidoSelect, 
  onDateSelect, 
  onConfirm, 
  onClose 
}) {
  const today = new Date()
  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    .toISOString().split('T')[0]

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '900px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0
          }}>
            📅 Asignar Pedidos al Calendario
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '8px'
            }}
          >
            ×
          </button>
        </div>

        {pedidosCatalogo.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
            <p>No hay pedidos pendientes de asignación</p>
            <p style={{ fontSize: '0.9rem' }}>Los pedidos deben tener seña pagada para poder asignarse</p>
          </div>
        ) : (
          <div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '16px'
            }}>
              Seleccionar Pedido ({pedidosCatalogo.length})
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {pedidosCatalogo.map(pedido => (
                <div
                  key={pedido.id}
                  onClick={() => onPedidoSelect(pedido)}
                  style={{
                    background: selectedPedido?.id === pedido.id ? 'var(--accent-blue)20' : 'var(--bg-secondary)',
                    border: selectedPedido?.id === pedido.id ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    fontWeight: 600,
                    marginBottom: '4px'
                  }}>
                    Pedido #{pedido.id}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px'
                  }}>
                    {typeof pedido.cliente === 'string' 
                      ? pedido.cliente 
                      : `${pedido.cliente?.nombre || ''} ${pedido.cliente?.apellido || ''}`.trim()}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {pedido.productos?.length || 0} items - {formatCurrency(pedido.total || 0)}
                  </div>
                </div>
              ))}
            </div>

            {selectedPedido && (
              <div>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '16px'
                }}>
                  Seleccionar Fecha de Entrega
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '16px',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <input
                    type="date"
                    min={minDate}
                    value={selectedDate || ''}
                    onChange={(e) => onDateSelect(e.target.value)}
                    style={{
                      padding: '12px 16px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}
                  />
                  
                  <div style={{
                    padding: '12px 16px',
                    background: 'var(--bg-section)',
                    borderRadius: '8px',
                    minWidth: '200px'
                  }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      Pedido: #{selectedPedido.id}
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {formatCurrency(selectedPedido.total || 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-color)'
            }}>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={!selectedPedido || !selectedDate}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: selectedPedido && selectedDate ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                  color: 'white',
                  cursor: selectedPedido && selectedDate ? 'pointer' : 'not-allowed'
                }}
              >
                Confirmar Asignación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}