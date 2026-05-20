import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getCurrentSession } from '../utils/supabaseAuthV2'

/**
 * HOC (Higher Order Component) para proteger páginas administrativas
 * Verifica que el usuario esté autenticado y tenga rol de admin
 */
export default function withAdminAuth(WrappedComponent) {
  return function ProtectedRoute(props) {
    const router = useRouter()
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
      const checkAuth = async () => {
        try {
          const session = await getCurrentSession()

          // If Supabase session is absent (e.g. local dev without active JWT),
          // fall back to localStorage — consistent with adminAuth.js (dashboard).
          // TODO: remove fallback once SDD admin-login-security is implemented.
          if (!session || !session.user) {
            if (typeof window !== 'undefined') {
              const adminUser = JSON.parse(localStorage.getItem('kond-admin') || 'null')
              if (adminUser?.rol === 'admin' || adminUser?.rol === 'super_admin') {
                setIsAuthorized(true)
                setIsLoading(false)
                return
              }
            }
            router.replace('/admin/login')
            return
          }

          if (session.user.rol !== 'admin' && session.user.rol !== 'super_admin') {
            router.replace('/catalog')
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
