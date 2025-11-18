import PublicLayout from '../components/PublicLayout'
import UserOrderCard from '../components/UserOrderCard'
import { useOrders } from '../hooks/useCatalog'
import { getCurrentUser, createToast } from '../utils/catalogUtils'
import { getPedidosByEmail } from '../utils/supabasePedidos'
import { getAllProductos, mapProductoToFrontend } from '../utils/supabaseProductos'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

// Mapea pedido de Supabase (snake_case) a formato frontend (camelCase)
// productosBase se pasa como parámetro para incluir imágenes
const mapSupabasePedidoToFrontend = (pedidoDB, productosBase = []) => {
  if (!pedidoDB) return null
  
  return {
    id: pedidoDB.id,
    cliente: {
      nombre: pedidoDB.cliente_nombre || '',
      apellido: pedidoDB.cliente_apellido || '',
      telefono: pedidoDB.cliente_telefono || '',
      email: pedidoDB.cliente_email || '',
      direccion: pedidoDB.cliente_direccion || ''
    },
    items: (pedidoDB.items || []).map(item => {
      const producto = productosBase.find(p => p.id === item.producto_id)
      return {
        idProducto: item.producto_id,
        name: item.producto_nombre,
        nombre: item.producto_nombre,
        price: item.producto_precio,
        precioUnitario: item.producto_precio,
        precio: item.producto_precio,
        quantity: item.cantidad,
        cantidad: item.cantidad,
        subtotal: (Number(item.producto_precio || 0) * Number(item.cantidad || 1)),
        measures: item.medidas,
        medidas: item.medidas,
        imagen: producto?.imagen || null
      }
    }),
    productos: (pedidoDB.items || []).map(item => {
      const producto = productosBase.find(p => p.id === item.producto_id)
      return {
        idProducto: item.producto_id,
        name: item.producto_nombre,
        nombre: item.producto_nombre,
        price: item.producto_precio,
        precioUnitario: item.producto_precio,
        precio: item.producto_precio,
        quantity: item.cantidad,
        cantidad: item.cantidad,
        subtotal: (Number(item.producto_precio || 0) * Number(item.cantidad || 1)),
        measures: item.medidas,
        medidas: item.medidas,
        imagen: producto?.imagen || null
      }
    }),
    metodoPago: pedidoDB.metodo_pago,
    estadoPago: pedidoDB.estado_pago || 'sin_seña',
    comprobante: pedidoDB.comprobante_url,
    _comprobanteOmitted: pedidoDB.comprobante_omitido || false,
    fechaCreacion: pedidoDB.fecha_creacion,
    fechaSolicitudEntrega: pedidoDB.fecha_solicitud_entrega,
    fechaConfirmadaEntrega: pedidoDB.fecha_confirmada_entrega,
    fechaProduccion: pedidoDB.fecha_produccion,
    fechaProduccionCalendario: pedidoDB.fecha_produccion_calendario,
    fechaEntrega: pedidoDB.fecha_entrega,
    estado: pedidoDB.estado || 'pendiente',
    total: pedidoDB.total || 0,
    montoRecibido: pedidoDB.monto_recibido || 0,
    asignadoAlCalendario: pedidoDB.asignado_al_calendario || false,
    notas: pedidoDB.notas || '',
    notasAdmin: pedidoDB.notas_admin || ''
  }
}

