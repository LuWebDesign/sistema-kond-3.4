import { useEffect } from 'react'
import Catalog from '../../catalog'
import { useProducts } from '../../../hooks/useCatalog'
import { slugifyPreserveCase } from '../../../utils/slugify'

// now using shared slugify helper from utils/slugify

export default function CategoryPage({ params }) {
  const { categories } = useProducts()

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const dispatchCategoryEvent = () => {
      try {
        const slug = params && params.slug ? params.slug : ''

        // If slug matches an "old" (non-normalized) category value, redirect to canonical slug
        if (categories && categories.length) {
          const found = categories.find((cat) => {
            if (!cat) return false
            const oldSlug = String(cat).trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '').toLowerCase()
            return oldSlug === slug.toLowerCase()
          })
          if (found) {
            const newSlug = slugifyPreserveCase(found)
            if (newSlug && newSlug !== slug) {
              // Redirect to the new canonical route structure
              window.location.replace(`/catalog/${newSlug}`)
              return
            }
          }
        }

        // Dispatch event with retry logic
        const dispatchWithRetry = (retries = 0) => {
          if (retries > 10) return // Max 10 retries (~1s)

          // Prefer dispatching the canonical (lowercased) slug
          const canonicalSlug = slugifyPreserveCase(slug)
          try {
            window.dispatchEvent(new CustomEvent('catalog:setCategory', { detail: { slug: canonicalSlug } }))
          } catch (err) {
            // ignore
          }

          // Always retry briefly to give the Catalog component time to mount and listen
          setTimeout(() => dispatchWithRetry(retries + 1), 100)
        }

        dispatchWithRetry()
      } catch (e) {
        console.error('Error dispatching category event:', e)
      }
    }

    // Small delay to ensure Catalog component is mounted
    setTimeout(dispatchCategoryEvent, 200)
  }, [params, categories])

  return <Catalog />
}

export async function getServerSideProps(context) {
  return { props: { params: context.params } }
}
