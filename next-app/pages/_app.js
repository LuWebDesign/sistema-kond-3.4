import { useEffect } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import '../styles/catalog-next.css'
import { NotificationsProvider } from '../components/NotificationsProvider'

export default function MyApp({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    // Establecer tema por defecto
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'dark'
      document.body.setAttribute('data-theme', savedTheme)
    }
  }, [])

  // Determinar si estamos en una página de admin o página pública
  const isAdminPage = router.pathname.startsWith('/admin') || router.pathname.startsWith('/_admin')
  const isPublicPage = router.pathname === '/catalog' || router.pathname.startsWith('/tracking') || router.pathname === '/user'
  
  // Solo usar NotificationsProvider en páginas de admin, no en públicas
  if (isPublicPage) {
    return <Component {...pageProps} />
  }

  return (
    <NotificationsProvider targetUser={isAdminPage ? 'admin' : 'user'}>
      <Component {...pageProps} />
    </NotificationsProvider>
  )
}
