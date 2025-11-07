import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { loginWithEmail, getCurrentSession } from '../utils/supabaseAuthV2'

export default function AdminLogin() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Verificar si ya está logueado como admin
  useEffect(() => {
    const checkSession = async () => {
      const session = await getCurrentSession()
      if (session?.user?.rol === 'admin') {
        // Ya está logueado como admin, redirigir al dashboard
        router.replace('/dashboard')
      }
    }
    checkSession()
  }, [router])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await loginWithEmail(formData.email, formData.password)
      
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      if (result.user) {
        // Verificar que el usuario sea admin
        if (result.user.rol === 'admin') {
          // Guardar sesión admin en localStorage para compatibilidad
          localStorage.setItem('adminSession', JSON.stringify({
            loggedIn: true,
            isLoggedIn: true,
            timestamp: Date.now(),
            sessionDuration: 24 * 60 * 60 * 1000, // 24 horas
            user: result.user
          }))

          // Redirigir al dashboard
          router.push('/dashboard')
        } else {
          setError('❌ No tienes permisos de administrador')
          setIsLoading(false)
        }
      }
    } catch (err) {
      console.error('Error en login admin:', err)
      setError('Error al iniciar sesión. Por favor, intenta nuevamente.')
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '48px',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            🔐
          </div>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            Administración KOND
          </h1>
          <p style={{
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Ingresa tus credenciales de administrador
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px'
            }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="admin@kond.local"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                transition: 'all 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea'
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '8px'
            }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: '48px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea'
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#d1d5db'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  opacity: 0.6
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px',
              background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: isLoading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = isLoading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
          >
            {isLoading ? '🔄 Iniciando sesión...' : '🚀 Iniciar Sesión'}
          </button>
        </form>

        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            ¿Acceso al catálogo público?{' '}
            <a
              href="/catalog"
              style={{
                color: '#667eea',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Ver productos
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
