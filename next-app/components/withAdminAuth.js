import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

/**
 * HOC (Higher Order Component) para proteger páginas administrativas.
 * Verifica autenticación llamando al endpoint /api/admin/check-session,
 * que valida la cookie httpOnly kond-admin-session en el servidor.
 *
 * NOTE: localStorage fallback has been removed — auth is now cookie-based only.
 */
export default function withAdminAuth(WrappedComponent) {
  return function ProtectedRoute(props) {
    const router = useRouter()
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const res = await fetch('/api/admin/check-session', { credentials: 'same-origin' })
          if (!res.ok) {
            router.replace('/admin/login')
            return
          }
          const data = await res.json()
          if (!data.authorized) {
            router.replace('/admin/login')
            return
          }
          setIsAuthorized(true)
          setIsLoading(false)
        } catch (error) {
          console.error('❌ Error verificando autenticación:', error)
          router.replace('/admin/login')
        }
      }

      checkAuth()
    }, [router])

    // Mostrar loader mientras verifica
    if (isLoading) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            🔐
          </div>
          <div style={{
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: 600
          }}>
            Verificando permisos...
          </div>
          <style jsx>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.1); }
            }
          `}</style>
        </div>
      )
    }

    // Si no está autorizado, no mostrar nada (ya redirigió)
    if (!isAuthorized) {
      return null
    }

    // Usuario autorizado, renderizar componente
    return <WrappedComponent {...props} />
  }
}
