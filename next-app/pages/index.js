import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    // Verificar si hay una sesión activa
    const session = localStorage.getItem('adminSession')
    if (session) {
      try {
        const sessionData = JSON.parse(session)
        // Verificar si la sesión no ha expirado (24 horas)
        const now = Date.now()
        const sessionAge = now - sessionData.timestamp
        const maxAge = 24 * 60 * 60 * 1000 // 24 horas en ms

        if (sessionAge < maxAge) {
          // Redirigir directamente al panel si hay sesión válida
          router.replace('/admin')
          return
        } else {
          // Sesión expirada, limpiar
          localStorage.removeItem('adminSession')
        }
      } catch (e) {
        localStorage.removeItem('adminSession')
      }
    }

    // Si no hay sesión o expiró, redirigir al login
    router.replace('/home')
  }, [router])

  return null
}
