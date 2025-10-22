import { useEffect } from 'react'
import '../styles/globals.css'
import '../styles/catalog-next.css'

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Establecer tema por defecto
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'dark'
      document.body.setAttribute('data-theme', savedTheme)
    }
  }, [])

  return <Component {...pageProps} />
}
