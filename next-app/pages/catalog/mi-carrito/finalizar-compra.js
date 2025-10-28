import { useEffect } from 'react'
import Catalog from '../../catalog'

export default function CheckoutPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // activar el modal de checkout en la página Catalog
      window.dispatchEvent(new CustomEvent('catalog:openCheckout', { detail: { mode: 'order' } }))
    }
  }, [])

  return <Catalog />
}
