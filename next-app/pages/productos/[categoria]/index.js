// Página pública: /productos/[categoria]
// Lista todos los productos de una categoría (y sus subcategorías si es padre).
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
    const { data: categorias, error } = await supabase
      .from('categorias')
      .select('slug')
      .eq('activa', true)

    if (error) throw error

    const paths = (categorias || []).map((c) => ({
      params: { categoria: c.slug },
    }))

    return { paths, fallback: 'blocking' }
  } catch (err) {
    console.error('getStaticPaths [categoria]/index.js error:', err)
    return { paths: [], fallback: 'blocking' }
  }
}

export async function getStaticProps({ params }) {
  const { categoria: categoriaSlug } = params

  try {
    const supabase = getSupabaseServer()

    // Buscar la categoría por slug
    const { data: categoria, error: catError } = await supabase
      .from('categorias')
      .select('id, nombre, slug, parent_id, activa')
      .eq('slug', categoriaSlug)
      .eq('activa', true)
      .single()

    if (catError || !categoria) {
      return { notFound: true }
    }

    // Obtener IDs a buscar: esta categoría + sus subcategorías (si es padre)
    let categoriaIds = [categoria.id]

    if (categoria.parent_id === null) {
      // Es categoría raíz: incluir también sus subcategorías
      const { data: subcats } = await supabase
        .from('categorias')
        .select('id')
        .eq('parent_id', categoria.id)
        .eq('activa', true)

      if (subcats && subcats.length > 0) {
        categoriaIds = [...categoriaIds, ...subcats.map((s) => s.id)]
      }
    }

    // Buscar productos de esta categoría y sus subcategorías
    const { data: productos, error: prodError } = await supabase
      .from('productos')
      .select('id, nombre, slug, precio1, imagen, categoria, categoria_id, publicado')
      .in('categoria_id', categoriaIds)
      .eq('publicado', true)
      .order('nombre', { ascending: true })
      .limit(20)

    if (prodError) throw prodError

    return {
      props: {
        categoria: {
          id: categoria.id,
          nombre: categoria.nombre,
          slug: categoria.slug,
        },
        productos: productos || [],
      },
      revalidate: 60,
    }
  } catch (err) {
    console.error(`getStaticProps [categoria]/index.js error (${categoriaSlug}):`, err)
    return { notFound: true }
  }
}

export default function CategoriaPage({ categoria, productos }) {
  const title = `Productos en ${categoria.nombre} | KOND`
  const description = `Explorá todos los productos de la categoría ${categoria.nombre} en KOND.`

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Head>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
          <Link href="/">Inicio</Link>
          {' / '}
          <span>{categoria.nombre}</span>
        </nav>

        <h1 style={{ marginBottom: '1.5rem' }}>{categoria.nombre}</h1>

        {productos.length === 0 ? (
          <p>No hay productos disponibles en esta categoría.</p>
        ) : (
          <ul
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.5rem',
              listStyle: 'none',
              padding: 0,
            }}
          >
            {productos.map((producto) => (
              <li key={producto.id}>
                <Link href={`/productos/${categoria.slug}/${producto.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {producto.imagen && (
                    <img
                      src={producto.imagen}
                      alt={producto.nombre}
                      style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                  )}
                  <h2 style={{ fontSize: '1rem', margin: '0.5rem 0 0.25rem' }}>{producto.nombre}</h2>
                  {producto.precio1 > 0 && (
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      ${Number(producto.precio1).toLocaleString('es-AR')}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
