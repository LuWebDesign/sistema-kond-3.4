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
          
          if (!session || !session.user) {
            // No hay sesión, redirigir al login admin
            router.replace('/admin-login')
            return
          }

          // Considerar también el email del usuario autenticado como fallback de admin
          const isAdminByEmail = session?.session?.user?.email && session.session.user.email.toLowerCase() === 'admin@kond.local'
          if (session.user.rol !== 'admin' && !isAdminByEmail) {
            // Usuario no es admin, redirigir al catálogo
            router.replace('/catalog')
            return
          }

          // Usuario autorizado
          setIsAuthorized(true)
          setIsLoading(false)
        } catch (error) {
          console.error('Error verificando autenticación:', error)
          router.replace('/admin-login')
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
