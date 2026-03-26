import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import '../styles/catalog-next.css'
import { NotificationsProvider } from '../components/NotificationsProvider'

// Rutas que son del catálogo público (compradores)
const BUYER_ROUTES = ['/catalog', '/user', '/mis-pedidos']
const isBuyerRoute = (pathname) =>
  BUYER_ROUTES.includes(pathname) || pathname.startsWith('/tracking')

export default function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [currentBuyerEmail, setCurrentBuyerEmail] = useState(null)

  useEffect(() => {
    // Establecer tema por defecto
    const savedTheme = localStorage.getItem('theme') || 'dark'
    document.body.setAttribute('data-theme', savedTheme)

    // Cargar email del comprador si está logueado
    try {
      const u = localStorage.getItem('currentUser')
      if (u) setCurrentBuyerEmail(JSON.parse(u)?.email || null)
    } catch {}

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

  // Siempre renderizar el mismo árbol en SSR y en el cliente hasta que esté montado
  // Esto evita el error de hidratación #418
  const isBuyer = mounted && isBuyerRoute(router.pathname)

  if (isBuyer) {
    if (currentBuyerEmail) {
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
