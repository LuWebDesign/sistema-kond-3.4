// Página pública: /productos/[categoria]/[slug]
// Detalle de producto SEO con breadcrumb y meta tags.
// ISR: revalidate 60s

import Head from 'next/head'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not set')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function getStaticPaths() {
  try {
    const supabase = getSupabaseServer()

    // Obtener todos los productos publicados con su categoría asignada
    const { data: productos, error } = await supabase
      .from('productos')
      .select('slug, categoria_id, categoria, categorias:categoria_id(slug)')
      .eq('publicado', true)
      .not('slug', 'is', null)

    if (error) throw error

    const paths = (productos || [])
      .map((p) => {
        // Usar el slug de la categoría asignada (FK), o fallback al campo texto
        const categoriaSlug = p.categorias?.slug || slugifyText(p.categoria || '')
        if (!categoriaSlug || !p.slug) return null
        return { params: { categoria: categoriaSlug, slug: p.slug } }
      })
      .filter(Boolean)

    return { paths, fallback: 'blocking' }
  } catch (err) {
    console.error('getStaticPaths [categoria]/[slug].js error:', err)
    return { paths: [], fallback: 'blocking' }
  }
}

export async function getStaticProps({ params }) {
  const { categoria: categoriaSlug, slug: productoSlug } = params

  try {
    const supabase = getSupabaseServer()

    // Buscar producto por slug
    const { data: producto, error: prodError } = await supabase
      .from('productos')
      .select('id, nombre, slug, descripcion, precio1, imagen, categoria, categoria_id, publicado')
      .eq('slug', productoSlug)
      .eq('publicado', true)
      .single()

    if (prodError || !producto) {
      return { notFound: true }
    }

    // Resolver la categoría del producto
    let categoriaData = null

    if (producto.categoria_id) {
      const { data: cat } = await supabase
        .from('categorias')
        .select('id, nombre, slug')
        .eq('id', producto.categoria_id)
        .single()
      categoriaData = cat
    }

    // Verificar que el slug de categoría de la URL coincide con el de la categoría del producto
    const categoriaSlugEsperado = categoriaData?.slug || slugifyText(producto.categoria || '')

    if (!categoriaSlugEsperado || categoriaSlugEsperado !== categoriaSlug) {
      return { notFound: true }
    }

    return {
      props: {
        producto: {
          id: producto.id,
          nombre: producto.nombre,
          slug: producto.slug,
          descripcion: producto.descripcion || null,
          precio1: producto.precio1 || 0,
          imagen: producto.imagen || null,
        },
        categoria: {
          nombre: categoriaData?.nombre || producto.categoria || '',
          slug: categoriaSlugEsperado,
        },
      },
      revalidate: 60,
    }
  } catch (err) {
    console.error(`getStaticProps [categoria]/[slug].js error (${categoriaSlug}/${productoSlug}):`, err)
    return { notFound: true }
  }
}

/**
 * Slug helper — inline copy para evitar importar desde utils en getStaticPaths
 * (que corre en Node sin transform de módulos ES en algunos entornos).
 */
function slugifyText(text) {
  if (!text) return ''
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function ProductoPage({ producto, categoria }) {
  const title = `${producto.nombre} | ${categoria.nombre} | KOND`
  const description = producto.descripcion
    ? `${producto.descripcion.slice(0, 155)}…`
    : `${producto.nombre} — disponible en KOND, categoría ${categoria.nombre}.`

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="product" />
        {producto.imagen && <meta property="og:image" content={producto.imagen} />}
      </Head>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
          <Link href="/">Inicio</Link>
          {' / '}
          <Link href={`/productos/${categoria.slug}`}>{categoria.nombre}</Link>
          {' / '}
          <span>{producto.nombre}</span>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: producto.imagen ? '1fr 1fr' : '1fr', gap: '2rem' }}>
          {producto.imagen && (
            <div>
              <img
                src={producto.imagen}
                alt={producto.nombre}
                style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }}
              />
            </div>
          )}

          <div>
            <h1 style={{ marginTop: 0 }}>{producto.nombre}</h1>

            {producto.descripcion && (
              <p style={{ color: '#444', lineHeight: '1.6' }}>{producto.descripcion}</p>
            )}

            {producto.precio1 > 0 && (
              <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: '1rem 0' }}>
                ${Number(producto.precio1).toLocaleString('es-AR')}
              </p>
            )}

            <Link
              href={`/productos/${categoria.slug}`}
              style={{ display: 'inline-block', marginTop: '1rem', color: '#0070f3' }}
            >
              ← Ver más de {categoria.nombre}
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
