import Layout from '../components/Layout'
import withAdminAuth from '../components/withAdminAuth'
import PedidosModal from '../components/PedidosModal'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { formatCurrency, isAdminLogged } from '../utils/catalogUtils'
import { getAllPedidosInternos, createPedidoInterno, updatePedidoInterno } from '../utils/supabasePedidosInternos'
import { getPedidosCatalogoParaCalendario } from '../utils/supabasePedidos'
import { getProductosPublicadosParaCalendario } from '../utils/supabaseProductos'
import { getAllMateriales } from '../utils/supabaseMateriales'

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

function Calendar() {
  const router = useRouter()
  // Estados principales
  const [currentDate, setCurrentDate] = useState(new Date())
  const [pedidos, setPedidos] = useState([])
  const [products, setProducts] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [materiales, setMateriales] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [showPedidosModal, setShowPedidosModal] = useState(false)
  const [pedidosForModal, setPedidosForModal] = useState([])
  const [pedidosModalTitle, setPedidosModalTitle] = useState('')
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
          router.push('/home')
        }, 3000)
      }
    }

    checkAdminAccess()
  }, [])

  // Efecto para manejar URL con parámetro date
  useEffect(() => {
    const { date } = router.query
    if (date && pedidos.length > 0 && catalogo.length > 0) {
      try {
        const [year, month, day] = date.split('-').map(Number)
        const targetDate = new Date(year, month - 1, day)
        
        // Función para obtener pedidos del día (definida inline para usar en este useEffect)
        const getPedidosDelDia = (dateObj) => {
          const dateStr = dateObj.toISOString().split('T')[0]
          const internos = pedidos.filter(p => {
            if (!p.asignadoAlCalendario) return false
            const pedidoDate = p.fechaAsignadaCalendario ? 
              new Date(p.fechaAsignadaCalendario).toISOString().split('T')[0] : 
              (p.fechaEntrega ? new Date(p.fechaEntrega).toISOString().split('T')[0] : null)
            return pedidoDate === dateStr
          })
          
          const catalogoDia = catalogo.filter(ped => {
            if (!ped.asignadoAlCalendario) return false
            const prodDate = ped.fechaProduccionCalendario ? 
              new Date(ped.fechaProduccionCalendario).toISOString().split('T')[0] : null
            const entregaDate = ped.fechaEntregaCalendario ? 
              new Date(ped.fechaEntregaCalendario).toISOString().split('T')[0] : null
            return prodDate === dateStr || entregaDate === dateStr
          })
          
          return [...internos, ...catalogoDia]
        }
        
        const combinedPedidos = getPedidosDelDia(targetDate)
        if (combinedPedidos.length > 0) {
          setSelectedDate(targetDate)
          setPedidosForModal(combinedPedidos)
          setPedidosModalTitle(`Pedidos del ${targetDate.toLocaleDateString('es-ES')}`)
          setShowPedidosModal(true)
        }
      } catch (error) {
        console.error('Error parsing date from URL:', error)
      }
    }
  }, [router.query, pedidos, catalogo])

  // Cargar datos desde Supabase
  const loadData = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    try {
      // Cargar pedidos internos desde Supabase
      const { data: pedidosData, error: pedidosError } = await getAllPedidosInternos()
      if (pedidosError) {
        console.error('Error al cargar pedidos internos:', pedidosError)
      }
      
      // Cargar productos desde Supabase (versión mapeada para calendario)
      const { data: productsData, error: productsError } = await getProductosPublicadosParaCalendario()
      if (productsError) {
        console.error('Error al cargar productos:', productsError)
      }
      
      // Cargar pedidos de catálogo desde Supabase (versión mapeada para calendario)
      const { data: catalogoData, error: catalogoError } = await getPedidosCatalogoParaCalendario()
      if (catalogoError) {
        console.error('Error al cargar pedidos catálogo:', catalogoError)
      }
      
      // Cargar materiales desde Supabase
      const { data: materialesData, error: materialesError } = await getAllMateriales()
      if (materialesError) {
        console.error('Error al cargar materiales:', materialesError)
      }
      
      setPedidos(pedidosData || [])
      setProducts(productsData || [])
      setCatalogo(catalogoData || [])
      setMateriales(materialesData || [])
    } catch (error) {
      console.error('Error loading calendar data:', error)
      setPedidos([])
      setProducts([])
      setCatalogo([])
      setMateriales([])
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
        if (showPedidosModal) {
          setShowPedidosModal(false)
          // Limpiar parámetro date de la URL
          router.push('/calendar', undefined, { shallow: true })
        } else if (showCreateInternalModal) {
          setShowCreateInternalModal(false)
        }
      }
    }

    if (showPedidosModal || showCreateInternalModal) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showPedidosModal, showCreateInternalModal, router])

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
        ...orderData,
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        asignadoAlCalendario: true,
        fechaAsignadaCalendario: orderData.fechaEntrega
      }

      // Guardar en Supabase
      const { data: createdOrder, error } = await createPedidoInterno(newOrder)
      
      if (error) {
        console.error('Error al crear pedido interno:', error)
        alert('Error al crear el pedido: ' + error)
        return
      }

      // Actualizar estado local
      const updatedPedidos = [...pedidos, createdOrder]
      setPedidos(updatedPedidos)
      
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
            <p style={{ color: 'var(--text-secondary)' }}>
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

  // Función común para renderizar tarjetas de pedidos
  const renderPedidoCard = (pedido, tipo) => {
    // Calcular información común
    let tiempoTotalMinutos = 0
    let costoTotal = 0
    let cantidadTotal = 0
    let productos = []
    let clienteInfo = ''
    let estadoInfo = ''
    let metodoPagoInfo = ''
    let estadoPagoInfo = ''
    let fechaInfo = ''
    let borderColor = 'var(--accent-blue)'
    let icon = '🏭'

    if (tipo === 'interno') {
      // Pedido interno
      borderColor = 'var(--accent-blue)'
      icon = '🏭'
      clienteInfo = typeof pedido.cliente === 'string' ? pedido.cliente : (pedido.cliente?.nombre || 'No especificado')
      estadoInfo = pedido.estado || 'pendiente'
      fechaInfo = pedido.fecha ? new Date(pedido.fecha).toLocaleDateString('es-ES') : 'Sin fecha'
      productos = pedido.productos || []

      if (productos && Array.isArray(productos)) {
        productos.forEach(producto => {
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
    } else if (tipo === 'produccion') {
      // Pedido en producción
      borderColor = '#FF6B35'
      icon = '🏭'
      clienteInfo = pedido.cliente?.nombre || 'No especificado'
      estadoInfo = pedido.estado || 'En proceso'
      metodoPagoInfo = pedido.metodoPago || 'No especificado'
      estadoPagoInfo = pedido.estadoPago || 'No especificado'
      fechaInfo = pedido.fechaProduccionCalendario ? new Date(pedido.fechaProduccionCalendario).toLocaleDateString('es-ES') : 'Sin fecha'
      productos = pedido.items || pedido.productos || []

      if (productos && Array.isArray(productos)) {
        productos.forEach(item => {
          const prod = products?.find(p => p.id === (item.idProducto || item.id))
          if (prod && prod.tiempoUnitario) {
            const tiempoUnitarioMin = prod.tiempoUnitario ?
              (prod.tiempoUnitario.split(':').reduce((acc, time, i) => acc + parseInt(time) * [60, 1, 1/60][i], 0)) : 0
            tiempoTotalMinutos += tiempoUnitarioMin * (item.quantity || item.cantidad || 0)
          }
          costoTotal += (item.price || item.precioUnitario || 0) * (item.quantity || item.cantidad || 0)
          cantidadTotal += item.quantity || item.cantidad || 0
        })
      }
    } else if (tipo === 'entrega') {
      // Pedido para entrega
      borderColor = '#28A745'
      icon = '📦'
      clienteInfo = pedido.cliente?.nombre || 'No especificado'
      estadoInfo = pedido.estado || 'Listo para entrega'
      metodoPagoInfo = pedido.metodoPago || 'No especificado'
      estadoPagoInfo = pedido.estadoPago || 'No especificado'
      fechaInfo = pedido.fechaEntregaCalendario ? new Date(pedido.fechaEntregaCalendario).toLocaleDateString('es-ES') : 'Sin fecha'
      productos = pedido.items || pedido.productos || []

      if (productos && Array.isArray(productos)) {
        productos.forEach(item => {
          costoTotal += (item.price || item.precioUnitario || 0) * (item.quantity || item.cantidad || 0)
          cantidadTotal += item.quantity || item.cantidad || 0
        })
      }
    }

    const tiempoTotalStr = tiempoTotalMinutos > 0 ?
      `${Math.floor(tiempoTotalMinutos / 60)}:${String(Math.floor(tiempoTotalMinutos % 60)).padStart(2,'0')}:00` :
      '00:00:00'

    // Función para obtener emoji de estado
    const getStatusEmoji = (estado) => {
      switch (estado) {
        case 'completado':
        case 'entregado': return '✅'
        case 'en_proceso':
        case 'en_preparacion':
        case 'confirmado': return '🔧'
        case 'pendiente': return '⏳'
        case 'listo': return '📦'
        default: return '📋'
      }
    }

    // Función para obtener label de estado
    const getStatusLabel = (estado) => {
      switch (estado) {
        case 'completado': return 'Completado'
        case 'en_proceso': return 'En Proceso'
        case 'en_preparacion': return 'En Preparación'
        case 'confirmado': return 'Confirmado'
        case 'pendiente': return 'Pendiente'
        case 'listo': return 'Listo para entrega'
        case 'entregado': return 'Entregado'
        default: return estado || 'Sin estado'
      }
    }

    return (
      <div
        key={`${tipo}-${pedido.id}`}
        style={{
          padding: '12px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          borderLeft: `4px solid ${borderColor}`,
          marginBottom: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
              {icon} {tipo === 'interno' ? 'Pedido Interno' : 'Pedido Catálogo'} #{pedido.id}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}>
              📅 {tipo === 'interno' ? 'Creado' : tipo === 'produccion' ? 'Producción' : 'Entrega'}: {fechaInfo}
            </div>
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: borderColor
          }}>
            {formatCurrency(costoTotal || pedido.total || 0)}
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
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            👤 Cliente: <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{clienteInfo}</span>
          </div>
          {tipo === 'entrega' && pedido.cliente?.telefono && (
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              marginTop: '4px'
            }}>
              📞 {pedido.cliente.telefono}
            </div>
          )}
          {tipo === 'entrega' && pedido.cliente?.email && (
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              marginTop: '2px'
            }}>
              ✉️ {pedido.cliente.email}
            </div>
          )}
        </div>

        {/* Información de productos y tiempo */}
        {productos && productos.length > 0 ? (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '8px',
              marginBottom: '8px'
            }}>
            </div>

            {/* Lista de productos */}
            <div style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '8px'
            }}>
              {productos.slice(0, 3).map((producto, index) => {
                let nombreProducto = ''
                let cantidadProducto = 0
                let medidasProducto = ''
                let tiempoProducto = 0

                if (tipo === 'interno') {
                  nombreProducto = producto.nombre || 'Producto sin nombre'
                  cantidadProducto = producto.cantidad || 0
                  const prod = products?.find(p => p.id === producto.id)
                  if (prod?.tiempoUnitario) {
                    const tiempoUnitarioMin = prod.tiempoUnitario.split(':').reduce((acc, time, i) => acc + parseInt(time) * [60, 1, 1/60][i], 0)
                    tiempoProducto = tiempoUnitarioMin * cantidadProducto
                  }
                } else {
                  // Para pedidos de catálogo, buscar el nombre desde la lista de productos si no viene en el item
                  const prod = products?.find(p => String(p.id) === String(producto.idProducto || producto.id))
                  nombreProducto = producto.name || producto.nombre || prod?.nombre || 'Producto sin nombre'
                  cantidadProducto = producto.quantity || producto.cantidad || 0
                  medidasProducto = producto.measures || producto.medidas || ''
                  if (tipo === 'produccion') {
                    if (prod?.tiempoUnitario) {
                      const tiempoUnitarioMin = prod.tiempoUnitario.split(':').reduce((acc, time, i) => acc + parseInt(time) * [60, 1, 1/60][i], 0)
                      tiempoProducto = tiempoUnitarioMin * cantidadProducto
                    }
                  }
                }

                // Obtener información del material
                const prod = tipo === 'interno' 
                  ? products?.find(p => p.id === producto.id)
                  : products?.find(p => String(p.id) === String(producto.idProducto || producto.id))
                
                let materialInfo = 'Sin material'
                if (prod?.materialId) {
                  const materialData = materiales.find(m => String(m.id) === String(prod.materialId))
                  materialInfo = materialData ? `Material: ${materialData.nombre} • ${materialData.tipo} • ${materialData.espesor || 'N/A'}mm` : 'Material no encontrado'
                } else if (prod?.material) {
                  // Para compatibilidad con productos antiguos que tienen material por nombre
                  const materialData = materiales.find(m => m.nombre === prod.material)
                  materialInfo = materialData ? `Material: ${materialData.nombre} • ${materialData.tipo} • ${materialData.espesor || 'N/A'}mm` : `Material: ${prod.material}`
                }

                return (
                  <div key={index} style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                    padding: '4px 8px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '4px'
                  }}>
                    • {nombreProducto}
                    {medidasProducto && ` - Medidas: ${medidasProducto}`}
                    {` - Cantidad: ${cantidadProducto}`}
                    {tiempoProducto > 0 && ` - Tiempo: ${Math.floor(tiempoProducto / 60)}:${String(Math.floor(tiempoProducto % 60)).padStart(2,'0')}`}
                    {tipo !== 'interno' && ` - ${materialInfo}`}
                  </div>
                )
              })}
              {productos.length > 3 && (
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '4px'
                }}>
                  ... y {productos.length - 3} producto{productos.length - 3 > 1 ? 's' : ''} más
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '8px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }}>
            📦 No hay productos en este pedido
          </div>
        )}

        {/* Información adicional específica por tipo */}
        {tipo === 'entrega' && pedido.cliente?.direccion && (
          <div style={{
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            🏠 Dirección: {pedido.cliente.direccion}
          </div>
        )}

        {tipo === 'entrega' && pedido.fechaCreacion && (
          <div style={{
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            📅 Fecha del pedido: {new Date(pedido.fechaCreacion).toLocaleDateString('es-ES')}
          </div>
        )}

        {tipo === 'produccion' && pedido.fechaSolicitudEntrega && (
          <div style={{
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)'
          }}>
            📋 Fecha solicitada: {new Date(pedido.fechaSolicitudEntrega).toLocaleDateString('es-ES')}
          </div>
        )}

        {/* Información de fechas para pedidos internos */}
        {tipo === 'interno' && (
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginTop: '8px'
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
        )}

        {/* Información adicional para producción */}
        {tipo === 'produccion' && (
          <div style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '8px'
          }}>
            <div style={{
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '8px',
              fontSize: '0.9rem'
            }}>
              📊 Detalles de Producción
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{
                padding: '6px 8px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px'
              }}>
                ⏱️ Tiempo de corte total: {tiempoTotalStr}
              </div>
              {pedido.fechaProduccionCalendario && (
                <div style={{
                  padding: '6px 8px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '4px'
                }}>
                  📅 Fecha programada: {new Date(pedido.fechaProduccionCalendario).toLocaleDateString('es-ES')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Información adicional para entrega */}
        {tipo === 'entrega' && (
          <div style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '8px'
          }}>
            <div style={{
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: '8px',
              fontSize: '0.9rem'
            }}>
              📦 Detalles de Entrega
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '8px',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <div style={{
                padding: '6px 8px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '4px'
              }}>
                📦 Cantidad de piezas: {cantidadTotal}
              </div>
              {pedido.fechaEntregaCalendario && (
                <div style={{
                  padding: '6px 8px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '4px'
                }}>
                  📅 Fecha programada: {new Date(pedido.fechaEntregaCalendario).toLocaleDateString('es-ES')}
                </div>
              )}
              {pedido.total && (
                <div style={{
                  padding: '6px 8px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '4px'
                }}>
                  💰 Total: {formatCurrency(pedido.total)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
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
            <button
              onClick={() => {
                setSelectedDate(null)
                setPedidosForModal(catalogo || [])
                setPedidosModalTitle('Todos los pedidos de catálogo')
                setShowPedidosModal(true)
                // No agregar parámetro date ya que es vista general
                router.push('/calendar', undefined, { shallow: true })
              }}
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📦 Ver Pedidos
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
              color: 'var(--text-secondary)',
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
              color: 'var(--text-secondary)',
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

            // Detectar si hay pedidos marcados como 'listo' (producidos y listos)
            // (Se manejará per-pedido: mostramos check dentro de la tarjeta producida)

            // ya no marcamos toda la celda en rojo; manejaremos iconos por pedido específico

            return (
              <div
                key={index}
                onClick={() => {
                        if (totalPedidos > 0) {
                          const internos = getPedidosInternosDelDia(dayObj.date) || []
                          const catalogoDia = getPedidosCatalogoDelDia(dayObj.date) || []
                          const combined = [...internos, ...catalogoDia]
                          const dateStr = dayObj.date.toISOString().split('T')[0]
                          setSelectedDate(dayObj.date)
                          setPedidosForModal(combined)
                          setPedidosModalTitle(`Pedidos del ${dayObj.date.toLocaleDateString('es-ES')}`)
                          setShowPedidosModal(true)
                          // Actualizar URL con el parámetro date
                          router.push(`/calendar?date=${dateStr}`, undefined, { shallow: true })
                        }
                      }}
                style={{
                  minHeight: '90px',
                  padding: '6px',
                  backgroundColor: dayObj.isCurrentMonth ? 'var(--bg-card)' : 'var(--bg-tertiary)',
                  border: isToday ? '2px solid var(--accent-blue)' : 'none',
                  cursor: totalPedidos > 0 ? 'pointer' : 'default',
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

                {/* Los checks se muestran dentro de la tarjeta específica de cada pedido producido */}

                {/* Indicadores de pedidos */}
                {pedidosInternos.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                    {/* mostrar chips por pedidos internos con fecha de entrega/ asignada y su estado */}
                    {pedidosInternos.filter(pi => pi.fechaEntrega || pi.fechaAsignadaCalendario || pi.fecha).slice(0, 3).map(pi => {
                      const pedDate = pi.fechaEntrega || pi.fechaAsignadaCalendario || pi.fecha
                      const pedDateStr = pedDate ? String(pedDate) : ''
                      const pedIso = pedDateStr && pedDateStr.indexOf('T') !== -1 ? pedDateStr.split('T')[0] : (pedDateStr.length === 10 ? pedDateStr : (new Date(pedDateStr)).toISOString().split('T')[0])
                      const isPedPast = pedIso && (pedIso < todayStr)
                      const estadoPi = ((pi.estado || pi.estadoPago || '')).toString().toLowerCase()
                      const isDelivered = estadoPi === 'entregado'
                      const isOverdue = isPedPast && !isDelivered
                      const symbol = isOverdue ? '❌' : (estadoPi === 'listo' ? '✅' : null)

                      // Determinar si este interno corresponde a una entrega (fechaEntrega) o producción (fecha)
                      const isDeliveryInterno = !!pi.fechaEntrega
                      // Etiqueta legible según estado y fecha
                      let tipoLabel = ''
                      if (estadoPi === 'entregado') {
                        tipoLabel = 'Entregado'
                      } else if (estadoPi === 'listo') {
                        // consideramos 'listo' como producido cuando aplica
                        tipoLabel = isDeliveryInterno ? 'Listo' : 'Producido'
                      } else if (isPedPast) {
                        tipoLabel = isDeliveryInterno ? 'Sin entregar' : 'Sin producir'
                      } else {
                        tipoLabel = isDeliveryInterno ? 'A entregar' : 'A producir'
                      }

                      return (
                        <div key={pi.id || pi.cliente?.telefono || Math.random()} style={{
                          display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', padding: '4px 6px', backgroundColor: 'var(--accent-blue)', color: 'white', borderRadius: '8px'
                        }}>
                          <span style={{marginRight:6}}>🏭</span>
                          <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {typeof pi.cliente === 'object' && pi.cliente?.nombre 
                              ? `${pi.cliente.nombre}${pi.cliente.apellido ? ' ' + pi.cliente.apellido : ''}` 
                              : typeof pi.cliente === 'string' ? pi.cliente : `Interno ${pi.id || ''}`}
                          </span>
                          <span style={{fontSize:10, opacity:0.95, marginLeft:6, background:'rgba(255,255,255,0.12)', padding:'2px 6px', borderRadius:8}} aria-hidden={true}>{tipoLabel}</span>
                          {symbol && <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:9,backgroundColor:isOverdue?'#ef4444':'#10b981',color:'white',fontSize:12}}>{symbol}</span>}
                        </div>
                      )
                    })}
                    {/* Indicador de más pedidos internos */}
                    {pedidosInternos.filter(pi => pi.fechaEntrega || pi.fechaAsignadaCalendario || pi.fecha).length > 3 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        padding: '4px 6px',
                        backgroundColor: 'var(--accent-blue)',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 600,
                        opacity: 0.85
                      }}>
                        +{pedidosInternos.filter(pi => pi.fechaEntrega || pi.fechaAsignadaCalendario || pi.fecha).length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Separar pedidos de catálogo por tipo */}
                {(() => {
                  const pedidosProduccion = pedidosCatalogo.filter(p => p.tipo === 'produccion')
                  const pedidosEntrega = pedidosCatalogo.filter(p => p.tipo === 'entrega')
                  
                  return (
                    <>
                      {pedidosProduccion.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                          {pedidosProduccion.slice(0, 3).map(ped => {
                            // determinar la fecha relevante del pedido (producción o entrega)
                            const pedDate = ped.fechaProduccionCalendario || ped.fechaEntregaCalendario || ped.fechaSolicitudEntrega || ped.fechaCreacion || ped.fecha
                            const pedDateStr = pedDate ? String(pedDate) : ''
                            // normalizar a YYYY-MM-DD si viene en ISO (se mantiene por compatibilidad)
                            const pedIso = pedDateStr && pedDateStr.indexOf('T') !== -1 ? pedDateStr.split('T')[0] : (pedDateStr.length === 10 ? pedDateStr : (new Date(pedDateStr)).toISOString().split('T')[0])
                            const estadoPed = ((ped.estado || '')).toString().toLowerCase()
                            const isPedPast = pedIso && (pedIso < todayStr)

                            // Símbolo solo si está listo
                            const symbol = estadoPed === 'listo' ? '✅' : null

                            // Etiqueta para pedidos de producción: A producir / Sin producir / Producido
                            let prodLabel = ''
                            if (estadoPed === 'listo') {
                              prodLabel = 'Producido'
                            } else if (isPedPast) {
                              prodLabel = 'Sin producir'
                            } else {
                              prodLabel = 'A producir'
                            }

                            return (
                              <div key={ped.id} title={`Pedido ${ped.id}`} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.65rem',
                                padding: '4px 6px',
                                backgroundColor: '#FF6B35',
                                color: 'white',
                                borderRadius: '8px',
                                textAlign: 'left'
                              }}>
                                <span style={{marginRight:6}}>🏭</span>
                                <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                  {typeof ped.cliente === 'object' && ped.cliente?.nombre 
                                    ? `${ped.cliente.nombre}${ped.cliente.apellido ? ' ' + ped.cliente.apellido : ''}` 
                                    : typeof ped.cliente === 'string' ? ped.cliente : `Pedido ${ped.id}`}
                                </span>
                                <span style={{fontSize:10, opacity:0.95, marginLeft:6, background:'rgba(255,255,255,0.12)', padding:'2px 6px', borderRadius:8}} aria-hidden={true}>{prodLabel}</span>
                                {symbol && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 18,
                                    height: 18,
                                    borderRadius: 9,
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    fontSize: 12
                                  }} aria-label={'Producido y listo'}>{symbol}</span>
                                )}
                              </div>
                            )
                          })}
                          {/* Indicador de más pedidos de producción */}
                          {pedidosProduccion.length > 3 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              padding: '4px 6px',
                              backgroundColor: '#FF6B35',
                              color: 'white',
                              borderRadius: '8px',
                              fontWeight: 600,
                              opacity: 0.85
                            }}>
                              +{pedidosProduccion.length - 3}
                            </div>
                          )}
                        </div>
                      )}

                      {pedidosEntrega.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                          {pedidosEntrega.slice(0, 3).map(pe => {
                            const pedDate = pe.fechaEntregaCalendario || pe.fechaSolicitudEntrega || pe.fechaCreacion || pe.fecha
                            const pedDateStr = pedDate ? String(pedDate) : ''
                            const pedIso = pedDateStr && pedDateStr.indexOf('T') !== -1 ? pedDateStr.split('T')[0] : (pedDateStr.length === 10 ? pedDateStr : (new Date(pedDateStr)).toISOString().split('T')[0])
                            const isPedPast = pedIso && (pedIso < todayStr)
                            const estadoPe = ((pe.estado || '')).toString().toLowerCase()
                            const isDelivered = estadoPe === 'entregado'
                            const isOverdueUndeliveredPed = isPedPast && !isDelivered
                            const symbol = isOverdueUndeliveredPed ? '❌' : (estadoPe === 'listo' ? '✅' : null)

                            // Etiqueta para pedidos de entrega: A entregar / Sin entregar / Entregado
                            let entregaLabel = ''
                            if (estadoPe === 'entregado') {
                              entregaLabel = 'Entregado'
                            } else if (isPedPast) {
                              entregaLabel = 'Sin entregar'
                            } else {
                              entregaLabel = 'A entregar'
                            }

                            return (
                              <div key={pe.id} title={`Pedido ${pe.id}`} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.65rem',
                                padding: '4px 6px',
                                backgroundColor: '#28A745',
                                color: 'white',
                                borderRadius: '8px',
                                textAlign: 'left'
                              }}>
                                <span style={{marginRight:6}}>📦</span>
                                <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                  {typeof pe.cliente === 'object' && pe.cliente?.nombre 
                                    ? `${pe.cliente.nombre}${pe.cliente.apellido ? ' ' + pe.cliente.apellido : ''}` 
                                    : typeof pe.cliente === 'string' ? pe.cliente : `Pedido ${pe.id}`}
                                </span>
                                <span style={{fontSize:10, opacity:0.95, marginLeft:6, background:'rgba(255,255,255,0.12)', padding:'2px 6px', borderRadius:8}} aria-hidden={true}>{entregaLabel}</span>
                                {symbol && (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 18,
                                    height: 18,
                                    borderRadius: 9,
                                    backgroundColor: isOverdueUndeliveredPed ? '#ef4444' : '#10b981',
                                    color: 'white',
                                    fontSize: 12
                                  }}>{symbol}</span>
                                )}
                              </div>
                            )
                          })}
                          {/* Indicador de más pedidos de entrega */}
                          {pedidosEntrega.length > 3 && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              padding: '4px 6px',
                              backgroundColor: '#28A745',
                              color: 'white',
                              borderRadius: '8px',
                              fontWeight: 600,
                              opacity: 0.85
                            }}>
                              +{pedidosEntrega.length - 3}
                            </div>
                          )}
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

      {/* PedidosModal es usado también para mostrar pedidos al hacer click en un día */}

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
                cliente: cliente,
                fecha: fecha,
                fechaEntrega: fecha,
                estado: estado,
                producto: productoSeleccionado.nombre,
                cantidad: cantidad,
                precioUnitario: productoSeleccionado.precioUnitario || 0,
                precioTotal: (productoSeleccionado.precioUnitario || 0) * cantidad,
                tiempoEstimado: productoSeleccionado.tiempoUnitario || null,
                asignadoAlCalendario: true,
                fechaAsignadaCalendario: fecha,
                tipo: 'interno'
              }

              // Guardar en Supabase
              createPedidoInterno(nuevoPedido).then(({ data, error }) => {
                if (error) {
                  console.error('Error al crear pedido interno:', error)
                  alert('Error al crear el pedido: ' + error)
                  return
                }

                // Actualizar estado local
                setPedidos([...pedidos, data])
                setShowCreateInternalModal(false)

                alert('Pedido interno creado exitosamente')
              }).catch(error => {
                console.error('Error al crear pedido interno:', error)
                alert('Error al crear el pedido interno')
              })
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

      <PedidosModal
        open={showPedidosModal}
        onClose={() => {
          setShowPedidosModal(false)
          // Limpiar parámetro date de la URL
          router.push('/calendar', undefined, { shallow: true })
        }}
        orders={pedidosForModal.length ? pedidosForModal : catalogo}
        title={pedidosModalTitle || '📦 Pedidos del Catálogo'}
      />
    </Layout>
  )
}

export default withAdminAuth(Calendar)