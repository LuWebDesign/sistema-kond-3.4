import PublicLayout from '../components/PublicLayout'
import { useState, useEffect } from 'react'
import { getCurrentUser, createToast, formatCurrency, formatDate } from '../utils/catalogUtils'
import { useUserOrders } from '../hooks/useCatalog'

export default function User() {
  const { userOrders, isLoading: ordersLoading, loadUserOrders } = useUserOrders()
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [activeTab, setActiveTab] = useState('activas')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    localidad: '',
    cp: '',
    provincia: ''
  })
  const [avatar, setAvatar] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Cargar usuario actual
  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setCurrentUser(user)
      setFormData(prev => ({
        ...prev,
        ...user
      }))
      setAvatar(user.avatar || null)
    }
  }, [])

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Manejar login
  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Simulación de login - en producción esto sería una llamada al backend
      if (formData.email && formData.password) {
        const user = {
          id: Date.now(),
          email: formData.email,
          nombre: formData.nombre || 'Usuario',
          avatar: null,
          fechaRegistro: new Date().toISOString()
        }
        
        localStorage.setItem('currentUser', JSON.stringify(user))
        setCurrentUser(user)
        createToast('Sesión iniciada correctamente', 'success')
        
        // Reset form
        setFormData({
          email: '',
          password: '',
          nombre: '',
          apellido: '',
          telefono: '',
          direccion: '',
          localidad: '',
          cp: '',
          provincia: ''
        })
      } else {
        createToast('Por favor completa todos los campos', 'error')
      }
    } catch (error) {
      createToast('Error al iniciar sesión', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Manejar registro
  const handleRegister = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (formData.email && formData.password && formData.nombre) {
        const user = {
          id: Date.now(),
          ...formData,
          avatar: null,
          fechaRegistro: new Date().toISOString()
        }
        
        localStorage.setItem('currentUser', JSON.stringify(user))
        setCurrentUser(user)
        createToast('Usuario registrado correctamente', 'success')
        
        // Reset form
        setFormData({
          email: '',
          password: '',
          nombre: '',
          apellido: '',
          telefono: '',
          direccion: '',
          localidad: '',
          cp: '',
          provincia: ''
        })
      } else {
        createToast('Por favor completa los campos requeridos', 'error')
      }
    } catch (error) {
      createToast('Error al registrar usuario', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Actualizar perfil
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const updatedUser = {
        ...currentUser,
        ...formData,
        avatar
      }
      
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      setCurrentUser(updatedUser)
      createToast('Perfil actualizado correctamente', 'success')
    } catch (error) {
      createToast('Error al actualizar perfil', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
    setFormData({
      email: '',
      password: '',
      nombre: '',
      apellido: '',
      telefono: '',
      direccion: '',
      localidad: '',
      cp: '',
      provincia: ''
    })
    setAvatar(null)
    createToast('Sesión cerrada correctamente', 'success')
  }

  // Manejar cambio de avatar
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        createToast('El archivo debe ser menor a 2MB', 'error')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatar(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Eliminar avatar
  const handleRemoveAvatar = () => {
    setAvatar(null)
  }

  // Si el usuario está logueado, mostrar perfil
  if (currentUser) {
    return (
      <PublicLayout title="Mi Cuenta - KOND">
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--accent-blue)'
            }}>
              👤 Mi Cuenta
            </h1>
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--bg-hover)'
                e.target.style.borderColor = 'var(--accent-primary)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.borderColor = 'var(--border-color)'
              }}
            >
              🚪 Cerrar Sesión
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '300px 1fr',
            gap: '32px'
          }}>
            {/* Profile Header */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              height: 'fit-content'
            }}>
              {/* Avatar */}
              <div style={{
                position: 'relative',
                display: 'inline-block',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: avatar 
                    ? `url(${avatar}) center/cover` 
                    : 'var(--accent-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '2rem',
                  fontWeight: 700,
                  margin: '0 auto'
                }}>
                  {!avatar && (currentUser.nombre?.charAt(0)?.toUpperCase() || 'U')}
                </div>
              </div>

              <h2 style={{
                fontSize: '1.3rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                {currentUser.nombre} {currentUser.apellido || ''}
              </h2>
              
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                marginBottom: '20px'
              }}>
                {currentUser.email}
              </p>

              {/* Avatar Actions */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <label style={{
                  background: 'var(--accent-blue)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  textAlign: 'center'
                }}>
                  📷 Cambiar foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </label>
                
                {avatar && (
                  <button
                    onClick={handleRemoveAvatar}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}
                  >
                    🗑️ Eliminar foto
                  </button>
                )}
              </div>
            </div>

            {/* Profile Form */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '20px'
              }}>
                📝 Información del Perfil
              </h3>

              <form onSubmit={handleUpdateProfile}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      marginBottom: '4px'
                    }}>
                      Nombre *
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      marginBottom: '4px'
                    }}>
                      Apellido
                    </label>
                    <input
                      type="text"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleInputChange}
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

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      marginBottom: '4px'
                    }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      marginBottom: '4px'
                    }}>
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
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

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      marginBottom: '4px'
                    }}>
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleInputChange}
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

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      marginBottom: '4px'
                    }}>
                      Localidad
                    </label>
                    <input
                      type="text"
                      name="localidad"
                      value={formData.localidad}
                      onChange={handleInputChange}
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

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      marginBottom: '4px'
                    }}>
                      Código Postal
                    </label>
                    <input
                      type="text"
                      name="cp"
                      value={formData.cp}
                      onChange={handleInputChange}
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

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      marginBottom: '4px'
                    }}>
                      Provincia
                    </label>
                    <input
                      type="text"
                      name="provincia"
                      value={formData.provincia}
                      onChange={handleInputChange}
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
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    background: isLoading ? 'var(--text-muted)' : 'var(--accent-secondary)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isLoading ? '⏳ Actualizando...' : '💾 Guardar Cambios'}
                </button>
              </form>
            </div>
          </div>

          {/* Sección de Mis Compras */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            marginTop: '32px'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '24px'
            }}>
              🛒 Mis Compras
            </h2>

            {/* Pestañas */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '16px'
            }}>
              <button
                onClick={() => setActiveTab('activas')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: activeTab === 'activas' ? 'var(--accent-secondary)' : 'transparent',
                  color: activeTab === 'activas' ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                <span>⏳</span>
                <span>Pedidos Pendientes</span>
                <span style={{
                  background: activeTab === 'activas' ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                  color: activeTab === 'activas' ? 'white' : 'var(--text-primary)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {userOrders.activas.length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('entregadas')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: activeTab === 'entregadas' ? 'var(--accent-secondary)' : 'transparent',
                  color: activeTab === 'entregadas' ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                <span>🎉</span>
                <span>Pedidos Entregados</span>
                <span style={{
                  background: activeTab === 'entregadas' ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)',
                  color: activeTab === 'entregadas' ? 'white' : 'var(--text-primary)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {userOrders.entregadas.length}
                </span>
              </button>
            </div>

            {/* Contenido de las pestañas */}
            {ordersLoading ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                <p>Cargando tus pedidos...</p>
              </div>
            ) : (
              <div>
                {activeTab === 'activas' && (
                  <div>
                    {userOrders.activas.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--text-secondary)'
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
                        <h3 style={{ marginBottom: '8px' }}>No hay pedidos pendientes</h3>
                        <p>Cuando realices pedidos aparecerán aquí</p>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        {userOrders.activas.map(order => (
                          <OrderCard key={order.id} order={order} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'entregadas' && (
                  <div>
                    {userOrders.entregadas.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--text-secondary)'
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
                        <h3 style={{ marginBottom: '8px' }}>No hay pedidos entregados</h3>
                        <p>Los pedidos completados aparecerán aquí</p>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        {userOrders.entregadas.map(order => (
                          <OrderCard key={order.id} order={order} isDelivered />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </PublicLayout>
  )
}

// Componente para mostrar una tarjeta de pedido
function OrderCard({ order, isDelivered = false }) {
  const getStatusEmoji = (status) => {
    const emojis = {
      'pendiente': '⏳',
      'confirmado': '✅',
      'en_preparacion': '🔧',
      'listo': '📦',
      'entregado': '🎉',
      'cancelado': '❌'
    }
    return emojis[status] || '📋'
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'sin_seña': return '#e74c3c'
      case 'seña_pagada': return '#f39c12'
      case 'pagado': return '#27ae60'
      default: return '#95a5a6'
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      'pendiente': 'Pendiente',
      'confirmado': 'Confirmado',
      'en_preparacion': 'En Preparación',
      'listo': 'Listo para entrega',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado'
    }
    return labels[status] || status
  }

  const getPaymentLabel = (status) => {
    const labels = {
      'sin_seña': 'Sin seña',
      'seña_pagada': 'Seña pagada',
      'pagado': 'Pagado total'
    }
    return labels[status] || status
  }

  return (
    <div style={{
      background: 'var(--bg-section)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '20px',
      opacity: isDelivered ? 0.8 : 1
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: '4px'
          }}>
            {getStatusEmoji(order.estado)} Pedido #{order.id}
          </div>
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            marginBottom: '8px'
          }}>
            {formatDate(order.fechaCreacion)}
          </div>
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <span style={{
              padding: '4px 8px',
              background: 'var(--accent-blue)',
              color: 'white',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 500
            }}>
              {getStatusLabel(order.estado)}
            </span>
            <span style={{
              padding: '4px 8px',
              background: getPaymentStatusColor(order.estadoPago),
              color: 'white',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 500
            }}>
              {getPaymentLabel(order.estadoPago)}
            </span>
          </div>
        </div>

        <div style={{
          textAlign: 'right'
        }}>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: 'var(--accent-secondary)'
          }}>
            {formatCurrency(order.total)}
          </div>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            {order.productos?.length || 0} productos
          </div>
        </div>
      </div>

      {/* Productos */}
      {order.productos && order.productos.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '16px'
        }}>
          <h4 style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            Productos:
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {order.productos.slice(0, 3).map((producto, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)'
              }}>
                <span>{producto.cantidad}x {producto.nombre}</span>
                <span>{formatCurrency(producto.subtotal)}</span>
              </div>
            ))}
            {order.productos.length > 3 && (
              <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic'
              }}>
                +{order.productos.length - 3} productos más...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Información de entrega */}
      {order.fechaSolicitudEntrega && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          background: 'var(--bg-card)',
          borderRadius: '6px',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          📅 Entrega solicitada: {formatDate(order.fechaSolicitudEntrega)}
        </div>
      )}
    </div>
  )
}  // Si no está logueado, mostrar login/registro
  return (
    <PublicLayout title="Iniciar Sesión - KOND">
      <div style={{
        minHeight: '80vh',
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
          maxWidth: '400px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--person-color)',
              marginBottom: '8px'
            }}>
              👤 {isLoginMode ? 'Iniciar Sesión' : 'Registrarse'}
            </h1>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem'
            }}>
              {isLoginMode 
                ? 'Accede a tu cuenta para gestionar tus pedidos'
                : 'Crea una cuenta nueva para realizar pedidos'
              }
            </p>
          </div>

          <form onSubmit={isLoginMode ? handleLogin : handleRegister}>
            {!isLoginMode && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  marginBottom: '4px'
                }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                  required={!isLoginMode}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '4px'
              }}>
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '4px'
              }}>
                Contraseña *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: isLoading ? 'var(--text-muted)' : 'var(--accent-secondary)',
                color: 'white',
                border: 'none',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {isLoading 
                ? '⏳ Procesando...' 
                : (isLoginMode ? '🚀 Iniciar Sesión' : '📝 Registrarse')
              }
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setIsLoginMode(!isLoginMode)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  textDecoration: 'underline'
                }}
              >
                {isLoginMode 
                  ? '¿No tienes cuenta? Regístrate aquí'
                  : '¿Ya tienes cuenta? Inicia sesión aquí'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </PublicLayout>
  )
}