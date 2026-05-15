import { useEffect } from 'react'
import Catalog from '../../catalog'
import SeoHead from '../../../components/SeoHead'
import { useProducts } from '../../../hooks/useCatalog'
import { slugifyPreserveCase } from '../../../utils/slugify'
import { getSeoConfigServer } from '../../../lib/getSeoConfigServer'

export default function CategoryPage({ params, seoConfig, categoryName }) {
  const { categories } = useProducts()

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const slug = params && params.category ? params.category : ''

      // If slug matches an "old" (non-normalized) category value, redirect to canonical slug
      if (categories && categories.length) {
        const found = categories.find((cat) => {
          if (!cat) return false
          const oldSlug = String(cat).trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '')
          return oldSlug === slug
        })
        if (found) {
          const newSlug = slugifyPreserveCase(found)
          if (newSlug && newSlug !== slug) {
            window.location.replace(`/catalog/${newSlug}`)
            return
          }
        }
      }

      // Dispatch event so /catalog can select the category client-side
      window.dispatchEvent(new CustomEvent('catalog:setCategory', { detail: { slug } }))
    } catch (e) {
      // noop
    }
  }, [params, categories])

  return (
    <>
      <SeoHead
        config={seoConfig || {}}
        pageTitle={categoryName && seoConfig?.categoryTitleTemplate
          ? seoConfig.categoryTitleTemplate
              .replaceAll('{{categoria}}', categoryName)
              .replaceAll('{{subcategoria}}', categoryName)
              .replaceAll('{{sitio}}', seoConfig?.siteTitle || '')
              .replaceAll('{{cantidad}}', '')
          : undefined}
        pageDescription={categoryName && seoConfig?.categoryDescriptionTemplate
          ? seoConfig.categoryDescriptionTemplate
              .replaceAll('{{categoria}}', categoryName)
              .replaceAll('{{subcategoria}}', categoryName)
              .replaceAll('{{sitio}}', seoConfig?.siteTitle || '')
              .replaceAll('{{cantidad}}', '')
          : undefined}
      />
      <Catalog seoConfig={seoConfig} />
    </>
  )
}

export async function getServerSideProps(context) {
  const { category: categorySlug } = context.params
  // Decode slug to a readable name as fallback (e.g. "remeras-basicas" → "Remeras Basicas")
  const categoryName = categorySlug
    ? categorySlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : ''
  try {
    const seoConfig = await getSeoConfigServer()
    return { props: { params: context.params, seoConfig, categoryName } }
  } catch {
    return { props: { params: context.params, seoConfig: null, categoryName } }
  }
}
