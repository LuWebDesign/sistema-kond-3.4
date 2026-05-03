import { useProducts } from '../../../hooks/useCatalog'
import { useCategorias } from '../../../hooks/useSupabaseQuery'
import ProductDetail from '../../../components/ProductDetail'
import Link from 'next/link'
import PublicLayout from '../../../components/PublicLayout'
import { slugifyPreserveCase } from '../../../utils/slugify'

export default function ProductCatchAll({ params }) {
  const { products, categories, isLoading } = useProducts()
  const { data: categoriasAPI = [] } = useCategorias()
  const { category, segments = [] } = params || {}

  const isReady = !isLoading

  let found = null

  if (isReady && segments.length === 1) {
    // /catalog/[category]/[productSlug]
    const [productSlug] = segments
    found = (products || []).find(p => {
      const catSlug = slugifyPreserveCase(p.categoria).toLowerCase()
      const prodSlug = slugifyPreserveCase(p.nombre).toLowerCase()
      return catSlug === String(category || '').toLowerCase() && prodSlug === String(productSlug || '').toLowerCase()
    })
  } else if (isReady && segments.length === 2 && categoriasAPI.length > 0) {
    // /catalog/[parentSlug]/[subSlug]/[productSlug]
    const [subSlug, productSlug] = segments
    found = (products || []).find(p => {
      if (!p.categoriaId) return false
      const sub = categoriasAPI.find(c => c.id === p.categoriaId)
      if (!sub?.parent_id) return false
      const parent = categoriasAPI.find(c => c.id === sub.parent_id)
      if (!parent) return false

      const parentSlug = slugifyPreserveCase(parent.slug || parent.nombre).toLowerCase()
      const subSlugVal = slugifyPreserveCase(sub.slug || sub.nombre).toLowerCase()
      const prodSlugVal = slugifyPreserveCase(p.nombre).toLowerCase()

      return (
        parentSlug === String(category || '').toLowerCase() &&
        subSlugVal === String(subSlug || '').toLowerCase() &&
        prodSlugVal === String(productSlug || '').toLowerCase()
      )
    })
  }

  if (!isReady || (segments.length === 2 && categoriasAPI.length === 0)) return null

  if (!found) {
    return (
      <PublicLayout title="Producto no encontrado - KOND">
        <div style={{ padding: 24 }}>
          <h2>Producto no encontrado</h2>
          <p>El producto solicitado no existe o fue movido.</p>
          <Link href="/catalog">Volver al catálogo</Link>
        </div>
      </PublicLayout>
    )
  }

  return <ProductDetail product={found} categories={categories} products={products} />
}

export async function getServerSideProps(context) {
  return { props: { params: context.params } }
}
