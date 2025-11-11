import Layout from '../components/Layout'
import withAdminAuth from '../components/withAdminAuth'
import { useState, useEffect } from 'react'
import { createToast } from '../utils/catalogUtils'
import { getCurrentSession, updateUserProfile } from '../utils/supabaseAuthV2'

function MiCuenta() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isProfileExpanded, setIsProfileExpanded] = useState(false) // Colapsado por defecto
  const [showPassword, setShowPassword] = useState(false)
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
  const [isLoading, setIsLoading] = useState(false)

  // Cargar usuario actual
  useEffect(() => {
    const loadUser = async () => {
      const session = await getCurrentSession()
      if (session) {
        setCurrentUser(session.user)
        // Rellenar todo el formulario con los datos disponibles en la sesión (kond-user)
        setFormData(prev => ({
          ...prev,
          email: session.user.email || prev.email,
          nombre: session.user.username || session.user.nombre || prev.nombre,
          apellido: session.user.apellido || prev.apellido,
          telefono: session.user.telefono || prev.telefono,
          direccion: session.user.direccion || prev.direccion,
          localidad: session.user.localidad || prev.localidad,
          cp: session.user.cp || prev.cp,
          provincia: session.user.provincia || prev.provincia,
          observaciones: session.user.observaciones || prev.observaciones
        }))
      }
    }
    loadUser()
  }, [])

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Actualizar perfil
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const updatedUser = {
        ...currentUser,
        ...formData
      }
      
      // 1. Guardar en Supabase (base de datos)
      if (currentUser?.id) {
        const { error: dbError } = await updateUserProfile(currentUser.id, formData)
        if (dbError) {
          console.error('Error guardando en BD:', dbError)
          createToast('Error al guardar en el servidor: ' + dbError, 'error')
          setIsLoading(false)
          return
        }
      }
      
      // 2. Guardar en las claves usadas por la app (localStorage)
      localStorage.setItem('currentUser', JSON.stringify(updatedUser))
      // La app utiliza 'kond-user' para sesiones/lectura; mantener ambas claves sincronizadas
      try { localStorage.setItem('kond-user', JSON.stringify(updatedUser)) } catch (e) { /* noop */ }
      setCurrentUser(updatedUser)
      try { window.dispatchEvent(new CustomEvent('user:updated', { detail: updatedUser })) } catch (e) { /* noop */ }
      createToast('✅ Perfil actualizado correctamente', 'success')
      
      // Cerrar el desplegable después de guardar (colapsar la sección)
      setIsProfileExpanded(false)
      
      // Reabrirlo después de 2 segundos para que el usuario vea el cambio guardado
      setTimeout(() => {
        setIsProfileExpanded(true)
      }, 2000)
    } catch (error) {
      console.error('Error al actualizar perfil:', error)
      createToast('Error al actualizar perfil', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout title="Mi Cuenta - Panel Admin">
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--accent-blue)',
              margin: 0
            }}>
              👤 Mi Cuenta
            </h1>
            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              marginTop: '8px'
            }}>
              {currentUser?.rol === 'admin' ? '👑 Administrador' : 'Usuario'} • {currentUser?.email}
            </p>
          </div>
        </div>

        {/* Tarjeta de Perfil */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          marginBottom: '24px'
        }}>
          <div 
            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
            style={{
              padding: '24px',
              background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-secondary) 100%)',
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>👤</span>
                <div>
                  <h3 style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    margin: 0
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
              <span style={{ 
                fontSize: '1.5rem',
                transition: 'transform 0.3s ease',
                transform: isProfileExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                ▼
              </span>
            </div>
          </div>

          {isProfileExpanded && (
            <div style={{ padding: '24px' }}>
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
                }}>
                  <div style={{ position: 'relative' }}>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      👤 Nombre *
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
                        transition: 'all 0.2s ease'
                      }}
                      required
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      📛 Apellido
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
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      📧 Email *
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
                        fontSize: '1rem'
                      }}
                      required
                      disabled
                    />
                  </div>

                  <div style={{ position: 'relative' }}>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      📱 Teléfono
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
                        fontSize: '1rem'
                      }}
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
                    Dirección
                  </h4>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '20px'
                }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      🏠 Dirección
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
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      🏙️ Localidad
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
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      📮 Código Postal
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
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      🗺️ Provincia
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
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      display: 'block',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '6px'
                    }}>
                      📝 Observaciones
                    </label>
                    <textarea
                      name="observaciones"
                      value={formData.observaciones}
                      onChange={handleInputChange}
                      placeholder="Notas adicionales..."
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: '2px solid var(--border-color)',
                        borderRadius: '12px',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        minHeight: '80px'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-color)'
              }}>
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
                >
                  {isLoading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(MiCuenta)
