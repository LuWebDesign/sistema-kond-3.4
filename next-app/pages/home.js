// next-app/pages/home.js
// Megafibro storefront home page.
// KOND landing page is preserved at /home-kond (home-kond.js).

import React from 'react'
import Head from 'next/head'
import { useQuery } from '@tanstack/react-query'
import PublicLayout from '../components/PublicLayout'
import SeoHead from '../components/SeoHead'
import { getSeoConfigServer } from '../lib/getSeoConfigServer'
import AnnouncementBar from '../components/home/AnnouncementBar'
import HeroGrid from '../components/home/HeroGrid'
import CategoryTiles from '../components/home/CategoryTiles'
import CategoryCarousel from '../components/home/CategoryCarousel'
import PromoCarousel from '../components/home/PromoCarousel'

import { QUERY_KEYS, STALE_TIMES } from '../lib/queryKeys'

export default function Home({ seoConfig }) {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.home.data(),
    queryFn: () => fetch('/api/home-data').then((r) => r.json()),
    staleTime: STALE_TIMES.HOME_DATA,
    retry: false,
  })

  const { data: homeConfig, isPending: homeConfigPending } = useQuery({
    queryKey: QUERY_KEYS.home.config(),
    queryFn: () => fetch('/api/admin/home-config').then((r) => r.json()),
    staleTime: STALE_TIMES.HOME_CONFIG,
    retry: false,
  })

  const featured = data?.featured || []
  const promos = data?.promos || []
  // All categories (top-level + subcategories) for slug resolution
  const allCategories = data?.categories || []
  // Top-level only for display sections
  const categories = allCategories.filter((c) => !c.parent_id)
  const byCategory = data?.byCategory || {}

  // Map categoria_id → slug for product navigation (includes all levels)
  const categorySlugMap = Object.fromEntries(allCategories.map((c) => [c.id, c.slug]))

  const bannerMessages = homeConfig?.config?.bannerMessages

  // Apply home-config: category order, visibility, and section gating
  const homeConfigData = homeConfig?.config || {}
  const categoryOrder = homeConfigData.categoryOrder || []
  const hiddenCategoryIds = new Set(homeConfigData.hiddenCategories || [])
  const sections = homeConfigData.sections || []

  // Backward compat type normalization
  const LEGACY_TYPE_MAP = { featured: 'featured', categories: 'categories', promo: 'promos' }
  const getType = (s) => s.type || LEGACY_TYPE_MAP[s.id] || s.id

  // Build sorted+filtered active sections
  const activeSections = [...sections]
    .map((s) => ({ ...s, type: getType(s) }))
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)

  // Apply order and visibility to top-level categories
  const sortedCategories = [...categories]
    .filter((c) => !hiddenCategoryIds.has(c.id))
    .sort((a, b) => {
      const ai = categoryOrder.indexOf(a.id)
      const bi = categoryOrder.indexOf(b.id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })

  return (
    <PublicLayout title="Megafibro - Productos en MDF">
      <SeoHead
        config={seoConfig || {}}
        pageTitle={seoConfig?.homeSeoTitle || undefined}
        pageDescription={seoConfig?.homeSeoDescription || undefined}
        pageCanonical={seoConfig?.canonicalUrl || seoConfig?.siteUrl}
        ogImage={seoConfig?.homeOgImage || undefined}
      />

      {/* Announcement bar: only render once home config has loaded to avoid showing stale defaults */}
      {!homeConfigPending && <AnnouncementBar messages={bannerMessages} />}

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
          {activeSections.map((s) => {
            switch (s.type) {
              case 'featured':
                return featured.length > 0
                  ? <HeroGrid key={s.id} products={featured} categorySlugMap={categorySlugMap} />
                  : null
              case 'categories':
                return sortedCategories.length > 0
                  ? (
                    <React.Fragment key={s.id}>
                      <CategoryTiles categories={sortedCategories} byCategory={byCategory} />
                      {sortedCategories.map((cat) =>
                        (byCategory[cat.id]?.length || 0) > 0
                          ? <CategoryCarousel key={cat.id} category={cat} products={byCategory[cat.id]} />
                          : null
                      )}
                    </React.Fragment>
                  )
                  : null
              case 'promos':
                return promos.length > 0
                  ? <PromoCarousel key={s.id} products={promos} label={s.label} categorySlugMap={categorySlugMap} />
                  : null
              case 'categoria_carousel': {
                const catId = s.config?.categoryId
                const cat = allCategories.find((c) => c.id === catId)
                const prods = byCategory[catId] || []
                return cat && prods.length > 0
                  ? <CategoryCarousel key={s.id} category={cat} products={prods} />
                  : null
              }
              default:
                return null
            }
          })}
        </main>
      )}
    </PublicLayout>
  )
}

export async function getServerSideProps() {
  try {
    const seoConfig = await getSeoConfigServer()
    return { props: { seoConfig } }
  } catch {
    return { props: { seoConfig: null } }
  }
}
