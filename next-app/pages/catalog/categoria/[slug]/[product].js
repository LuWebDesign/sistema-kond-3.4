import { useEffect } from 'react'
import Link from 'next/link'
import PublicLayout from '../../../../components/PublicLayout'
import { useProducts } from '../../../../hooks/useCatalog'
import { slugifyPreserveCase } from '../../../../utils/slugify'

export default function ProductPage({ params }) {
  const { products } = useProducts()
  const { slug: categorySlug, product } = params || {}

  // find product by matching slugified category and product name
  const found = (products || []).find(p => {
    const catSlug = slugifyPreserveCase(p.categoria)
    const prodSlug = slugifyPreserveCase(p.nombre)
    return catSlug === categorySlug && prodSlug === product
  })

  useEffect(() => {
    // noop
  }, [found])

  if (!found) {
    return (
      <PublicLayout title="Producto - KOND">
        <div style={{ padding: 24 }}>
          <h2>Producto no encontrado</h2>
          <p>El producto solicitado no existe o fue movido. Volver al catálogo.</p>
          <Link href="/catalog">Volver al catálogo</Link>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout title={`${found.nombre} - KOND`}>
      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
            {found.imagen ? (
              <img src={found.imagen} alt={found.nombre} style={{ width: '100%', borderRadius: 8 }} />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Sin imagen</div>
            )}
          </div>

          <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
            <h1 style={{ marginTop: 0, color: 'var(--text-primary)' }}>{found.nombre}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>{found.medidas}</p>
            <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>
              {found.precio ? `$ ${found.precio}` : ''}
            </p>
            <div style={{ marginTop: 12 }}>
              <p style={{ color: 'var(--text-secondary)' }}>{found.descripcion || 'Sin descripción disponible.'}</p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}

export async function getServerSideProps(context) {
  return { props: { params: context.params } }
}
