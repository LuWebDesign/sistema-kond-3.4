import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import '../styles/globals.css'
import '../styles/catalog-next.css'
import { NotificationsProvider } from '../components/NotificationsProvider'

export default function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Establecer tema por defecto
    const savedTheme = localStorage.getItem('theme') || 'dark'
    document.body.setAttribute('data-theme', savedTheme)
    setMounted(true)
  }, [])

  // Siempre renderizar el mismo árbol en SSR y en el cliente hasta que esté montado
  // Esto evita el error de hidratación #418
  const isPublicPage = mounted && (
    router.pathname === '/catalog' ||
    router.pathname.startsWith('/tracking') ||
    router.pathname === '/user'
  )

  if (isPublicPage) {
    return <Component {...pageProps} />
  }

  return (
    <NotificationsProvider targetUser="admin">
      <Component {...pageProps} />
    </NotificationsProvider>
  )
}
