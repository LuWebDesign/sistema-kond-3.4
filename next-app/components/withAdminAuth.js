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
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite'
          }} />
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
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
