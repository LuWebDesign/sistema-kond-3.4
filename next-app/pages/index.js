import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Index() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir automáticamente a la página principal /home
    router.replace('/home')
  }, [router])

  return null
}
