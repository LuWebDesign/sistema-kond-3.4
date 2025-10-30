import { useEffect } from 'react'
import Catalog from '../../catalog'
import { useProducts } from '../../../hooks/useCatalog'
import { slugifyPreserveCase } from '../../../utils/slugify'

export default function CategoryPage({ params }) {
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

  return <Catalog />
}

export async function getServerSideProps(context) {
  return { props: { params: context.params } }
}
