import '../utils/silenceExternalLogs'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import '../styles/catalog-next.css'
import { NotificationsProvider } from '../components/NotificationsProvider'

// Rutas que son del catálogo público (compradores)
const BUYER_ROUTES = ['/catalog', '/catalog/user', '/catalog/mis-pedidos']
const isBuyerRoute = (pathname) =>
  BUYER_ROUTES.includes(pathname) || pathname.startsWith('/tracking') || pathname.startsWith('/catalog/')

export default function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [currentBuyerEmail, setCurrentBuyerEmail] = useState(null)

  // Función reutilizable para leer email del comprador
  const refreshBuyerEmail = () => {
    if (typeof window === 'undefined') return
    try {
      const u = localStorage.getItem('currentUser')
      setCurrentBuyerEmail(u ? JSON.parse(u)?.email || null : null)
    } catch {}
  }

  useEffect(() => {
    // Establecer tema por defecto
    const savedTheme = localStorage.getItem('theme') || 'dark'
    document.body.setAttribute('data-theme', savedTheme)

    // Cargar email del comprador si está logueado
    refreshBuyerEmail()

    setMounted(true)

    // Escuchar cambios de login/logout en otras pestañas
    const handleStorage = (e) => {
      if (e.key === 'currentUser') {
        try {
          setCurrentBuyerEmail(e.newValue ? JSON.parse(e.newValue)?.email || null : null)
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Re-verificar el email del comprador en cada cambio de ruta
  // (cubre el caso donde login ocurre en la misma pestaña)
  useEffect(() => {
    refreshBuyerEmail()
  }, [router.pathname])

  // router.pathname está disponible desde el primer render (SSR + cliente) — no necesita 'mounted'
  // Solo currentBuyerEmail necesita 'mounted' porque lee localStorage
  const isBuyerRoutePath = isBuyerRoute(router.pathname)

  if (isBuyerRoutePath) {
    if (mounted && currentBuyerEmail) {
      return (
        <NotificationsProvider targetUser="user" userId={currentBuyerEmail}>
          <Component {...pageProps} />
        </NotificationsProvider>
      )
    }
    return <Component {...pageProps} />
  }

  return (
    <NotificationsProvider targetUser="admin">
      <Component {...pageProps} />
    </NotificationsProvider>
  )
}
