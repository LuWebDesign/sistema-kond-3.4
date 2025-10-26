import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Home() {
  const router = useRouter()
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Verificar si ya hay una sesión activa
  useEffect(() => {
    const session = localStorage.getItem('adminSession')
    if (session) {
      try {
        const sessionData = JSON.parse(session)
        // Verificar si la sesión no ha expirado (24 horas)
        const now = Date.now()
        const sessionAge = now - sessionData.timestamp
        const maxAge = 24 * 60 * 60 * 1000 // 24 horas en ms

        if (sessionAge < maxAge) {
          router.push('/admin')
          return
        } else {
          // Sesión expirada, limpiar
          localStorage.removeItem('adminSession')
        }
      } catch (e) {
        localStorage.removeItem('adminSession')
      }
    }
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Simular delay de validación
    await new Promise(resolve => setTimeout(resolve, 500))

    // Validar credenciales
    if (credentials.email === 'admin1' && credentials.password === 'kond') {
      // Crear sesión
      const sessionData = {
        loggedIn: true,
        timestamp: Date.now(),
        email: credentials.email
      }
      localStorage.setItem('adminSession', JSON.stringify(sessionData))

      // Redirigir al panel administrativo
      router.push('/admin')
    } else {
      setError('Credenciales incorrectas. Verifica e intenta de nuevo.')
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    })
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('')
  }

  return (
    <>
      <Head>
        <title>Acceso Administrativo - Sistema KOND</title>
        <meta name="description" content="Panel de acceso administrativo del Sistema KOND" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

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
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          {/* Logo */}
          <div style={{
            fontSize: '3rem',
            marginBottom: '20px',
            color: '#667eea'
          }}>
            🔐
          </div>

          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1a202c',
            marginBottom: '8px'
          }}>
            Sistema KOND
          </h1>

          <p style={{
            color: '#718096',
            marginBottom: '32px',
            fontSize: '0.95rem'
          }}>
            Acceso al panel administrativo
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                name="email"
                placeholder="Usuario administrador"
                value={credentials.email}
                onChange={handleChange}
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: error ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = error ? '#e53e3e' : '#e2e8f0'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <input
                type="password"
                name="password"
                placeholder="Contraseña"
                value={credentials.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: error ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = error ? '#e53e3e' : '#e2e8f0'}
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fed7d7',
                color: '#c53030',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '0.9rem',
                border: '1px solid #feb2b2'
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: isLoading ? '#a0aec0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.target.style.transform = 'translateY(-1px)'
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Verificando...
                </>
              ) : (
                'Acceder al Sistema'
              )}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f7fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{
              fontSize: '0.85rem',
              color: '#718096',
              margin: '0 0 8px 0',
              fontWeight: '600'
            }}>
              💡 Información de acceso
            </p>
            <p style={{
              fontSize: '0.8rem',
              color: '#a0aec0',
              margin: 0,
              lineHeight: '1.4'
            }}>
              Usuario: admin1<br/>
              Contraseña: kond
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
