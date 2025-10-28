import { useEffect } from 'react'
import Catalog from '../../catalog'

export default function CheckoutPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // leer posible ?mode=edit y despachar evento con el modo seleccionado
      try {
        const params = new URLSearchParams(window.location.search)
        const mode = params.get('mode') || 'order'
        window.dispatchEvent(new CustomEvent('catalog:openCheckout', { detail: { mode } }))
      } catch (e) {
        window.dispatchEvent(new CustomEvent('catalog:openCheckout', { detail: { mode: 'order' } }))
      }
    }
  }, [])

  return <Catalog />
}
