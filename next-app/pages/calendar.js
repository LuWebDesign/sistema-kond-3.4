import Layout from '../components/Layout'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency } from '../utils/catalogUtils'

// Util de tiempo a nivel de módulo para uso en todos los componentes
const timeToMinutes = (timeStr = '00:00:00') => {
  const [h = 0, m = 0, s = 0] = (timeStr || '00:00:00').split(':').map(Number)
  return (Number(h) * 60) + Number(m) + (Number(s) / 60)
}

// Formatear tiempo a nivel de módulo
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  return `${hours}h ${mins}m`
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pedidos, setPedidos] = useState([])
  const [products, setProducts] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [showCreateInternalModal, setShowCreateInternalModal] = useState(false)
  const [monthStats, setMonthStats] = useState({
    totalPedidos: 0,
    totalTiempo: 0,
    totalValor: 0
  })

  // Indexación por fecha para pedidos internos
  const internosByDate = useMemo(() => {
    const map = Object.create(null)
    try {
      (pedidos || []).forEach(p => {
        // Pedidos asignados al calendario
        if (p.asignadoAlCalendario && p.fechaAsignadaCalendario) {
          const dateStr = String(p.fechaAsignadaCalendario)
          if (!map[dateStr]) map[dateStr] = []
          map[dateStr].push({ ...p, tipo: 'interno' })
        }
        // Pedidos con fechaEntrega (legacy)
        else if (p.fechaEntrega || p.fecha) {
          const f = p.fechaEntrega || p.fecha
          const dateStr = String(f)
          if (!map[dateStr]) map[dateStr] = []
          map[dateStr].push({ ...p, tipo: 'interno' })
        }
      })
    } catch (e) { /* noop */ }
    return map
  }, [pedidos])

  // Indexación por fecha para pedidos de catálogo asignados
  const catalogoByDate = useMemo(() => {
    const map = Object.create(null)
    try {
      (catalogo || []).forEach(p => {
        if (!p.asignadoAlCalendario || p.estado === 'entregado') return
        
        // Agregar a fecha de producción
        if (p.fechaProduccionCalendario) {
          const dateStr = String(p.fechaProduccionCalendario)
          if (!map[dateStr]) map[dateStr] = []
          map[dateStr].push({ ...p, tipo: 'produccion' })
        }
        
        // Agregar a fecha de entrega
        if (p.fechaEntregaCalendario) {
          const dateStr = String(p.fechaEntregaCalendario)
          if (!map[dateStr]) map[dateStr] = []
          map[dateStr].push({ ...p, tipo: 'entrega' })
        }
      })
    } catch (e) { /* noop */ }
    return map
  }, [catalogo])

  // Obtener pedidos de catálogo asignados a un día (producción o entrega) y no entregados
  const getPedidosCatalogoDelDia = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0]
    return catalogoByDate[dateStr] || []
  }, [catalogoByDate])

  // Cargar datos del localStorage
  const loadData = useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      const storedPedidos = localStorage.getItem('pedidos')
      const storedProducts = localStorage.getItem('productosBase')
      const storedCatalogo = localStorage.getItem('pedidosCatalogo')
      
      setPedidos(storedPedidos ? JSON.parse(storedPedidos) : [])
      setProducts(storedProducts ? JSON.parse(storedProducts) : [])
      setCatalogo(storedCatalogo ? JSON.parse(storedCatalogo) : [])
    } catch (error) {
      console.error('Error loading calendar data:', error)
      setPedidos([])
      setProducts([])
      setCatalogo([])
    }
  }, [])

  // Helpers de tiempo (usamos la función a nivel de módulo)

  // Obtener pedidos internos de un día específico (por fechaEntrega)
  const getPedidosInternosDelDia = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0]
    return internosByDate[dateStr] || []
  }, [internosByDate])

  // Calcular estadísticas del mes (pedidos internos + pedidos de catálogo asignados)
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

    // Pedidos de catálogo asignados al mes (por fechaProduccionCalendario)
    const monthPedidosCatalogo = (catalogo || []).filter(pedido => {
      if (!pedido.asignadoAlCalendario || pedido.estado === 'entregado' || !pedido.fechaProduccionCalendario) return false
      const d = new Date(`${pedido.fechaProduccionCalendario}T00:00:00`)
      return d.getFullYear() === year && d.getMonth() === month
    })

    const totalPedidos = monthPedidosInternos.length + monthPedidosCatalogo.length
    let totalTiempo = 0
    let totalValor = 0

    // Calcular estadísticas de pedidos internos
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

    // Calcular estadísticas de pedidos de catálogo asignados (solo tiempo de producción)
    monthPedidosCatalogo.forEach(pedido => {
      if (Array.isArray(pedido.items) && pedido.items.length) {
        pedido.items.forEach(item => {
          const producto = products.find(p => String(p.id) === String(item.idProducto))
          if (producto) {
            const mins = timeToMinutes(producto.tiempoUnitario || '00:00:30') * (Number(item.quantity) || 1)
            totalTiempo += mins
          }
        })
        totalValor += Number(pedido.total) || 0
      }
    })

    setMonthStats({ totalPedidos, totalTiempo, totalValor })
  }, [currentDate, pedidos, catalogo, products])

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

  // Actualizar estado de pedido interno
  const handleUpdateInternalOrderStatus = (orderId, newStatus) => {
    try {
      const updatedPedidos = pedidos.map(order => 
        order.id === orderId ? { ...order, estado: newStatus } : order
      )
      
      setPedidos(updatedPedidos)
      localStorage.setItem('pedidos', JSON.stringify(updatedPedidos))
      
      // Disparar evento
      window.dispatchEvent(new CustomEvent('pedidos:updated', { 
        detail: { type: 'update-status', orderId, newStatus } 
      }))
      
      alert(`Estado del pedido actualizado a: ${newStatus}`)
      loadData()
    } catch (error) {
      console.error('Error actualizando estado:', error)
      alert('Error al actualizar estado del pedido')
    }
  }

  // Eliminar pedido interno
  const handleDeleteInternalOrder = (orderId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este pedido interno?')) return
    
    try {
      const updatedPedidos = pedidos.filter(order => order.id !== orderId)
      
      setPedidos(updatedPedidos)
      localStorage.setItem('pedidos', JSON.stringify(updatedPedidos))
      
      // Disparar evento
      window.dispatchEvent(new CustomEvent('pedidos:updated', { 
        detail: { type: 'delete', orderId } 
      }))
      
      alert('Pedido interno eliminado correctamente')
      loadData()
    } catch (error) {
      console.error('Error eliminando pedido:', error)
      alert('Error al eliminar el pedido')
    }
  }

  // Crear pedido interno
  const handleCreateInternalOrder = (orderData) => {
    try {
      const newOrder = {
        id: Date.now(),
        ...orderData,
        estado: 'confirmado',
        creadoEn: new Date().toISOString()
      }

      const updatedPedidos = [...pedidos, newOrder]
      setPedidos(updatedPedidos)
      localStorage.setItem('pedidos', JSON.stringify(updatedPedidos))
      
      // Disparar evento
      window.dispatchEvent(new CustomEvent('pedidos:updated', { 
        detail: { type: 'create', order: newOrder } 
      }))
      
      alert('Pedido interno creado correctamente')
      setShowCreateInternalModal(false)
      loadData()
    } catch (error) {
      console.error('Error creando pedido interno:', error)
      alert('Error al crear el pedido interno')
    }
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
              📅 Calendario de Pedidos Internos
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Gestión y planificación de pedidos internos de producción
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateInternalModal(true)}
            style={{
              background: 'var(--accent-green)',
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
            ➕ Crear Pedido Interno
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
            onUpdateInternalStatus={handleUpdateInternalOrderStatus}
            onDeleteInternal={handleDeleteInternalOrder}
            onClose={() => setShowDayModal(false)}
          />
        )}

        {/* Modal de Crear Pedido Interno */}
        {showCreateInternalModal && (
          <CreateInternalOrderModal
            products={products}
            onCreate={handleCreateInternalOrder}
            onClose={() => setShowCreateInternalModal(false)}
          />
        )}
      </div>
    </Layout>
  )
}

