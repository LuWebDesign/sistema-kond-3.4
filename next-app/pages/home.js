// next-app/pages/home.js
// Megafibro storefront home page.
// KOND landing page is preserved at /home-kond (home-kond.js).

import Head from 'next/head'
import { useQuery } from '@tanstack/react-query'
import PublicLayout from '../components/PublicLayout'
import AnnouncementBar from '../components/home/AnnouncementBar'
import HeroGrid from '../components/home/HeroGrid'
import CategoryTiles from '../components/home/CategoryTiles'
import CategoryCarousel from '../components/home/CategoryCarousel'

import { QUERY_KEYS, STALE_TIMES } from '../lib/queryKeys'

export default function Home() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.home.data(),
    queryFn: () => fetch('/api/home-data').then((r) => r.json()),
    staleTime: STALE_TIMES.HOME_DATA,
    retry: false,
  })

  const featured = data?.featured || []
  // All categories (top-level + subcategories) for slug resolution
  const allCategories = data?.categories || []
  // Top-level only for display sections
  const categories = allCategories.filter((c) => !c.parent_id)
  const byCategory = data?.byCategory || {}

  // Map categoria_id → slug for product navigation (includes all levels)
  const categorySlugMap = Object.fromEntries(allCategories.map((c) => [c.id, c.slug]))

  return (
    <PublicLayout title="Megafibro - Productos en MDF">
      <Head>
        <meta name="description" content="Productos innovadores en fibrofácil MDF. Exhibidores, souvenirs, decoración y más. Envíos a todo el país." />
        <meta property="og:title" content="Megafibro - Productos en MDF" />
        <meta property="og:description" content="Exhibidores, souvenirs, decoración y más. Envíos a todo el país." />
        <meta property="og:type" content="website" />
      </Head>

      <AnnouncementBar />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '36px', height: '36px',
              border: '3px solid #000',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>Cargando...</p>
          </div>
        </div>
      ) : (
        <main>
          {featured.length > 0 && <HeroGrid products={featured} categorySlugMap={categorySlugMap} />}

          {categories.length > 0 && (
            <CategoryTiles categories={categories} byCategory={byCategory} />
          )}

          {categories.map((cat) =>
            (byCategory[cat.id]?.length || 0) > 0 ? (
              <CategoryCarousel key={cat.id} category={cat} products={byCategory[cat.id]} />
            ) : null
          )}
        </main>
      )}
    </PublicLayout>
  )
}
