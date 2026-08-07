import { slugify } from '../utils/slugify'
import { TENANT_ID } from './tenant'

const PAGE_SIZE = 1000
const PUBLIC_PRODUCT_TYPES = ['Corte Laser', 'Grabado Laser', 'Venta', 'Stock']

async function fetchAll(queryFactory) {
  const rows = []

  for (let page = 0; ; page += 1) {
    const { data, error } = await queryFactory().range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

export async function getSitemapUrls(admin, { includeCategories, includeProducts, includePages }) {
  const [categories, products] = await Promise.all([
    includeCategories || includeProducts
      ? fetchAll(() => admin
          .from('categorias')
          .select('id, slug, updated_at')
          .eq('tenant_id', TENANT_ID)
          .eq('activa', true)
          .not('slug', 'is', null)
          .order('id', { ascending: true }))
      : Promise.resolve([]),
    includeProducts
      ? fetchAll(() => admin
          .from('productos')
          .select('id, nombre, categoria_id, tipo, updated_at')
          .eq('tenant_id', TENANT_ID)
          .eq('publicado', true)
          .eq('active', true)
          .eq('hidden_in_productos', false)
          .in('tipo', PUBLIC_PRODUCT_TYPES)
          .not('nombre', 'is', null)
          .order('id', { ascending: true }))
      : Promise.resolve([]),
  ])

  const categorySlugMap = new Map()
  for (const category of categories) {
    const slug = String(category.slug || '').trim()
    if (category.id != null && slug && slugify(slug) === slug) {
      categorySlugMap.set(String(category.id), { slug, updatedAt: category.updated_at })
    }
  }

  const urls = new Map()
  const addUrl = (path, updatedAt, metadata) => {
    if (!urls.has(path)) urls.set(path, { path, updatedAt, metadata })
  }

  if (includePages) {
    addUrl('/', null, { changefreq: 'daily', priority: '1.0' })
    addUrl('/catalog', null, { changefreq: 'daily', priority: '0.9' })
  }

  if (includeCategories) {
    for (const category of categories) {
      const resolved = categorySlugMap.get(String(category.id))
      if (resolved) addUrl(`/catalog/${resolved.slug}`, resolved.updatedAt, { changefreq: 'weekly', priority: '0.8' })
    }
  }

  if (includeProducts) {
    for (const product of products) {
      const category = categorySlugMap.get(String(product.categoria_id))
      const productSlug = slugify(product.nombre)
      if (!category || !productSlug) continue
      addUrl(`/catalog/${category.slug}/${productSlug}`, product.updated_at, { changefreq: 'weekly', priority: '0.7' })
    }
  }

  return [...urls.values()]
}
