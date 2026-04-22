import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect } from 'react'
import { createToast } from '../../utils/catalogUtils'
import { getCurrentSession, updateUserProfile } from '../../utils/supabaseAuthV2'
import { UserProfileForm } from '../../components/UserProfileForm'

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
      // NOTA: no reabrir automáticamente — el admin debe abrirlo manualmente si lo desea
      setIsProfileExpanded(false)
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
              <UserProfileForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleUpdateProfile}
                onCancel={() => setIsProfileExpanded(false)}
                isSaving={isLoading}
                layoutType="admin"
                currentUser={currentUser}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(MiCuenta)
