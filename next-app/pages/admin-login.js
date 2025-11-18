import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { loginWithGoogle, getCurrentSession } from '../utils/supabaseAuthV2'

export default function AdminLogin() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Verificar si ya está logueado como admin
  useEffect(() => {
    const checkSession = async () => {
      const session = await getCurrentSession()
      if (session?.user?.rol === 'admin' || session?.user?.rol === 'super_admin') {
        // Ya está logueado como admin, redirigir al dashboard
        router.replace('/admin/dashboard')
      }
    }
    checkSession()
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Iniciar flujo OAuth - esto redirigirá al usuario a Google
      const result = await loginWithGoogle()

      if (result.error) {
        setError(result.error)
        setIsLoading(false)
        return
      }

      // El loginWithGoogle redirige al usuario, no devuelve datos aquí
      // La lógica de verificación de rol se maneja en el callback OAuth

    } catch (err) {
      console.error('Error iniciando login con Google:', err)
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
            Acceso exclusivo para administradores autorizados
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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
              background: isLoading ? '#9ca3af' : '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: isLoading ? 'none' : '0 4px 12px rgba(66, 133, 244, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.background = '#3367d6'
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 16px rgba(66, 133, 244, 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = isLoading ? '#9ca3af' : '#4285f4'
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = isLoading ? 'none' : '0 4px 12px rgba(66, 133, 244, 0.4)'
            }}
          >
            {isLoading ? '🔄 Iniciando sesión...' : '🔵 Iniciar sesión con Google'}
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
