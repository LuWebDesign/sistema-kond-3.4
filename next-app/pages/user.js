import PublicLayout from '../components/PublicLayout'
import { useState, useEffect } from 'react'
import { getCurrentUser, createToast, formatCurrency, formatDate } from '../utils/catalogUtils'

export default function User() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [isProfileExpanded, setIsProfileExpanded] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    telefono: '',
    direccion: '',
    localidad: '',
    cp: '',
    provincia: '',
    observaciones: ''
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
          provincia: '',
          observaciones: ''
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
          provincia: '',
          observaciones: ''
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
      provincia: '',
      observaciones: ''
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
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div
                onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  padding: '20px 24px',
                  background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-secondary) 100%)',
                  color: 'white',
                  transition: 'all 0.3s ease',
                  borderBottom: isProfileExpanded ? '1px solid var(--border-color)' : 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, var(--accent-blue-dark, #2563eb) 0%, var(--accent-secondary-dark, #7c3aed) 100%)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-secondary) 100%)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>👤</span>
                  <div>
                    <h3 style={{
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      margin: 0,
                      color: 'white'
                    }}>
                      Información del Perfil
                    </h3>
                    <p style={{
                      fontSize: '0.85rem',
                      margin: '2px 0 0 0',
                      opacity: 0.9
                    }}>
                      Gestiona tus datos personales
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {!isProfileExpanded && (
                    <span style={{
                      fontSize: '0.8rem',
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontWeight: 500
                    }}>
                      Click para editar
                    </span>
                  )}
                  <span style={{
                    fontSize: '1.2rem',
                    transition: 'all 0.3s ease',
                    transform: isProfileExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    display: 'inline-block'
                  }}>
                    ▼
                  </span>
                </div>
              </div>

              {isProfileExpanded && (
                <div style={{
                  padding: '24px',
                  animation: 'slideDown 0.3s ease-out'
                }}>
                  <form onSubmit={handleUpdateProfile}>
                    {/* Sección Información Personal */}
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid var(--accent-blue)'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>👤</span>
                        <h4 style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0
                        }}>
                          Información Personal
                        </h4>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '20px',
                        marginBottom: '24px'
                      }}
                      className="profile-form-grid"
                      >
                        <div style={{ position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>👤</span>
                            Nombre *
                          </label>
                          <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '1rem',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            required
                          />
                        </div>

                        <div style={{ position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>📛</span>
                            Apellido
                          </label>
                          <input
                            type="text"
                            name="apellido"
                            value={formData.apellido}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '1rem',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                          />
                        </div>

                        <div style={{ position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>📧</span>
                            Email *
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '1rem',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                            required
                          />
                        </div>

                        <div style={{ position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>📱</span>
                            Teléfono
                          </label>
                          <input
                            type="tel"
                            name="telefono"
                            value={formData.telefono}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '1rem',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sección Dirección */}
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '20px',
                        paddingBottom: '12px',
                        borderBottom: '2px solid var(--accent-secondary)'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>🏠</span>
                        <h4 style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0
                        }}>
                          Dirección de Envío
                        </h4>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '20px',
                        marginBottom: '24px'
                      }}
                      className="profile-form-grid"
                      >
                        <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>🏠</span>
                            Dirección
                          </label>
                          <input
                            type="text"
                            name="direccion"
                            value={formData.direccion}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '1rem',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                          />
                        </div>

                        <div style={{ position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>🏙️</span>
                            Localidad
                          </label>
                          <input
                            type="text"
                            name="localidad"
                            value={formData.localidad}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '1rem',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                          />
                        </div>

                        <div style={{ position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>📮</span>
                            Código Postal
                          </label>
                          <input
                            type="text"
                            name="cp"
                            value={formData.cp}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '1rem',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                          />
                        </div>

                        <div style={{ position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>🗺️</span>
                            Provincia
                          </label>
                          <input
                            type="text"
                            name="provincia"
                            value={formData.provincia}
                            onChange={handleInputChange}
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '1rem',
                              transition: 'all 0.2s ease',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                          />
                        </div>

                        <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>📝</span>
                            Observaciones
                          </label>
                          <textarea
                            name="observaciones"
                            value={formData.observaciones}
                            onChange={handleInputChange}
                            placeholder="Ej: Llamar al timbre, dejar en conserjería, horario de entrega preferido..."
                            style={{
                              width: '100%',
                              padding: '14px 16px',
                              border: '2px solid var(--border-color)',
                              borderRadius: '12px',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '1rem',
                              fontFamily: 'inherit',
                              transition: 'all 0.2s ease',
                              outline: 'none',
                              resize: 'vertical',
                              minHeight: '80px',
                              maxHeight: '120px'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '12px',
                      paddingTop: '20px',
                      borderTop: '1px solid var(--border-color)'
                    }}>
                      <button
                        type="button"
                        onClick={() => setIsProfileExpanded(false)}
                        style={{
                          background: 'var(--bg-section)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          padding: '12px 24px',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'var(--bg-card)';
                          e.target.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'var(--bg-section)';
                          e.target.style.color = 'var(--text-secondary)';
                        }}
                      >
                        ❌ Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                          background: isLoading ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-secondary) 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 32px',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontWeight: 600,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isLoading ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          if (!isLoading) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isLoading) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                          }
                        }}
                      >
                        {isLoading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>


      </div>
    </PublicLayout>
  )
}

  // Si no está logueado, mostrar login/registro
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