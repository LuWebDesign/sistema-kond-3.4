
                import { useEffect } from 'react'
                import { useRouter } from 'next/router'

                export default function PaymentConfigRedirect() {
                  const router = useRouter()
                  useEffect(() => {
                    // Redirigir al editor dentro del panel admin
                    router.replace('/admin/payment-config')
                  }, [router])

                  return null
                }