export default function MisPedidos() {
  const router = useRouter()
  const { saveOrder } = useOrders()
  const [userOrders, setUserOrders] = useState([])
  const [currentUserState, setCurrentUserState] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [ordersPage, setOrdersPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const itemsPerPage = 4

  // Cargar pedidos del usuario actual y suscribirse a actualizaciones globales
  const loadUserOrders = async () => {
    try {
      const user = getCurrentUser()
      setCurrentUserState(user)

      if (user && user.email) {
        // console.log('📦 Cargando pedidos del usuario:', user.email)
        
        // Cargar productos desde Supabase primero, fallback a localStorage
        let productosBase = []
        const { data: productosDB, error: productosError } = await getAllProductos()
        
        if (!productosError && productosDB && productosDB.length > 0) {
          // console.log('✅ Productos cargados desde Supabase:', productosDB.length)
          productosBase = productosDB.map(mapProductoToFrontend)
        } else {
          console.log('⚠️ Cargando productos desde localStorage como fallback')
          productosBase = JSON.parse(localStorage.getItem('productosBase') || '[]')
        }
        
        // Intentar cargar pedidos desde Supabase
        const { data: pedidosDB, error } = await getPedidosByEmail(user.email)
        
        if (!error && pedidosDB && pedidosDB.length > 0) {
          // console.log('✅ Pedidos del usuario cargados desde Supabase:', pedidosDB.length)
          // Mapear de snake_case a camelCase con productos para imágenes
          const pedidosMapped = pedidosDB.map(pedidoDB => 
            mapSupabasePedidoToFrontend(pedidoDB, productosBase)
          )
          // Ordenar por fecha (más recientes primero)
          pedidosMapped.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
          setUserOrders(pedidosMapped)
        } else {
          // Fallback a localStorage
          const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
          const userOrdersFiltered = pedidosCatalogo.filter(pedido =>
            pedido.cliente && pedido.cliente.email === user.email
          )
          userOrdersFiltered.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))
          setUserOrders(userOrdersFiltered)
        }
      } else {
        setUserOrders([])
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('❌ Error cargando pedidos:', error)
      setCurrentUserState(null)
      setIsLoading(false)
      // Fallback final a localStorage
      try {
        const user = getCurrentUser()
        if (user && user.email) {
          const pedidosCatalogo = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
          const userOrdersFiltered = pedidosCatalogo.filter(pedido =>
            pedido.cliente && pedido.cliente.email === user.email
          )
          setUserOrders(userOrdersFiltered)
        }
      } catch (fallbackError) {
        console.error('❌ Error en fallback:', fallbackError)
      }
      createToast('Error al cargar los pedidos', 'error')
    }
  }

  useEffect(() => {
    loadUserOrders()

    const handlePedidosUpdated = (e) => {
      // e.detail puede contener información adicional (type, order)
      loadUserOrders()
    }

    window.addEventListener('pedidosCatalogo:updated', handlePedidosUpdated)
    return () => {
      window.removeEventListener('pedidosCatalogo:updated', handlePedidosUpdated)
    }
  }, [])

  // Paginación (memoizada para evitar recalcular en cada render)
  const totalPages = useMemo(() => Math.ceil(userOrders.length / itemsPerPage), [userOrders.length, itemsPerPage])
  const startIndex = useMemo(() => (ordersPage - 1) * itemsPerPage, [ordersPage, itemsPerPage])
  const paginatedOrders = useMemo(() => userOrders.slice(startIndex, startIndex + itemsPerPage), [userOrders, startIndex, itemsPerPage])

  // Función de paginación inteligente (memoizada)
  const getVisiblePages = useCallback(() => {
    const delta = 2
    const range = []
    const rangeWithDots = []

    for (let i = Math.max(2, ordersPage - delta); i <= Math.min(totalPages - 1, ordersPage + delta); i++) {
      range.push(i)
    }

    if (ordersPage - delta > 2) {
      rangeWithDots.push(1, '...')
    } else {
      rangeWithDots.push(1)
    }

    rangeWithDots.push(...range)

    if (ordersPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages)
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    return rangeWithDots
  }, [ordersPage, totalPages])

  // Memoizar handler de click en pedido
  const handleOrderClick = useCallback((order) => {
    setSelectedOrder(order)
  }, [])

  if (isLoading) {
    return (
      <PublicLayout title="Mis Pedidos - KOND">
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
              Cargando...
            </h2>
            <p style={{
              color: 'var(--text-secondary)'
            }}>
              Verificando tu sesión
            </p>
          </div>
        </div>
      </PublicLayout>
    )
  }

  if (!currentUserState) {
    return (
      <PublicLayout title="Mis Pedidos - KOND">
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
              Acceso requerido
            </h2>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '24px'
            }}>
              Debes iniciar sesión para ver tus pedidos
            </p>
            <Link
              href="/user"
              style={{
                background: 'var(--accent-blue)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-block'
              }}
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout title="Mis Pedidos - KOND">
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              margin: 0
            }}>
              📦 Mis Pedidos
            </h1>
            
            {/* Botones de navegación */}
            <div style={{
              display: 'flex',
              gap: '8px',
              background: 'var(--bg-section)',
              padding: '4px',
              borderRadius: '8px'
            }}>
              <button
                onClick={() => router.push('/catalog')}
                style={{
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                Catálogo
              </button>
              <button
                style={{
                  background: 'var(--accent-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Mis Pedidos
              </button>
            </div>
          </div>
        </div>

        {/* Subtítulo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.1rem',
            marginBottom: '16px'
          }}>
            Historial completo de tus compras en KOND
          </p>
        </div>

        {/* Contenido */}
        {userOrders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: 'var(--bg-section)',
            borderRadius: '16px',
            border: '2px dashed var(--border-color)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '24px' }}>📦</div>
            <h3 style={{
              color: 'var(--text-primary)',
              marginBottom: '12px',
              fontSize: '1.5rem'
            }}>
              No tienes pedidos aún
            </h3>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '32px',
              fontSize: '1.1rem'
            }}>
              ¡Explora nuestro catálogo y realiza tu primer pedido!
            </p>
            <Link
              href="/catalog"
              style={{
                background: 'var(--accent-blue)',
                color: 'white',
                padding: '14px 28px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '1.1rem',
                fontWeight: 600,
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              🛒 Ir al Catálogo
            </Link>
          </div>
        ) : (
          <>
            {/* Estadísticas rápidas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}>
              <div style={{
                background: 'var(--bg-card)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
                boxShadow: 'none'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginBottom: '8px'
                }}>📊</div>
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: 'var(--accent-blue)'
                }}>{userOrders.length}</div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem'
                }}>Total de pedidos</div>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
                boxShadow: 'none'
              }}>
                <div style={{
                  fontSize: '2rem',
                  marginBottom: '8px'
                }}></div>
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: 'var(--person-color)'
                }}>
                  {userOrders.filter(order => order.estado === 'entregado').length}
                </div>
                <div style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem'
                }}>Pedidos entregados</div>
              </div>
            </div>

            {/* Lista de pedidos */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              {paginatedOrders.map(order => (
                <UserOrderCard
                  key={order.id}
                  pedido={order}
                  onClick={() => handleOrderClick(order)}
                />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                marginTop: '32px'
              }}>
                <button
                  onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}
                  disabled={ordersPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: ordersPage === 1 ? 'var(--bg-section)' : 'var(--bg-card)',
                    color: ordersPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: ordersPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  ← Anterior
                </button>

                {getVisiblePages().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && setOrdersPage(page)}
                    disabled={page === '...'}
                    style={{
                      padding: '8px 12px',
                      border: page === ordersPage ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: page === ordersPage ? 'var(--accent-blue)' : 'var(--bg-card)',
                      color: page === ordersPage ? 'white' : page === '...' ? 'var(--text-muted)' : 'var(--text-primary)',
                      cursor: page === '...' ? 'default' : 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: page === ordersPage ? 600 : 400,
                      minWidth: '40px'
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setOrdersPage(Math.min(totalPages, ordersPage + 1))}
                  disabled={ordersPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: ordersPage === totalPages ? 'var(--bg-section)' : 'var(--bg-card)',
                    color: ordersPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: ordersPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal de detalle del pedido */}
        {selectedOrder && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedOrder(null)}
          >
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.target === e.currentTarget && setSelectedOrder(null)}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  color: 'var(--text-primary)',
                  fontSize: '1.3rem',
                  fontWeight: 700
                }}>
                  Pedido #{selectedOrder.id}
                </h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <div>
                    <span style={{
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem'
                    }}>Estado:</span>
                    <div style={{
                      color: selectedOrder.estado === 'entregado' ? 'var(--success-color)' :
                             selectedOrder.estado === 'en_preparacion' ? 'var(--warning-color)' :
                             'var(--accent-blue)',
                      fontWeight: 600
                    }}>
                      {selectedOrder.estado || 'Pendiente'}
                    </div>
                  </div>

                  <div>
                    <span style={{
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem'
                    }}>Fecha:</span>
                    <div>
                      {new Date(selectedOrder.fechaCreacion).toLocaleDateString('es-ES')}
                    </div>
                  </div>

                  <div>
                    <span style={{
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem'
                    }}>Total:</span>
                    <div style={{
                      fontWeight: 700,
                      color: 'var(--accent-secondary)',
                      fontSize: '1.1rem'
                    }}>
                      ${selectedOrder.total?.toLocaleString() || '0'}
                    </div>
                  </div>
                </div>

                {selectedOrder.productos && selectedOrder.productos.length > 0 && (
                  <div>
                    <h4 style={{
                      color: 'var(--text-primary)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      marginBottom: '12px'
                    }}>
                      Productos:
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {selectedOrder.productos.map((producto, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--bg-section)',
                          borderRadius: '8px'
                        }}>
                          <div>
                            <div style={{
                              fontWeight: 600,
                              color: 'var(--text-primary)'
                            }}>
                              {producto.nombre}
                            </div>
                            <div style={{
                              fontSize: '0.9rem',
                              color: 'var(--text-secondary)'
                            }}>
                              Cantidad: {producto.cantidad}
                            </div>
                          </div>
                          <div style={{
                            fontWeight: 600,
                            color: 'var(--accent-secondary)'
                          }}>
                            ${producto.subtotal?.toLocaleString() || '0'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  )
}