import { useEffect } from 'react'
import Catalog from '../../catalog'

export default function CategoryPage({ params }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const slug = params && params.slug ? params.slug : ''
        window.dispatchEvent(new CustomEvent('catalog:setCategory', { detail: { slug } }))
      } catch (e) {
        // fallback: no hacer nada
      }
    }
  }, [params])

  return <Catalog />
}

export async function getServerSideProps(context) {
  // Pasar params a props para que useEffect tenga acceso sin depender de window.location
  return { props: { params: context.params } }
}
