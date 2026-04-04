import PublicLayout from '../../components/PublicLayout'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { createToast, formatCurrency, formatDate } from '../../utils/catalogUtils'
import { loginWithEmail, getCurrentSession, loginWithGoogle, handleOAuthCallback, registerWithEmail, logoutClient } from '../../utils/supabaseAuthV2'

export default function User() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoginMode, setIsLoginMode] = useState(true)
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

  const router = useRouter()

  // Cargar usuario actual y manejar OAuth callback
  useEffect(() => {
    const loadUser = async () => {
      // Verificar si hay un callback de OAuth (puede venir en query params o hash)
      const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      const hashParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.hash.substring(1) : '')
      const hasAuthCallback = urlParams.has('code') || urlParams.has('access_token') || hashParams.has('access_token')

      if (hasAuthCallback) {
        try {
          const result = await handleOAuthCallback()
          
          if (result.error) {
            createToast('Error al procesar login con Google: ' + result.error, 'error')
          } else {
            const oauthUser = result.data?.user || result.user
            if (oauthUser) {
              createToast('¡Bienvenido! Has iniciado sesión con Google', 'success')
              
              // Guardar usuario del catálogo (cliente) en 'currentUser'
              if (typeof window !== 'undefined') {
                localStorage.setItem('currentUser', JSON.stringify(oauthUser))
              }
              
              // Redirigir al catálogo
              router.push('/catalog')
              return
            }
          }
        } catch (error) {
          console.error('Error en OAuth callback:', error)
          createToast('Error al procesar login con Google', 'error')
        }
      }

      // Cargar sesión actual de Supabase
      const session = await getCurrentSession()
      
      // IMPORTANTE: Si la sesión es de un ADMIN, ignorarla en el catálogo público
      // Los admins no deben usar la cuenta del catálogo mientras están logueados como admin
      if (session && session.user && session.user.rol !== 'admin') {
        setCurrentUser(session.user)
        // Rellenar formulario con datos de Supabase
        setFormData(prev => ({
          ...prev,
          email: session.user.email || prev.email,
          nombre: session.user.nombre || session.user.username || prev.nombre,
          apellido: session.user.apellido || prev.apellido,
          telefono: session.user.telefono || prev.telefono,
          direccion: session.user.direccion || prev.direccion,
          localidad: session.user.localidad || prev.localidad,
          cp: session.user.cp || prev.cp,
          provincia: session.user.provincia || prev.provincia,
          observaciones: session.user.observaciones || prev.observaciones
        }))
      } else {
        // Si no hay sesión Supabase o es admin, usar localStorage (currentUser - clientes del catálogo)
        try {
          const stored = localStorage.getItem('currentUser')
          if (stored) {
            const localUser = JSON.parse(stored)
            // Solo restaurar si es un comprador (no admin)
            if (localUser && localUser.rol !== 'admin' && !localUser.isAdmin) {
              setCurrentUser(localUser)
              setFormData(prev => ({
                ...prev,
                email: localUser.email || prev.email,
                nombre: localUser.nombre || localUser.username || prev.nombre,
                apellido: localUser.apellido || prev.apellido,
                telefono: localUser.telefono || prev.telefono,
                direccion: localUser.direccion || prev.direccion,
                localidad: localUser.localidad || prev.localidad,
                cp: localUser.cp || prev.cp,
                provincia: localUser.provincia || prev.provincia,
                observaciones: localUser.observaciones || prev.observaciones
              }))
            }
          }
        } catch {
          // noop
        }
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

  // Manejar login
  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log('🔐 Intentando login con:', formData.email)
      // Primero intentar login con Supabase Auth
      const result = await loginWithEmail(formData.email, formData.password)
      
      let user = result?.user
      const supabaseError = result?.error

      // No permitir que un admin se loguee como comprador
      if (user && (user.rol === 'admin' || user.rol === 'super_admin' || user.isAdmin)) {
        createToast('Esta cuenta es de administrador. Usá el panel de admin para iniciar sesión.', 'error')
        setIsLoading(false)
        return
      }

      if (supabaseError || !user) {
        createToast('Email o contraseña incorrectos', 'error')
        setIsLoading(false)
        return
      }
      
      // Guardar en localStorage (sin password) y actualizar estado
      const { password: _pw, ...safeUser } = user
      try { localStorage.setItem('currentUser', JSON.stringify(safeUser)) } catch {}
      setCurrentUser(user)
      try {
        window.dispatchEvent(new CustomEvent('user:updated', { detail: user }))
      } catch {
        // noop
      }
      createToast('Sesión iniciada correctamente', 'success')
      
      setFormData({
        email: '', password: '', nombre: '', apellido: '', telefono: '',
        direccion: '', localidad: '', cp: '', provincia: '', observaciones: ''
      })
    } catch (error) {
      console.error('Error en login:', error)
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
        if (formData.password.length < 6) {
          createToast('La contraseña debe tener al menos 6 caracteres', 'error')
          setIsLoading(false)
          return
        }

        const { password, ...profileData } = formData
        const result = await registerWithEmail(formData.email, password, profileData)

        if (result.error) {
          createToast(result.error, 'error')
          setIsLoading(false)
          return
        }

        const user = result.user

        // Guardar en localStorage (sin password)
        try { localStorage.setItem('currentUser', JSON.stringify(user)) } catch {}
        setCurrentUser(user)
        try { window.dispatchEvent(new CustomEvent('user:updated', { detail: user })) } catch { /* noop */ }

        if (result.emailConfirmationRequired) {
          createToast('Cuenta creada. Revisa tu email para confirmar la cuenta.', 'success')
        } else {
          createToast('Usuario registrado correctamente', 'success')
        }
        
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

  const handleGoogleLogin = async () => {
    setIsLoading(true)

    try {
      const result = await loginWithGoogle()
      if (result?.error) {
        createToast('No se pudo iniciar sesión con Google', 'error')
      }
    } catch (error) {
      console.error('Error en login con Google:', error)
      createToast('Error al iniciar sesión con Google', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // Cerrar sesión del cliente (Supabase Auth + localStorage)
  const handleLogout = async () => {
    await logoutClient()
    
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
    try { window.dispatchEvent(new CustomEvent('user:updated', { detail: null })) } catch (e) { /* noop */ }
    createToast('Sesión cerrada correctamente', 'success')
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

          <div className="account-grid" style={{
            display: 'grid',
            gap: '32px'
          }}>
            {/* Profile Header */}
            <div className="profile-card-left" style={{
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
                  background: 'var(--accent-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '2rem',
                  fontWeight: 700,
                  margin: '0 auto'
                }}>
                  {currentUser.nombre?.charAt(0)?.toUpperCase() || 'U'}
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

              {/* Editar perfil */}
              <button
                onClick={() => router.push('/catalog/user/perfil')}
                style={{
                  background: 'var(--accent-blue)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              >
                ✏️ Editar perfil
              </button>
            </div>
            
            {/* Account Info Card: Información de cuenta (datos de logeo) */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '16px',
              color: 'var(--text-primary)'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-blue)' }}>🔒 Información de cuenta</h3>
              <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', alignItems: 'start' }}>
                {/** Each info block is a small card for clearer two-column layout */}
                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-section)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 6 }}>Email</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700, wordBreak: 'break-all' }}>{currentUser.email}</div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-section)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 6 }}>Registrado</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{currentUser.fechaRegistro ? formatDate(currentUser.fechaRegistro) : '—'}</div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-section)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 6 }}>ID</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{currentUser.id || '—'}</div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-section)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 6 }}>Último acceso</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{currentUser.lastLogin ? formatDate(currentUser.lastLogin) : '—'}</div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-section)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 6 }}>Contraseña</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{currentUser.password ? '••••••••' : '—'}</div>
                </div>

                <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-section)', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 6 }}>Teléfono</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{currentUser.telefono || '—'}</div>
                </div>
              </div>
            </div>

            {/* Información del Perfil */}
            <div
              onClick={() => router.push('/catalog/user/perfil')}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                background: 'linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-secondary) 100%)',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.5rem' }}>✏️</span>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'white' }}>Información del Perfil</h3>
                    <p style={{ fontSize: '0.85rem', margin: '2px 0 0 0', opacity: 0.9 }}>Gestioná tus datos personales</p>
                  </div>
                </div>
                <span style={{ fontSize: '1.2rem' }}>→</span>
              </div>
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

          {/* Botón de Google Login deshabilitado - proveedor no configurado */}
          {false && isLoginMode && (
            <>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await loginWithGoogle()
                  } catch (error) {
                    console.error('Error al iniciar login con Google:', error)
                    createToast('Error al conectar con Google', 'error')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  marginBottom: '20px',
                  backgroundColor: '#4285f4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#3367d6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#4285f4'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>

              <div style={{
                margin: '16px 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
                position: 'relative'
              }}>
                <span style={{
                  background: 'var(--bg-primary)',
                  padding: '0 16px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  o
                </span>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: 'var(--border-color)',
                  zIndex: 0
                }}></div>
              </div>
            </>
          )}

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
                  autoComplete="name"
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
                autoComplete="email"
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
                autoComplete={isLoginMode ? 'current-password' : 'new-password'}
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

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                ¿No tienes cuenta?
              </p>
              <a 
                href="/catalog/register"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: 'var(--bg-tertiary, #f3f4f6)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  border: '1px solid var(--border-color, #e5e7eb)'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover, #e5e7eb)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-tertiary, #f3f4f6)'}
              >
                Crear cuenta nueva
              </a>
            </div>

            <div style={{ 
              margin: '24px 0',
              textAlign: 'center',
              position: 'relative'
            }}>
              <span style={{
                display: 'inline-block',
                background: 'var(--bg-primary)',
                padding: '0 12px',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                position: 'relative',
                zIndex: 1
              }}>o continúa con</span>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '1px',
                background: 'var(--border-color)',
                zIndex: 0
              }}></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                background: '#fff',
                color: '#1f1f1f',
                border: '1px solid var(--border-color)',
                padding: '14px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => !isLoading && (e.currentTarget.style.background = '#f8f8f8')}
              onMouseOut={(e) => !isLoading && (e.currentTarget.style.background = '#fff')}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0 0 10 20z" fill="#34A853"/>
                <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 0 0 0 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
              </svg>
              Iniciar sesión con Google
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  )
}