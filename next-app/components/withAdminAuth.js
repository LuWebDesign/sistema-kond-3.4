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
          // console.log('🔍 Verificando autenticación admin...')
          const session = await getCurrentSession()

          // console.log('📋 Estado de sesión:', {
            hasSession: !!session,
            hasUser: !!(session?.user),
            userRol: session?.user?.rol,
            userId: session?.user?.id
          })

          if (!session || !session.user) {
            // console.log('❌ No hay sesión válida, redirigiendo a login')
            router.replace('/admin/login')
            return
          }

          if (session.user.rol !== 'admin') {
            // console.log('❌ Usuario no es admin (rol:', session.user.rol, '), redirigiendo a catálogo')
            router.replace('/catalog')
            return
          }

          // console.log('✅ Usuario admin autorizado')
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
