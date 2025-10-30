import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useProducts } from '../../../hooks/useCatalog'
import ProductDetail from '../../../components/ProductDetail'

import { slugifyPreserveCase as slugifyShared } from '../../../utils/slugify'

export default function ProductPage({ params }) {
  const { products } = useProducts()
  const { category, product } = params || {}

  // find product by matching normalized (lowercased) slugs
  const found = (products || []).find(p => {
  const catSlug = slugifyShared(p.categoria)
  const prodSlug = slugifyShared(p.nombre)
  return catSlug === String(category || '').toLowerCase() && prodSlug === String(product || '').toLowerCase()
  })

  useEffect(() => {
    // noop
  }, [found])

  if (!found) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Producto no encontrado</h2>
        <p>El producto solicitado no existe o fue movido. Volver al catálogo.</p>
      </div>
    )
  }

  return <ProductDetail product={found} />
}

export async function getServerSideProps(context) {
  return { props: { params: context.params } }
}
