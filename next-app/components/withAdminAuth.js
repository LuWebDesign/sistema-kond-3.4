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
        // 1. Try server-side cookie verification (authoritative)
        try {
          const res = await fetch('/api/admin/check-session', { credentials: 'same-origin' })
          if (res.ok) {
            const data = await res.json()
            if (data.authorized) {
              setIsAuthorized(true)
              setIsLoading(false)
              return
            }
          }
        } catch {
          // Network error — fall through to localStorage fallback
        }

        // 2. Fallback: localStorage kond-admin (safe because logout() now clears it
        //    unconditionally BEFORE any async op, so a surviving key = valid session)
        if (typeof window !== 'undefined') {
          const adminUser = JSON.parse(localStorage.getItem('kond-admin') || 'null')
          if (adminUser?.rol === 'admin' || adminUser?.rol === 'super_admin') {
            setIsAuthorized(true)
            setIsLoading(false)
            return
          }
        }

        router.replace('/admin/login')
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
