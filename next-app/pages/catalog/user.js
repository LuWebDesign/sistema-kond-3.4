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
        <div style={{ padding: '24px 20px', maxWidth: '640px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Mi cuenta
            </h1>
            <button
              onClick={handleLogout}
              className="btn-ghost"
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-color)',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)' }}
            >
              Cerrar sesión
            </button>
          </div>

          {/* Profile Card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem',
                fontWeight: 600,
                flexShrink: 0
              }}>
                {currentUser.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {currentUser.nombre} {currentUser.apellido || ''}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentUser.email}
                </p>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '20px'
          }}>
            {[
              { label: 'Teléfono', value: currentUser.telefono || '—' },
              { label: 'Localidad', value: currentUser.localidad || '—' },
              { label: 'Provincia', value: currentUser.provincia || '—' },
              { label: 'Miembro desde', value: currentUser.fechaRegistro ? formatDate(currentUser.fechaRegistro) : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '14px 16px'
              }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  {label}
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Action: Edit Profile */}
          <button
            onClick={() => router.push('/catalog/user/perfil')}
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-blue)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)' }}
          >
            <div>
              <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600 }}>Editar perfil</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Nombre, dirección, contraseña</div>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>→</span>
          </button>

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
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '380px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '6px'
            }}>
              {isLoginMode ? 'Iniciar sesión' : 'Crear cuenta'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              {isLoginMode
                ? 'Ingresá con tu email y contraseña'
                : 'Completá los datos para registrarte'
              }
            </p>
          </div>

          <form onSubmit={isLoginMode ? handleLogin : handleRegister}>
            {!isLoginMode && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  autoComplete="name"
                  style={inputStyle}
                  required={!isLoginMode}
                />
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                autoComplete="email"
                style={inputStyle}
                required
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500, marginBottom: '6px' }}>
                Contraseña
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                style={inputStyle}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                background: isLoading ? 'var(--text-muted)' : 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
                marginBottom: '20px'
              }}
            >
              {isLoading ? 'Procesando...' : (isLoginMode ? 'Iniciar sesión' : 'Registrarse')}
            </button>

            {/* Toggle login/register */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {isLoginMode ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}
              </p>
              <button
                type="button"
                onClick={() => setIsLoginMode(!isLoginMode)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-section)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
              >
                {isLoginMode ? 'Crear una cuenta' : 'Iniciar sesión'}
              </button>
            </div>

            {/* Divider + Google */}
            <div style={{ margin: '24px 0', textAlign: 'center', position: 'relative' }}>
              <span style={{ display: 'inline-block', background: 'var(--bg-card)', padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.8rem', position: 'relative', zIndex: 1 }}>
                o continuá con
              </span>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border-color)', zIndex: 0 }}></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => !isLoading && (e.currentTarget.style.borderColor = 'var(--text-muted)')}
              onMouseOut={(e) => !isLoading && (e.currentTarget.style.borderColor = 'var(--border-color)')}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
                <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0 0 10 20z" fill="#34A853"/>
                <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 0 0 0 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
                <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.15s ease',
  boxSizing: 'border-box'
}