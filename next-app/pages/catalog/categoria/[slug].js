import { useEffect } from 'react'
import Catalog from '../../catalog'
import { useProducts } from '../../../hooks/useCatalog'

// helper local: slugify que coincide con la función en catalog.js
const slugifyPreserveCase = (str) => {
  if (!str) return ''
  const normalized = str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return normalized.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '')
}

export default function CategoryPage({ params }) {
  const { categories } = useProducts()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const slug = params && params.slug ? params.slug : ''

        // Si el slug coincide con la versión antigua (sin normalizar acentos) de alguna categoría,
        // redirigir (client-side) a la versión canonical (con reemplazo de acentos por letra)
        if (categories && categories.length) {
          const found = categories.find(cat => {
            if (!cat) return false
            const oldSlug = cat.toString().trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-]/g, '')
            return oldSlug === slug
          })
          if (found) {
            const newSlug = slugifyPreserveCase(found)
            if (newSlug && newSlug !== slug) {
              window.location.replace(`/catalog/categoria/${newSlug}`)
              return
            }
          }
        }

        // Si no hubo redirección, despachar evento para seleccionar la categoría
        window.dispatchEvent(new CustomEvent('catalog:setCategory', { detail: { slug } }))
      } catch (e) {
        // fallback: no hacer nada
      }
    }
  }, [params, categories])

  return <Catalog />
}

export async function getServerSideProps(context) {
  // Pasar params a props para que useEffect tenga acceso sin depender de window.location
  return { props: { params: context.params } }
}
