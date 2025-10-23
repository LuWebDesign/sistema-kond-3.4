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
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              marginBottom: '8px'
            }}>
              {monthStats.totalPedidos}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              Pedidos en {getMonthName()}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--accent-secondary)',
              marginBottom: '8px'
            }}>
              {formatTime(monthStats.totalTiempo)}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              Tiempo total estimado
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--success-color)',
              marginBottom: '8px'
            }}>
              {formatCurrency(monthStats.totalValor)}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
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
                padding: '12px 8px',
                backgroundColor: 'var(--bg-secondary)',
                textAlign: 'center',
                fontWeight: 600,
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
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
                  minHeight: '120px',
                  padding: '8px',
                  backgroundColor: dayObj.isCurrentMonth ? 'var(--bg-card)' : 'var(--bg-tertiary)',
                  border: isToday ? '2px solid var(--accent-blue)' : 'none',
                  cursor: dayObj.isCurrentMonth && totalPedidos > 0 ? 'pointer' : 'default',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{
                  fontWeight: isToday ? 700 : dayObj.isCurrentMonth ? 600 : 400,
                  color: isToday ? 'var(--accent-blue)' : dayObj.isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.9rem'
                }}>
                  {dayObj.date.getDate()}
                </div>

                {/* Indicadores de pedidos */}
                {pedidosInternos.length > 0 && (
                  <div style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    backgroundColor: 'var(--accent-blue)',
                    color: 'white',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    {pedidosInternos.length} Interno{pedidosInternos.length > 1 ? 's' : ''}
                  </div>
                )}

                {pedidosCatalogo.length > 0 && (
                  <div style={{
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    backgroundColor: 'var(--accent-secondary)',
                    color: 'white',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    {pedidosCatalogo.length} Catálogo
                  </div>
                )}
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
              {getPedidosInternosDelDia(selectedDate).map(pedido => (
                <div
                  key={`interno-${pedido.id}`}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    borderLeft: '4px solid var(--accent-blue)'
                  }}
                >
                  <div style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '8px'
                  }}>
                    🏭 Pedido Interno #{pedido.id}
                  </div>
                  <div style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                  }}>
                    Cliente: {pedido.cliente || 'No especificado'}
                  </div>
                  {pedido.productos && (
                    <div style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      marginTop: '4px'
                    }}>
                      Productos: {pedido.productos.length} item{pedido.productos.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              ))}

              {/* Pedidos de catálogo */}
              {getPedidosCatalogoDelDia(selectedDate).map(pedido => (
                <div
                  key={`catalogo-${pedido.id}`}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    borderLeft: '4px solid var(--accent-secondary)'
                  }}
                >
                  <div style={{
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '8px'
                  }}>
                    🛒 Pedido Catálogo #{pedido.id}
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
                    Tipo: {pedido.tipo === 'produccion' ? '🏭 Producción' : '📦 Entrega'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}