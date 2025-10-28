import { useEffect } from 'react'
import Catalog from '../../catalog'

export default function CartPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // activar el modal del carrito en la página Catalog
      window.dispatchEvent(new Event('catalog:openCart'))
    }
  }, [])

  return <Catalog />
}
