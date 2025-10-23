import Layout from '../components/Layout'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency, isAdminLogged } from '../utils/catalogUtils'

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
  // Estados principales
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

  // Estados de administrador
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Efecto de verificación de permisos
  useEffect(() => {
    const checkAdminAccess = () => {
      const adminStatus = isAdminLogged()
      setIsAdmin(adminStatus)
      setLoading(false)

      if (!adminStatus) {
        setTimeout(() => {
          window.location.href = '/home'
        }, 3000)
      }
    }

    checkAdminAccess()
  }, [])

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

  // Indexación por fecha para pedidos internos
  const internosByDate = useMemo(() => {
    const map = Object.create(null)
    try {
      (pedidos || []).forEach(p => {
        if (p.asignadoAlCalendario && p.fechaAsignadaCalendario) {
          const dateStr = String(p.fechaAsignadaCalendario)
          if (!map[dateStr]) map[dateStr] = []
          map[dateStr].push({ ...p, tipo: 'interno' })
        }
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
        
        if (p.fechaProduccionCalendario) {
          const dateStr = String(p.fechaProduccionCalendario)
          if (!map[dateStr]) map[dateStr] = []
          map[dateStr].push({ ...p, tipo: 'produccion' })
        }
        
        if (p.fechaEntregaCalendario) {
          const dateStr = String(p.fechaEntregaCalendario)
          if (!map[dateStr]) map[dateStr] = []
          map[dateStr].push({ ...p, tipo: 'entrega' })
        }
      })
    } catch (e) { /* noop */ }
    return map
  }, [catalogo])

  // Obtener pedidos de catálogo del día
  const getPedidosCatalogoDelDia = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0]
    return catalogoByDate[dateStr] || []
  }, [catalogoByDate])

  // Obtener pedidos internos del día
  const getPedidosInternosDelDia = useCallback((date) => {
    const dateStr = date.toISOString().split('T')[0]
    return internosByDate[dateStr] || []
  }, [internosByDate])

  // Calcular estadísticas del mes
  const calculateMonthStats = useCallback(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const calcularTiempoTotalPedido = (pedidoCatalogo) => {
      try {
        let tiempoTotal = 0
        if (pedidoCatalogo.productos && pedidoCatalogo.productos.length > 0) {
          tiempoTotal = pedidoCatalogo.productos.reduce((sum, prod) => {
            const productData = products.find(p => String(p.id) === String(prod.productId || prod.id))
            const tiempoUnitario = productData?.tiempoUnitario || prod.tiempoUnitario || '00:00:00'
            const qty = Number(prod.cantidad) || 1
            const minutos = timeToMinutes(tiempoUnitario) * qty
            return sum + minutos
          }, 0)
        }
        return tiempoTotal
      } catch (e) {
        return 0
      }
    }
    
    const monthPedidosInternos = (pedidos || []).filter(pedido => {
      const f = pedido.fechaEntrega || pedido.fecha
      if (!f) return false
      const d = new Date(`${f}T00:00:00`)
      return d.getFullYear() === year && d.getMonth() === month
    })

    const monthPedidosCatalogo = (catalogo || []).filter(pedido => {
      if (!pedido.asignadoAlCalendario || pedido.estado === 'entregado' || !pedido.fechaProduccionCalendario) return false
      const d = new Date(`${pedido.fechaProduccionCalendario}T00:00:00`)
      return d.getFullYear() === year && d.getMonth() === month
    })

    const totalPedidos = monthPedidosInternos.length + monthPedidosCatalogo.length
    let totalTiempo = 0
    let totalValor = 0

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

    monthPedidosCatalogo.forEach(pedido => {
      const tiempoPedido = calcularTiempoTotalPedido(pedido)
      totalTiempo += tiempoPedido
      totalValor += Number(pedido.total) || 0
    })

    setMonthStats({ totalPedidos, totalTiempo, totalValor })
  }, [currentDate, pedidos, catalogo, products])

  // Obtener días del mes
  const getDaysInMonth = useCallback(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() === 0 ? 7 : firstDay.getDay()

    const days = []
    
    for (let i = startingDay - 1; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i)
      days.push({ date: prevDate, isCurrentMonth: false })
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateOfMonth = new Date(year, month, day)
      days.push({ date: currentDateOfMonth, isCurrentMonth: true })
    }
    
    const totalCells = 42
    const remaining = totalCells - days.length
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month + 1, day)
      days.push({ date: nextDate, isCurrentMonth: false })
    }
    
    return days
  }, [currentDate])

  const days = useMemo(() => getDaysInMonth(), [getDaysInMonth])
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  // Efectos
  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const handler = (e) => {
      try {
        loadData()
      } catch (err) {
        console.error('Error manejando evento pedidosCatalogo:updated', err)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('pedidosCatalogo:updated', handler)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pedidosCatalogo:updated', handler)
      }
    }
  }, [loadData])

  useEffect(() => {
    calculateMonthStats()
  }, [calculateMonthStats])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showDayModal) {
          setShowDayModal(false)
        } else if (showCreateInternalModal) {
          setShowCreateInternalModal(false)
        }
      }
    }

    if (showDayModal || showCreateInternalModal) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDayModal, showCreateInternalModal])

  // Navegación del calendario
  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  // Obtener nombre del mes
  const getMonthName = () => {
    return currentDate.toLocaleDateString('es-ES', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  // Crear pedido interno
  const createInternalOrder = async (orderData) => {
    try {
      const newOrder = {
        id: Date.now(),
        ...orderData,
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        asignadoAlCalendario: true,
        fechaAsignadaCalendario: orderData.fechaEntrega
      }

      const updatedPedidos = [...pedidos, newOrder]
      setPedidos(updatedPedidos)
      localStorage.setItem('pedidos', JSON.stringify(updatedPedidos))
      
      setShowCreateInternalModal(false)
      loadData()
    } catch (error) {
      console.error('Error creando pedido interno:', error)
      alert('Error al crear el pedido interno')
    }
  }

  // Renders condicionales
  if (loading) {
    return (
      <Layout title="Calendario - Sistema KOND">
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px',
            width: '100%'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
            <h2 style={{
              color: 'var(--text-primary)',
              marginBottom: '16px'
            }}>
              Verificando permisos...
            </h2>
            <p style={{
              color: 'var(--text-secondary)'
            }}>
              Verificando acceso administrativo
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!isAdmin) {
    return (
      <Layout title="Acceso Denegado - Sistema KOND">
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px',
            width: '100%'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
            <h2 style={{
              color: 'var(--text-primary)',
              marginBottom: '16px'
            }}>
              Acceso Denegado
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '24px'
            }}>
              Esta página es exclusiva para administradores del sistema.
            </p>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              Serás redirigido automáticamente en unos segundos...
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  // Render principal del calendario
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
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => setShowCreateInternalModal(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ➕ Nuevo Pedido Interno
            </button>
          </div>
        </div>

        {/* Estadísticas del mes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              marginBottom: '4px'
            }}>
              {monthStats.totalPedidos}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}>
              Pedidos en {getMonthName()}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--accent-secondary)',
              marginBottom: '4px'
            }}>
              {formatTime(monthStats.totalTiempo)}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}>
              Tiempo total estimado
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--success-color)',
              marginBottom: '4px'
            }}>
              {formatCurrency(monthStats.totalValor)}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}>
              Valor total estimado
            </div>
          </div>
        </div>

        {/* Navegación del calendario */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <button
            onClick={() => navigateMonth(-1)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ← Anterior
          </button>

          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            textTransform: 'capitalize'
          }}>
            {getMonthName()}
          </h2>

          <button
            onClick={() => navigateMonth(1)}
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            Siguiente →
          </button>
        </div>

        {/* Grid del calendario */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '1px',
          backgroundColor: 'var(--border-color)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          {/* Encabezados de días */}
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
            <div
              key={day}
              style={{
                padding: '8px 4px',
                backgroundColor: 'var(--bg-secondary)',
                textAlign: 'center',
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontSize: '0.8rem'
              }}
            >
              {day}
            </div>
          ))}

          {/* Días del calendario */}
          {days.map((dayObj, index) => {
            const dateStr = dayObj.date.toISOString().split('T')[0]
            const isToday = dateStr === todayStr
            const pedidosInternos = getPedidosInternosDelDia(dayObj.date)
            const pedidosCatalogo = getPedidosCatalogoDelDia(dayObj.date)
            const totalPedidos = pedidosInternos.length + pedidosCatalogo.length

            return (
              <div
                key={index}
                onClick={() => {
                  if (dayObj.isCurrentMonth && totalPedidos > 0) {
                    setSelectedDate(dayObj.date)
                    setShowDayModal(true)
                  }
                }}
                style={{
                  minHeight: '90px',
                  padding: '6px',
                  backgroundColor: dayObj.isCurrentMonth ? 'var(--bg-card)' : 'var(--bg-tertiary)',
                  border: isToday ? '2px solid var(--accent-blue)' : 'none',
                  cursor: dayObj.isCurrentMonth && totalPedidos > 0 ? 'pointer' : 'default',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px'
                }}
              >
                <div style={{
                  fontWeight: isToday ? 700 : dayObj.isCurrentMonth ? 600 : 400,
                  color: isToday ? 'var(--accent-blue)' : dayObj.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.8rem'
                }}>
                  {dayObj.date.getDate()}
                </div>

                {/* Indicadores de pedidos */}
                {pedidosInternos.length > 0 && (
                  <div style={{
                    fontSize: '0.65rem',
                    padding: '1px 4px',
                    backgroundColor: 'var(--accent-blue)',
                    color: 'white',
                    borderRadius: '10px',
                    textAlign: 'center',
                    marginBottom: '1px'
                  }}>
                    🏭 {pedidosInternos.length} Interno{pedidosInternos.length > 1 ? 's' : ''}
                  </div>
                )}

                {/* Separar pedidos de catálogo por tipo */}
                {(() => {
                  const pedidosProduccion = pedidosCatalogo.filter(p => p.tipo === 'produccion')
                  const pedidosEntrega = pedidosCatalogo.filter(p => p.tipo === 'entrega')
                  
                  return (
                    <>
                      {pedidosProduccion.length > 0 && (
                        <div style={{
                          fontSize: '0.65rem',
                          padding: '1px 4px',
                          backgroundColor: '#FF6B35',
                          color: 'white',
                          borderRadius: '10px',
                          textAlign: 'center',
                          marginBottom: '1px'
                        }}>
                          🏭 {pedidosProduccion.length} Producción
                        </div>
                      )}
                      
                      {pedidosEntrega.length > 0 && (
                        <div style={{
                          fontSize: '0.65rem',
                          padding: '1px 4px',
                          backgroundColor: '#28A745',
                          color: 'white',
                          borderRadius: '10px',
                          textAlign: 'center',
                          marginBottom: '1px'
                        }}>
                          📦 {pedidosEntrega.length} Entrega{pedidosEntrega.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de día */}
      {showDayModal && selectedDate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Pedidos del {selectedDate.toLocaleDateString('es-ES')}
              </h3>
              <button
                onClick={() => setShowDayModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Pedidos internos */}
              {getPedidosInternosDelDia(selectedDate).map(pedido => {
                // Calcular tiempo total de producción
                let tiempoTotalMinutos = 0
                let costoTotal = 0
                let cantidadTotal = 0

                if (pedido.productos && Array.isArray(pedido.productos)) {
                  pedido.productos.forEach(producto => {
                    const prod = products?.find(p => p.id === producto.id)
                    if (prod && prod.tiempoUnitario) {
                      const tiempoUnitarioMin = prod.tiempoUnitario ?
                        (prod.tiempoUnitario.split(':').reduce((acc, time, i) => acc + parseInt(time) * [60, 1, 1/60][i], 0)) : 0
                      tiempoTotalMinutos += tiempoUnitarioMin * (producto.cantidad || 0)
                    }
                    costoTotal += (producto.precioUnitario || 0) * (producto.cantidad || 0)
                    cantidadTotal += producto.cantidad || 0
                  })
                }

                const tiempoTotalStr = tiempoTotalMinutos > 0 ?
                  `${Math.floor(tiempoTotalMinutos / 60)}:${String(Math.floor(tiempoTotalMinutos % 60)).padStart(2,'0')}:00` :
                  '00:00:00'

                // Función para obtener emoji de estado
                const getStatusEmoji = (estado) => {
                  switch (estado) {
                    case 'completado': return '✅'
                    case 'en_proceso': return '🔧'
                    case 'pendiente': return '⏳'
                    default: return '📋'
                  }
                }

                // Función para obtener label de estado
                const getStatusLabel = (estado) => {
                  switch (estado) {
                    case 'completado': return 'Completado'
                    case 'en_proceso': return 'En Proceso'
                    case 'pendiente': return 'Pendiente'
                    default: return 'Sin estado'
                  }
                }

                return (
                  <div
                    key={`interno-${pedido.id}`}
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      borderLeft: '4px solid var(--accent-blue)',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* Header con ID y fecha */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          fontSize: '1.1rem',
                          marginBottom: '4px'
                        }}>
                          🏭 Pedido Interno #{pedido.id}
                        </div>
                        <div style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.85rem'
                        }}>
                          📅 Creado: {pedido.fecha ? new Date(pedido.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'var(--accent-blue)'
                      }}>
                        {formatCurrency(costoTotal)}
                      </div>
                    </div>

                    {/* Información del cliente */}
                    <div style={{
                      marginBottom: '12px',
                      padding: '12px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '8px'
                      }}>
                        👤 Cliente
                      </div>
                      <div style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem'
                      }}>
                        {typeof pedido.cliente === 'string' ? pedido.cliente : (pedido.cliente?.nombre || 'No especificado')}
                      </div>
                    </div>

                    {/* Estado y badges */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginBottom: '12px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: pedido.estado === 'completado' ? '#28a745' :
                                       pedido.estado === 'en_proceso' ? '#ffc107' : '#6c757d',
                        color: 'white',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {getStatusEmoji(pedido.estado)} {getStatusLabel(pedido.estado)}
                      </span>
                    </div>

                    {/* Información de productos y tiempo */}
                    {pedido.productos && pedido.productos.length > 0 && (
                      <div style={{
                        marginBottom: '12px',
                        padding: '12px',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '8px'
                      }}>
                        <div style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginBottom: '8px'
                        }}>
                          � Productos ({pedido.productos.length})
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          <div style={{
                            padding: '8px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)'
                          }}>
                            🔢 Cantidad total: {cantidadTotal} unidades
                          </div>
                          <div style={{
                            padding: '8px',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)'
                          }}>
                            ⏱️ Tiempo total: {tiempoTotalStr}
                          </div>
                        </div>

                        {/* Lista de productos */}
                        <div style={{
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '8px'
                        }}>
                          {pedido.productos.slice(0, 3).map((producto, index) => {
                            const prod = products?.find(p => p.id === producto.id)
                            const tiempoUnitarioMin = prod?.tiempoUnitario ?
                              (prod.tiempoUnitario.split(':').reduce((acc, time, i) => acc + parseInt(time) * [60, 1, 1/60][i], 0)) : 0
                            const tiempoProductoTotal = tiempoUnitarioMin * (producto.cantidad || 0)

                            return (
                              <div key={index} style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '4px',
                                padding: '4px 8px',
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: '4px'
                              }}>
                                • {producto.nombre || 'Producto sin nombre'} - Cant: {producto.cantidad} -
                                Tiempo: {tiempoProductoTotal > 0 ?
                                  `${Math.floor(tiempoProductoTotal / 60)}:${String(Math.floor(tiempoProductoTotal % 60)).padStart(2,'0')}` :
                                  '0:00'
                                }
                              </div>
                            )
                          })}
                          {pedido.productos.length > 3 && (
                            <div style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-secondary)',
                              fontStyle: 'italic',
                              textAlign: 'center',
                              padding: '4px'
                            }}>
                              ... y {pedido.productos.length - 3} producto{pedido.productos.length - 3 > 1 ? 's' : ''} más
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Información de fechas */}
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      flexWrap: 'wrap',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {pedido.fechaEntrega && (
                        <div>
                          📅 Entrega: {pedido.fechaEntrega}
                        </div>
                      )}
                      {pedido.fecha && (
                        <div>
                          🏭 Producción: {pedido.fecha}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Pedidos de catálogo separados por tipo */}
              {(() => {
                const pedidosProduccion = getPedidosCatalogoDelDia(selectedDate).filter(p => p.tipo === 'produccion')
                const pedidosEntrega = getPedidosCatalogoDelDia(selectedDate).filter(p => p.tipo === 'entrega')
                
                return (
                  <>
                    {/* Pedidos de Producción */}
                    {pedidosProduccion.length > 0 && (
                      <div style={{
                        marginBottom: '16px'
                      }}>
                        <h4 style={{
                          color: 'var(--text-primary)',
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          🏭 Pedidos en Producción ({pedidosProduccion.length})
                        </h4>
                        {pedidosProduccion.map(pedido => {
                          // Calcular tiempo total de producción para catálogo
                          let tiempoTotalMinutos = 0
                          let cantidadTotal = 0
                          
                          if (pedido.items && Array.isArray(pedido.items)) {
                            pedido.items.forEach(item => {
                              const prod = products?.find(p => p.id === item.idProducto)
                              if (prod && prod.tiempoUnitario) {
                                const tiempoUnitarioMin = prod.tiempoUnitario ? 
                                  (prod.tiempoUnitario.split(':').reduce((acc, time, i) => acc + parseInt(time) * [60, 1, 1/60][i], 0)) : 0
                                tiempoTotalMinutos += tiempoUnitarioMin * (item.quantity || 0)
                              }
                              cantidadTotal += item.quantity || 0
                            })
                          }
                          
                          const tiempoTotalStr = tiempoTotalMinutos > 0 ? 
                            `${Math.floor(tiempoTotalMinutos / 60)}:${String(Math.floor(tiempoTotalMinutos % 60)).padStart(2,'0')}:00` : 
                            '00:00:00'

                          return (
                            <div
                              key={`produccion-${pedido.id}`}
                              style={{
                                padding: '16px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                borderLeft: '4px solid #FF6B35',
                                marginBottom: '8px'
                              }}
                            >
                              <div style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: '8px'
                              }}>
                                🏭 Pedido Catálogo #{pedido.id}
                              </div>
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem'
                              }}>
                                Cliente: {pedido.cliente?.nombre || 'No especificado'}
                              </div>
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                marginTop: '4px'
                              }}>
                                Total: {formatCurrency(pedido.total || 0)}
                              </div>
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                marginTop: '4px',
                                fontWeight: 500
                              }}>
                                ⏱️ Tiempo de corte total: {tiempoTotalStr}
                              </div>
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                marginTop: '4px'
                              }}>
                                📦 Cantidad total de piezas: {cantidadTotal}
                              </div>
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                marginTop: '4px'
                              }}>
                                Estado: {pedido.estado || 'En proceso'}
                              </div>
                              {pedido.fechaEntregaCalendario && (
                                <div style={{
                                  color: 'var(--text-secondary)',
                                  fontSize: '0.9rem',
                                  marginTop: '4px'
                                }}>
                                  📅 Entrega programada: {new Date(pedido.fechaEntregaCalendario).toLocaleDateString('es-ES')}
                                </div>
                              )}
                              {pedido.fechaSolicitudEntrega && (
                                <div style={{
                                  color: 'var(--text-secondary)',
                                  fontSize: '0.9rem',
                                  marginTop: '4px'
                                }}>
                                  📋 Fecha solicitada: {new Date(pedido.fechaSolicitudEntrega).toLocaleDateString('es-ES')}
                                </div>
                              )}
                              {/* Lista detallada de productos del catálogo */}
                              {pedido.items && pedido.items.length > 0 && (
                                <div style={{
                                  marginTop: '8px',
                                  paddingTop: '8px',
                                  borderTop: '1px solid var(--border-color)'
                                }}>
                                  <div style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 500,
                                    marginBottom: '6px'
                                  }}>
                                    Productos a producir:
                                  </div>
                                  {pedido.items.map((item, index) => {
                                    const prod = products?.find(p => p.id === item.idProducto)
                                    const tiempoUnitarioMin = prod?.tiempoUnitario ? 
                                      (prod.tiempoUnitario.split(':').reduce((acc, time, i) => acc + parseInt(time) * [60, 1, 1/60][i], 0)) : 0
                                    const tiempoItemTotal = tiempoUnitarioMin * (item.quantity || 0)
                                    
                                    return (
                                      <div key={index} style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--text-secondary)',
                                        marginLeft: '12px',
                                        marginBottom: '2px'
                                      }}>
                                        • {item.name} - Cant: {item.quantity} - 
                                        Tiempo: {tiempoItemTotal > 0 ? 
                                          `${Math.floor(tiempoItemTotal / 60)}:${String(Math.floor(tiempoItemTotal % 60)).padStart(2,'0')}` : 
                                          '0:00'
                                        } - {formatCurrency(item.price * item.quantity)}
                                        {item.measures && (
                                          <span style={{ color: 'var(--text-tertiary)' }}> - {item.measures}</span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Pedidos de Entrega */}
                    {pedidosEntrega.length > 0 && (
                      <div style={{
                        marginBottom: '16px'
                      }}>
                        <h4 style={{
                          color: 'var(--text-primary)',
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          📦 Pedidos para Entrega ({pedidosEntrega.length})
                        </h4>
                        {pedidosEntrega.map(pedido => (
                          <div
                            key={`entrega-${pedido.id}`}
                            style={{
                              padding: '16px',
                              backgroundColor: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              borderLeft: '4px solid #28A745',
                              marginBottom: '8px'
                            }}
                          >
                            <div style={{
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              marginBottom: '8px'
                            }}>
                              � Pedido Catálogo #{pedido.id}
                            </div>
                            <div style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem'
                            }}>
                              Cliente: {pedido.cliente?.nombre || 'No especificado'}
                            </div>
                            <div style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem',
                              marginTop: '4px'
                            }}>
                              Total: {formatCurrency(pedido.total || 0)}
                            </div>
                            <div style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem',
                              marginTop: '4px'
                            }}>
                              Estado: {pedido.estado || 'Listo para entrega'}
                            </div>
                            <div style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem',
                              marginTop: '4px'
                            }}>
                              Método de pago: {pedido.metodoPago || 'No especificado'}
                            </div>
                            <div style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem',
                              marginTop: '4px'
                            }}>
                              📦 Cantidad de piezas: {pedido.items ? pedido.items.reduce((acc, item) => acc + (item.quantity || 0), 0) : 0}
                            </div>
                            <div style={{
                              color: 'var(--text-secondary)',
                              fontSize: '0.9rem',
                              marginTop: '4px'
                            }}>
                              💰 Estado de pago: {pedido.estadoPago || 'No especificado'}
                            </div>
                            {pedido.cliente?.telefono && (
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                marginTop: '4px'
                              }}>
                                📞 Teléfono: {pedido.cliente.telefono}
                              </div>
                            )}
                            {pedido.cliente?.email && (
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                marginTop: '4px'
                              }}>
                                ✉️ Email: {pedido.cliente.email}
                              </div>
                            )}
                            {pedido.cliente?.direccion && (
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                marginTop: '4px'
                              }}>
                                🏠 Dirección: {pedido.cliente.direccion}
                              </div>
                            )}
                            {pedido.fechaCreacion && (
                              <div style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.9rem',
                                marginTop: '4px'
                              }}>
                                📅 Fecha del pedido: {new Date(pedido.fechaCreacion).toLocaleDateString('es-ES')}
                              </div>
                            )}
                            {/* Lista de productos para entrega */}
                            {pedido.items && pedido.items.length > 0 && (
                              <div style={{
                                marginTop: '8px',
                                paddingTop: '8px',
                                borderTop: '1px solid var(--border-color)'
                              }}>
                                <div style={{
                                  fontSize: '0.85rem',
                                  color: 'var(--text-secondary)',
                                  fontWeight: 500,
                                  marginBottom: '6px'
                                }}>
                                  Productos a entregar:
                                </div>
                                {pedido.items.map((item, index) => (
                                  <div key={index} style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--text-secondary)',
                                    marginLeft: '12px',
                                    marginBottom: '2px'
                                  }}>
                                    • {item.name} - Cant: {item.quantity} - {formatCurrency(item.price * item.quantity)}
                                    {item.measures && (
                                      <span style={{ color: 'var(--text-tertiary)' }}> - {item.measures}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Pedido Interno */}
      {showCreateInternalModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                color: 'var(--text-primary)',
                margin: 0
              }}>
                ➕ Nuevo Pedido Interno
              </h3>
              <button
                onClick={() => setShowCreateInternalModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault()
              // Aquí irá la lógica para crear el pedido interno
              const formData = new FormData(e.target)
              const productoId = formData.get('producto')
              const cliente = formData.get('cliente')
              const fecha = formData.get('fecha')
              const estado = formData.get('estado')
              const cantidad = parseInt(formData.get('cantidad')) || 1

              if (!productoId || !cliente || !fecha) {
                alert('Por favor complete todos los campos requeridos')
                return
              }

              // Buscar el producto seleccionado
              const productoSeleccionado = products.find(p => p.id === parseInt(productoId))
              if (!productoSeleccionado) {
                alert('Producto no encontrado')
                return
              }

              // Crear el pedido interno
              const nuevoPedido = {
                id: Date.now(),
                cliente: cliente,
                fecha: fecha,
                fechaEntrega: fecha,
                estado: estado,
                productos: [{
                  id: productoSeleccionado.id,
                  nombre: productoSeleccionado.nombre,
                  cantidad: cantidad,
                  precioUnitario: productoSeleccionado.precioUnitario || 0
                }],
                tipo: 'interno'
              }

              try {
                const pedidosActuales = JSON.parse(localStorage.getItem('pedidos') || '[]')
                pedidosActuales.push(nuevoPedido)
                localStorage.setItem('pedidos', JSON.stringify(pedidosActuales))

                // Actualizar estado
                setPedidos(pedidosActuales)
                setShowCreateInternalModal(false)

                alert('Pedido interno creado exitosamente')
              } catch (error) {
                console.error('Error al crear pedido interno:', error)
                alert('Error al crear el pedido interno')
              }
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  Producto *
                </label>
                <select
                  name="producto"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                >
                  <option value="">Seleccionar producto...</option>
                  {products.map(producto => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} - {producto.categoria} - {producto.tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  Cliente *
                </label>
                <input
                  type="text"
                  name="cliente"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                  placeholder="Nombre del cliente"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  Fecha *
                </label>
                <input
                  type="date"
                  name="fecha"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  Estado
                </label>
                <select
                  name="estado"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                >
                  <option value="pendiente">⏳ Pendiente</option>
                  <option value="en_proceso">🔧 En Proceso</option>
                  <option value="completado">✅ Completado</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}>
                  Cantidad
                </label>
                <input
                  type="number"
                  name="cantidad"
                  min="1"
                  defaultValue="1"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowCreateInternalModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--accent-blue)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Crear Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  )
}