// Modal para mostrar detalles del día
function DayModal({ date, pedidosInternos = [], pedidosCatalogo = [], products, onUpdateInternalStatus, onDeleteInternal, onClose }) {
  const dateStr = date.toLocaleDateString('es-ES', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

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

        {(pedidosInternos.length > 0 || pedidosCatalogo.length > 0) ? (
          <div>
            {pedidosInternos.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '16px'
                }}>
                  📦 Pedidos Internos del Día ({pedidosInternos.length})
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pedidosInternos.map(item => (
                    <PedidoCard 
                      key={item.id}
                      pedido={item}
                      tipo="interno"
                      products={products}
                      onUpdateStatus={onUpdateInternalStatus}
                      onDelete={onDeleteInternal}
                    />
                  ))}
                </div>
              </div>
            )}

            {pedidosCatalogo.length > 0 && (
              <div>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '16px'
                }}>
                  🛒 Pedidos de Catálogo del Día ({pedidosCatalogo.length})
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pedidosCatalogo.map(item => (
                    <PedidoCard 
                      key={item.id}
                      pedido={item}
                      tipo="catalogo"
                      products={products}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pedidos Internos del Día */}
            {pedidosInternos.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '16px'
                }}>
                  🏭 Pedidos Internos del Día ({pedidosInternos.length})
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pedidosInternos.map(item => (
                    <PedidoCard 
                      key={item.id}
                      pedido={item}
                      tipo="interno"
                      products={products}
                      onUpdateStatus={onUpdateInternalStatus}
                      onDelete={onDeleteInternal}
                    />
                  ))}
                </div>
              </div>
            )}
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
function PedidoCard({ pedido, tipo = 'interno', role, products, onUpdateStatus, onDelete }) {
  let totalValue = 0
  let totalTime = 0

  // Calcular valores del pedido
  if (tipo === 'catalogo') {
    // Pedidos de catálogo tienen estructura diferente
    if (Array.isArray(pedido.items) && pedido.items.length) {
      pedido.items.forEach(item => {
        const producto = products.find(p => String(p.id) === String(item.idProducto))
        const qty = Number(item.quantity) || 1
        if (producto) {
          totalValue += (Number(producto.precioUnitario) || 0) * qty
          const minutes = timeToMinutes(producto.tiempoUnitario || '00:00:30') * qty
          totalTime += minutes
        }
      })
    }
    // Para pedidos de catálogo, usar el total calculado si no hay items detallados
    if (totalValue === 0 && pedido.total) {
      totalValue = Number(pedido.total) || 0
    }
  } else {
    // Pedidos internos
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

      {/* Botones de acción para pedidos internos */}
      {tipo === 'interno' && (onUpdateStatus || onDelete) && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          {onUpdateStatus && (
            <select
              value={pedido.estado || 'pendiente'}
              onChange={(e) => onUpdateStatus(pedido.id, e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_produccion">En Producción</option>
              <option value="completado">Completado</option>
              <option value="entregado">Entregado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(pedido.id)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                background: 'transparent',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              🗑️ Eliminar
            </button>
          )}
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

// Modal para crear pedidos internos nuevos
function CreateInternalOrderModal({ products = [], onCreate, onClose }) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    direccion: '',
    fechaEntrega: '',
    estadoPago: 'sin_seña',
    montoRecibido: 0,
    productos: [],
    notas: ''
  })

  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)

  const today = new Date()
  const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    .toISOString().split('T')[0]

  const handleAddProduct = () => {
    if (!selectedProduct || quantity <= 0) return

    const product = products.find(p => String(p.id) === String(selectedProduct))
    if (!product) return

    const newProduct = {
      productId: product.id,
      nombre: product.nombre,
      cantidad: quantity,
      precioUnitario: product.precioUnitario || 0,
      tiempoUnitario: product.tiempoUnitario || '00:00:30'
    }

    setFormData(prev => ({
      ...prev,
      productos: [...prev.productos, newProduct]
    }))

    setSelectedProduct('')
    setQuantity(1)
  }

  const handleRemoveProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index)
    }))
  }

  const calculateTotal = () => {
    return formData.productos.reduce((sum, prod) => 
      sum + (Number(prod.precioUnitario) * Number(prod.cantidad)), 0)
  }

  const handleSubmit = () => {
    if (!formData.nombre.trim() || !formData.telefono.trim() || !formData.fechaEntrega || formData.productos.length === 0) {
      alert('Completa los campos obligatorios: Nombre, Teléfono, Fecha de Entrega y al menos 1 producto')
      return
    }

    const total = calculateTotal()
    let montoRecibido = Number(formData.montoRecibido || 0)
    if (formData.estadoPago === 'pagado_total') {
      montoRecibido = total
    } else if (formData.estadoPago === 'seña_pagada' && montoRecibido === 0) {
      // Sugerir 50% por defecto si no se ingresó
      montoRecibido = Math.round(total * 0.5)
    }

    const payload = {
      cliente: {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim() || '',
        telefono: formData.telefono.trim(),
        email: formData.email.trim() || '',
        direccion: formData.direccion.trim() || ''
      },
      fechaEntrega: formData.fechaEntrega,
      productos: formData.productos,
      notas: formData.notas || '',
      estadoPago: formData.estadoPago,
      montoRecibido,
      subtotal: total,
      total
    }

    onCreate(payload)
  }

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
        maxWidth: '700px',
        width: '90%',
        maxHeight: '90vh',
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
            ➕ Crear Pedido Interno
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Datos del Cliente */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              👤 Información del Cliente
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder="Nombre *"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                style={{
                  width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px',
                  background: 'var(--bg-input)', color: 'var(--text-primary)'
                }}
              />
              <input
                type="text"
                placeholder="Apellido"
                value={formData.apellido}
                onChange={(e) => setFormData(prev => ({ ...prev, apellido: e.target.value }))}
                style={{
                  width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px',
                  background: 'var(--bg-input)', color: 'var(--text-primary)'
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <input
                type="tel"
                placeholder="Teléfono *"
                value={formData.telefono}
                onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                style={{
                  width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px',
                  background: 'var(--bg-input)', color: 'var(--text-primary)'
                }}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                style={{
                  width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px',
                  background: 'var(--bg-input)', color: 'var(--text-primary)'
                }}
              />
            </div>
            <input
              type="text"
              placeholder="Dirección"
              value={formData.direccion}
              onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
              style={{
                width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px',
                background: 'var(--bg-input)', color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Fecha de entrega */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--text-primary)'
            }}>
              Fecha de Entrega *
            </label>
            <input
              type="date"
              min={minDate}
              value={formData.fechaEntrega}
              onChange={(e) => setFormData(prev => ({ ...prev, fechaEntrega: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Agregar productos */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--text-primary)'
            }}>
              Agregar Productos *
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Seleccionar producto</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.nombre} - {formatCurrency(product.precioUnitario || 0)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={{
                  width: '80px',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  textAlign: 'center'
                }}
              />
              <button
                onClick={handleAddProduct}
                disabled={!selectedProduct}
                style={{
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: selectedProduct ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                  color: 'white',
                  cursor: selectedProduct ? 'pointer' : 'not-allowed'
                }}
              >
                ➕
              </button>
            </div>
          </div>

          {/* Estado de pago */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              💳 Pago
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <select
                value={formData.estadoPago}
                onChange={(e) => setFormData(prev => ({ ...prev, estadoPago: e.target.value }))}
                style={{
                  width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px',
                  background: 'var(--bg-input)', color: 'var(--text-primary)'
                }}
              >
                <option value="sin_seña">Sin seña</option>
                <option value="seña_pagada">Seña pagada</option>
                <option value="pagado_total">Pagado total</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Monto recibido"
                value={formData.montoRecibido}
                onChange={(e) => setFormData(prev => ({ ...prev, montoRecibido: Number(e.target.value || 0) }))}
                style={{
                  width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px',
                  background: 'var(--bg-input)', color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Lista de productos agregados */}
          {formData.productos.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>
                Productos Agregados ({formData.productos.length})
              </h4>
              <div style={{ 
                maxHeight: '200px', 
                overflow: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}>
                {formData.productos.map((prod, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderBottom: index < formData.productos.length - 1 ? '1px solid var(--border-color)' : 'none'
                  }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{prod.nombre}</span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                        × {prod.cantidad} = {formatCurrency(Number(prod.precioUnitario) * Number(prod.cantidad))}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ 
                textAlign: 'right', 
                marginTop: '8px', 
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                Total: {formatCurrency(calculateTotal())}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--text-primary)'
            }}>
              Notas (opcional)
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
              placeholder="Notas adicionales del pedido"
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Botones */}
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
              onClick={handleSubmit}
              disabled={!formData.nombre.trim() || !formData.telefono.trim() || !formData.fechaEntrega || formData.productos.length === 0}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: (formData.nombre.trim() && formData.telefono.trim() && formData.fechaEntrega && formData.productos.length > 0) 
                  ? 'var(--accent-green)' 
                  : 'var(--bg-tertiary)',
                color: 'white',
                cursor: (formData.nombre.trim() && formData.telefono.trim() && formData.fechaEntrega && formData.productos.length > 0) 
                  ? 'pointer' 
                  : 'not-allowed'
              }}
            >
              Crear Pedido Interno
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}