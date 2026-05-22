import PublicLayout from '../components/PublicLayout'
import SeoHead from '../components/SeoHead'
import CategoryDropdown from '../components/CategoryDropdown'
import { useProducts, useCart, useCoupons } from '../hooks/useCatalog'
import { useCategorias } from '../hooks/useSupabaseQuery'
import { 
  formatCurrency, 
  getCurrentUser,
  createToast
} from '../utils/catalogUtils'
import { applyTransferDiscount, getActivePromotions } from '../utils/promoEngine'
import { getCatalogStyles } from '../utils/supabaseCatalogStyles'
import { getSeoConfigServer } from '../lib/getSeoConfigServer'
import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/router'
import { slugifyPreserveCase } from '../utils/slugify'
// SectionSelector is rendered by PublicLayout for all /catalog routes.
// Remove local import to avoid duplicate selectors.

export default function Catalog({ seoConfig }) {
  const router = useRouter()
  const { products, categories, materials, isLoading, promociones } = useProducts()
  const { addToCart, subtotal } = useCart()
  const { calculateDiscount } = useCoupons()

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(null)
  const [currentUserState, setCurrentUserState] = useState(null)
  // imageModal: { productId: Number, index: Number } or null
  const [imageModal, setImageModal] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12
  const [gridColumnsDesktop, setGridColumnsDesktop] = useState(3)
  const [gridColumnsMobile, setGridColumnsMobile] = useState(2)
  const { data: categoriasAPI = [] } = useCategorias()

  // Construir lista de categorías para el dropdown: unir nombres legacy (desde productos)
  // con las categorías raíz provenientes de la API (para mostrar padres sin productos directos).
  const categoriesForDropdown = useMemo(() => {
    try {
      const prodNames = Array.isArray(categories) ? categories.filter(Boolean) : []
      const apiRootNames = Array.isArray(categoriasAPI)
        ? categoriasAPI.filter(c => c.parent_id === null || c.parent_id === undefined).map(c => c.nombre).filter(Boolean)
        : []
      // union preservando order: primero los nombres de productos, luego los padres faltantes
      const set = new Set(prodNames)
      for (const n of apiRootNames) set.add(n)
      return Array.from(set)
    } catch (e) {
      return Array.isArray(categories) ? categories : []
    }
  }, [categories, categoriasAPI])

  // Cargar columnas del catálogo desde estilos personalizados
  useEffect(() => {
    // 1. Leer localStorage de forma sincrónica para evitar el flash visual
    try {
      const raw = localStorage.getItem('catalogStyles')
      if (raw) {
        const parsed = JSON.parse(raw)
        setGridColumnsDesktop(Number(parsed.gridColumnsDesktop ?? parsed.gridColumns ?? 3))
        setGridColumnsMobile(Number(parsed.gridColumnsMobile ?? 2))
      }
    } catch { /* invalid JSON in localStorage: skip */ }

    // 2. Actualizar desde la API en segundo plano (stale-while-revalidate)
    getCatalogStyles().then(s => {
      if (s) {
        setGridColumnsDesktop(Number(s.gridColumnsDesktop ?? s.gridColumns ?? 3))
        setGridColumnsMobile(Number(s.gridColumnsMobile ?? 2))
      }
    }).catch(() => { /* API unavailable: localStorage fallback already applied */ })

    const onStylesUpdate = (e) => {
      if (e.detail) {
        setGridColumnsDesktop(Number(e.detail.gridColumnsDesktop ?? e.detail.gridColumns ?? 3))
        setGridColumnsMobile(Number(e.detail.gridColumnsMobile ?? 2))
      }
    }
    window.addEventListener('catalogStyles:updated', onStylesUpdate)
    return () => window.removeEventListener('catalogStyles:updated', onStylesUpdate)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Escuchar cambios en localStorage para actualizar el usuario logueado
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedUser = getCurrentUser()
      setCurrentUserState(updatedUser)
    }

    // Verificar usuario al montar
    handleStorageChange()

    // Escuchar evento 'storage' para cambios desde otras pestañas/ventanas
    window.addEventListener('storage', handleStorageChange)

    // También verificar al montar/focus para cambios en la misma pestaña
    window.addEventListener('focus', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [])

  // Función para manejar la selección de categoría desde URLs
  const setCategoryHandler = useCallback((e) => {
    // Extraer slug y setear directamente sin reintentos - el useEffect de sincronización lo manejará
    const slug = e && e.detail && e.detail.slug ? e.detail.slug : ''
    if (!slug) {
      setSelectedCategory('')
      return
    }

    // Buscar la categoría en la lista combinada (productos + categorías raíz API)
    if (categoriesForDropdown && categoriesForDropdown.length > 0) {
      const foundCategory = categoriesForDropdown.find(category => {
        if (!category) return false
        const categorySlug = slugifyPreserveCase(category)
        return categorySlug === slug
      })

      if (foundCategory) {
        setSelectedCategory(foundCategory)
      }
    }
    // Si la lista aún no está lista, el useEffect de sincronización con router.asPath lo manejará
  }, [categoriesForDropdown])

  // Cerrar lightbox con Esc
  useEffect(() => {
    if (!imageModal) return
    const onKey = (e) => {
      if (e.key === 'Escape') return setImageModal(null)
      if (!imageModal) return
      const pid = imageModal.productId
      const idx = Number.isFinite(imageModal.index) ? imageModal.index : 0
      const prod = (products || []).find(p => p.id === pid)
      const imgs = prod?.imagenes || []
      if (!imgs || imgs.length === 0) return
      if (e.key === 'ArrowLeft') setImageModal({ productId: pid, index: (idx - 1 + imgs.length) % imgs.length })
      if (e.key === 'ArrowRight') setImageModal({ productId: pid, index: (idx + 1) % imgs.length })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [imageModal, products])

  // Permitir navegar a la categoría desde otras rutas/links
  useEffect(() => {
    // Registrar listener de categoría y devolver limpieza.
    if (typeof window !== 'undefined') {
      window.addEventListener('catalog:setCategory', setCategoryHandler)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('catalog:setCategory', setCategoryHandler)
      }
    }
  }, [setCategoryHandler])

  // Filtrar productos (memoizado para evitar recalcular en cada render)
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           (product.medidas && product.medidas.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                           (product.categoria && product.categoria.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))

      // Cuando hay categoría seleccionada, incluir también productos que pertenezcan a
      // subcategorías de la categoría padre (usando `categoriasAPI` para resolver jerarquía).
      const matchesCategory = !selectedCategory ||
        (selectedSubcategoryId
          ? product.categoriaId === selectedSubcategoryId
          : (() => {
              // Igualdad por texto (compatibilidad con datos legacy)
              if (product.categoria && product.categoria.trim() === String(selectedCategory).trim()) return true

              // Si no hay datos de categorias API, degradar a comparación por texto solamente
              if (!categoriasAPI || categoriasAPI.length === 0) return false

              // Resolver la categoría padre por nombre/slug
              const parent = categoriasAPI.find(c => (c.parent_id === null || c.parent_id === undefined) && (
                (c.nombre && c.nombre.trim() === String(selectedCategory).trim()) ||
                slugifyPreserveCase(c.nombre || '') === slugifyPreserveCase(String(selectedCategory)) ||
                c.slug === selectedCategory ||
                slugifyPreserveCase(c.slug || '') === slugifyPreserveCase(String(selectedCategory))
              ))

              if (!parent) return false

              // Producto asignado directamente al padre mediante categoriaId
              if (product.categoriaId === parent.id) return true

              // Producto asignado a una subcategoría: verificar si el parent_id del child coincide
              if (product.categoriaId) {
                const child = categoriasAPI.find(c => c.id === product.categoriaId)
                if (child && child.parent_id === parent.id) return true
              }

              return false
            })())

      return matchesSearch && matchesCategory
    }).sort((a, b) => {
      // Si estamos en "Todas las categorías" (sin categoría seleccionada),
      // mostrar productos con promoción primero
      if (!selectedCategory) {
        const aHasPromo = a.hasPromotion ? 1 : 0
        const bHasPromo = b.hasPromotion ? 1 : 0
        // Ordenar descendente: productos con promo (1) van antes que sin promo (0)
        return bHasPromo - aHasPromo
      }
      // Si hay categoría seleccionada, mantener orden original
      return 0
    })
  }, [products, debouncedSearchTerm, selectedCategory, selectedSubcategoryId, categoriasAPI])

  // Resetear página al cambiar filtros o categoría
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedCategory, selectedSubcategoryId])

  // Paginar solo cuando "Todas las categorías" está seleccionada
  const showPagination = !selectedCategory
  const totalPages = showPagination ? Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)) : 1
  const displayedProducts = showPagination
    ? filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : filteredProducts

  const discount = calculateDiscount(subtotal)
  const total = subtotal - discount
  const skeletonCards = Array.from({ length: ITEMS_PER_PAGE }, (_, index) => index)

  // Función para obtener estilos de categoría
  const getCategoryStyle = (categoria) => {
    const categoryStyles = {
      'Carteles': {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        icon: '📋',
        color: 'white'
      },
      'Vinilos': {
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        icon: '🎨',
        color: 'white'
      },
      'Lonas': {
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        icon: '🏞️',
        color: 'white'
      },
      'Impresiones': {
        background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        icon: '🖨️',
        color: 'white'
      },
      'Stickers': {
        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        icon: '⭐',
        color: 'white'
      },
      'Banners': {
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        icon: '🚩',
        color: '#333'
      },
      'default': {
        background: 'linear-gradient(135deg, #2196F3 0%, #5dade2 100%)',
        icon: '🏷️',
        color: 'white'
      }
    }
    
    return categoryStyles[categoria] || categoryStyles.default
  }

  // Sincronizar selectedCategory (y selectedSubcategoryId) con la ruta actual.
  // Lee el slug de la URL y el query param ?subcat= para restaurar el estado al montar
  // o al navegar con back/forward. categoriasAPI se necesita para resolver el subcat slug → ID.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const path = router.asPath || ''
      // Extraer primer segmento después de /catalog/
      const match = path.match(/^\/catalog\/(?:categoria\/)?([^\/\?]+)/)
      const slug = match && match[1] ? match[1] : ''

      // Extraer query param ?subcat=
      const qIndex = path.indexOf('?')
      const subcatSlug = qIndex >= 0
        ? (new URLSearchParams(path.slice(qIndex + 1)).get('subcat') || '')
        : ''

      if (!slug) {
        setSelectedCategory('')
        setSelectedSubcategoryId(null)
        return
      }

      if (categoriesForDropdown && categoriesForDropdown.length > 0) {
        const found = categoriesForDropdown.find(c => slugifyPreserveCase(c) === slug)
        if (found) {
          setSelectedCategory(found)

          if (subcatSlug && categoriasAPI.length > 0) {
            // Resolver slug → ID de subcategoría
            const sub = categoriasAPI.find(c =>
              c.parent_id !== null &&
              slugifyPreserveCase(c.slug || c.nombre) === subcatSlug
            )
            setSelectedSubcategoryId(sub ? sub.id : null)
          } else if (!subcatSlug) {
            setSelectedSubcategoryId(null)
          }
          // Si subcatSlug existe pero categoriasAPI aún no cargó: no hacer nada;
          // el efecto se re-ejecuta cuando categoriasAPI llegue.
        }
      }
    } catch (e) {
      // ignore routing sync errors
    }
  }, [router.asPath, categoriesForDropdown, categoriasAPI])

  // Memoizar handlers para evitar recrear funciones en cada render
  // Category handlers for CategoryDropdown
  const handleSelectCategory = useCallback((catName) => {
    setSelectedCategory(catName)
    setSelectedSubcategoryId(null)
    router.push(`/catalog/${slugifyPreserveCase(catName)}`)
  }, [router])

  const handleSelectSubcategory = useCallback((subcatId, catName) => {
    const sub = categoriasAPI.find(c => c.id === subcatId)
    const subcatSlug = sub ? slugifyPreserveCase(sub.slug || sub.nombre) : String(subcatId)
    router.push(`/catalog/${slugifyPreserveCase(catName)}?subcat=${subcatSlug}`)
  }, [router, categoriasAPI])

  const handleClearCategory = useCallback(() => {
    setSelectedCategory('')
    setSelectedSubcategoryId(null)
    router.push('/catalog')
  }, [router])

  // ahora abrimos el modal indicando producto + índice de imagen
  const handleImageClick = useCallback((productId, index = 0) => {
    setImageModal({ productId, index })
  }, [])

  const handleAddToCart = useCallback((productId, quantity) => {
    const productToAdd = products.find(p => p.id === productId)
    if (productToAdd) {
      addToCart(productToAdd, quantity)
      createToast(`${productToAdd.nombre} agregado al carrito`, 'success')
    }
  }, [products, addToCart])

  // Using shared slugify helper from ../utils/slugify

  return (
    <PublicLayout title={seoConfig?.pagesSeo?.catalogo?.title || seoConfig?.siteTitle || 'Catálogo - KOND'}>
      <SeoHead
        config={seoConfig || {}}
        pageTitle={seoConfig?.pagesSeo?.catalogo?.title || undefined}
        pageDescription={seoConfig?.pagesSeo?.catalogo?.description || undefined}
      />
      <div className="catalog-container" style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        padding: '20px' 
      }}>
        {/* Section selector is rendered centered in the PublicLayout header for /catalog routes */}

        {/* Filtros */}
        <div className="filters-row" style={{
          gap: '16px',
          marginBottom: '24px',
          padding: '20px',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
            className="search-input"
          />
          
          <div style={{ position: 'relative' }}>
              {/* SectionSelector: render here in the original catalog header area so it
                  persists across category and product pages when Catalog is mounted. */}
              <CategoryDropdown
                categories={categoriesForDropdown}
                categoriasAPI={categoriasAPI}
                selectedCategory={selectedCategory}
                selectedSubcategoryId={selectedSubcategoryId}
                onSelectCategory={handleSelectCategory}
                onSelectSubcategory={handleSelectSubcategory}
                onClear={handleClearCategory}
              />
          </div>
        </div>

        {/* Grid de productos */}
        <div className="products-grid" style={{
          display: 'grid',
          gap: '24px',
          marginBottom: '24px',
          '--catalog-cols-desktop': gridColumnsDesktop,
          '--catalog-cols-mobile': gridColumnsMobile,
        }}>
          {isLoading
            ? skeletonCards.map((index) => <CatalogCardSkeleton key={`skeleton-${index}`} />)
            : displayedProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  promociones={promociones}
                  getCategoryStyle={getCategoryStyle}
                  onImageClick={handleImageClick}
                  onAddToCart={handleAddToCart}
                  materials={materials}
                  showControls={false}
                  showActions={false}
                  categoriasAPI={categoriasAPI}
                />
              ))}
        </div>

        {/* Paginación */}
        {showPagination && totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '40px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              style={{
                background: currentPage === 1 ? 'var(--bg-input)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: '38px', height: '38px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.4 : 1,
                fontSize: '1rem'
              }}
            >«</button>
            <button
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
              style={{
                background: currentPage === 1 ? 'var(--bg-input)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: '38px', height: '38px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.4 : 1,
                fontSize: '1rem'
              }}
            >‹</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((item, idx) =>
                item === '...' ? (
                  <span key={`dots-${idx}`} style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    style={{
                      background: item === currentPage ? 'var(--accent-blue)' : 'var(--bg-card)',
                      color: item === currentPage ? 'white' : 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      width: '38px', height: '38px',
                      cursor: 'pointer',
                      fontWeight: item === currentPage ? 700 : 400,
                      fontSize: '0.95rem'
                    }}
                  >{item}</button>
                )
              )
            }

            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
              style={{
                background: currentPage === totalPages ? 'var(--bg-input)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: '38px', height: '38px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.4 : 1,
                fontSize: '1rem'
              }}
            >›</button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              style={{
                background: currentPage === totalPages ? 'var(--bg-input)' : 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: '38px', height: '38px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: currentPage === totalPages ? 0.4 : 1,
                fontSize: '1rem'
              }}
            >»</button>

            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '8px' }}>
              Página {currentPage} de {totalPages}
            </span>
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)'
          }}>
            No se encontraron productos
          </div>
        )}

        {/* Lightbox para imagen de producto (navegable) */}
        {imageModal && (() => {
          const pid = imageModal.productId
          const idx = Number.isFinite(imageModal.index) ? imageModal.index : 0
          const prod = (products || []).find(p => p.id === pid)
          const imgs = prod?.imagenes || []
          const src = imgs[idx] || null

          if (!prod || !src) return null

          return (
            <div onClick={() => setImageModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
              <div onClick={(e) => e.stopPropagation()} style={{ width: '90vw', height: '90vh', maxWidth: '900px', maxHeight: '900px', position: 'relative', background: '#ffffff', borderRadius: 8, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button aria-label="Cerrar" onClick={() => setImageModal(null)} style={{ position: 'absolute', right: -8, top: -8, background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', zIndex: 2010 }}>✕</button>

                {/* Prev */}
                {imgs.length > 1 && (
                  <button aria-label="Anterior" onClick={() => setImageModal({ productId: pid, index: (idx - 1 + imgs.length) % imgs.length })} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: 'white', border: 'none', borderRadius: 6, width: 44, height: 44, cursor: 'pointer' }}>◀</button>
                )}

                <img src={src} alt={prod.nombre} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />

                {/* Next */}
                {imgs.length > 1 && (
                  <button aria-label="Siguiente" onClick={() => setImageModal({ productId: pid, index: (idx + 1) % imgs.length })} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', color: 'white', border: 'none', borderRadius: 6, width: 44, height: 44, cursor: 'pointer' }}>▶</button>
                )}

                {/* Dots */}
                {imgs.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
                    {imgs.map((_, i) => (
                      <button key={i} onClick={() => setImageModal({ productId: pid, index: i })} style={{ width: i === idx ? 12 : 8, height: i === idx ? 12 : 8, borderRadius: '50%', background: i === idx ? 'var(--accent-color)' : 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer' }} aria-label={`Imagen ${i + 1}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </PublicLayout>
  )
}

function CatalogCardSkeleton() {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '0 0 12px 12px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        paddingTop: '100%',
        background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)',
        backgroundSize: '400% 100%',
        animation: 'catalogSkeletonPulse 1.4s ease infinite'
      }} />

      <div style={{ padding: '16px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ width: '42%', height: '24px', borderRadius: '999px', background: '#e5e7eb' }} />
        <div style={{ width: '88%', height: '22px', borderRadius: '8px', background: '#e5e7eb' }} />
        <div style={{ width: '64%', height: '16px', borderRadius: '6px', background: '#e5e7eb' }} />
        <div style={{ width: '34%', height: '14px', borderRadius: '6px', background: '#e5e7eb' }} />
        <div style={{ width: '58%', height: '28px', borderRadius: '6px', background: '#dbeafe' }} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ width: '58px', height: '24px', borderRadius: '999px', background: '#dbeafe' }} />
          <div style={{ width: '86px', height: '24px', borderRadius: '999px', background: '#dcfce7' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ width: '48%', height: '24px', borderRadius: '6px', background: '#e5e7eb' }} />
          <div style={{ width: '42%', height: '28px', borderRadius: '999px', background: '#e5e7eb' }} />
        </div>
      </div>

      <style jsx>{`
        @keyframes catalogSkeletonPulse {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
    </div>
  )
}

// Componente de tarjeta de producto (memoizado para evitar re-renders innecesarios)
const ProductCard = memo(function ProductCard({ product, promociones = [], onAddToCart, getCategoryStyle, onImageClick, materials = [], showControls = false, showActions = true, categoriasAPI = [] }) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const hasPromo = product && product.hasPromotion && product.precioPromocional !== undefined && product.precioPromocional !== product.precioUnitario
  const displayPrice = hasPromo ? product.precioPromocional : (product.precioUnitario || 0)
  const activeTransferPromo = (() => {
    const transferPromos = (promociones || []).filter(p => (p.tipo || p.type) === 'transfer_discount')
    return getActivePromotions(transferPromos)[0] || null
  })()
  const transferBadgeText = activeTransferPromo?.badgeTexto || null
  const transferBadge = transferBadgeText
    ? (product?.promotionBadges || []).find(b => b.text === transferBadgeText) || null
    : null
  const transferDiscountAmount = activeTransferPromo ? applyTransferDiscount(promociones || [], displayPrice) : 0
  const transferPrice = transferDiscountAmount > 0 ? Math.max(0, displayPrice - transferDiscountAmount) : null

  // Pages catalog and home are ALWAYS light mode (admin uses dark mode)
  const isDarkTheme = false

  const resolveCategoriaDisplay = (prod) => {
    if (!prod.categoriaId || categoriasAPI.length === 0) {
      return { label: prod.categoria, isHierarchy: false }
    }
    const sub = categoriasAPI.find(c => c.id === prod.categoriaId)
    if (!sub) return { label: prod.categoria, isHierarchy: false }
    if (sub.parent_id) {
      const parent = categoriasAPI.find(c => c.id === sub.parent_id)
      return { label: sub.nombre, parent: parent?.nombre, isHierarchy: true }
    }
    return { label: sub.nombre, isHierarchy: false }
  }

  // Obtener información del material
  const getMaterialInfo = () => {
    if (materials.length === 0) return null
    
    // Primero intentar por materialId
    if (product.materialId) {
      const material = materials.find(m => String(m.id) === String(product.materialId))
      if (material) return material
    }
    
    // Si no hay materialId, intentar por nombre del material (para compatibilidad con productos antiguos)
    if (product.material) {
      const material = materials.find(m => m.nombre === product.material)
      if (material) return material
    }
    
    return null
  }

  const materialInfo = getMaterialInfo()

  // Índice actual de la imagen mostrada (para productos con múltiples imágenes)
  const [imageIndex, setImageIndex] = useState(0)

  // Resetear índice si cambian las imágenes del producto
  useEffect(() => {
    setImageIndex(0)
  }, [product.imagenes?.length])

  // Track small viewport on the client to avoid intercepting taps with
  // preview controls on mobile. We initialize as false (safe for SSR) and
  // update on mount and resize.
  const [isClientMobile, setIsClientMobile] = useState(false)
  useEffect(() => {
    const check = () => {
      try { setIsClientMobile(typeof window !== 'undefined' && window.innerWidth <= 640) } catch { setIsClientMobile(false) }
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleAddToCart = () => {
    onAddToCart(product.id, quantity)
    setQuantity(1)
  }

  const navigateToProduct = () => {
    try {
      // Si el producto tiene subcategoría resuelta → URL de 3 segmentos
      if (product.categoriaId && categoriasAPI.length > 0) {
        const sub = categoriasAPI.find(c => c.id === product.categoriaId)
        if (sub?.parent_id) {
          const parent = categoriasAPI.find(c => c.id === sub.parent_id)
          if (parent) {
            const parentSlug = slugifyPreserveCase(parent.slug || parent.nombre)
            const subSlug = slugifyPreserveCase(sub.slug || sub.nombre)
            const prodSlug = slugifyPreserveCase(product.nombre)
            router.push(`/catalog/${parentSlug}/${subSlug}/${prodSlug}`)
            return
          }
        }
      }
      // Fallback: URL de 2 segmentos (productos sin subcategoría o sin API)
      const catSlug = slugifyPreserveCase(product.categoria)
      const prodSlug = slugifyPreserveCase(product.nombre)
      router.push(`/catalog/${catSlug}/${prodSlug}`)
    } catch (e) {
      router.push('/catalog')
    }
  }

  return (
    <div
      className="product-card"
      onClick={navigateToProduct}
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {/* Imagen del producto (ahora soporta varias imágenes con control prev/next) */}
      <div style={{
        position: 'relative',
        paddingTop: '100%',
        background: '#ffffff'
      }}>
        {product.imagenes && product.imagenes.length > 0 ? (
          <>
                <img
                  src={product.imagenes[imageIndex]}
                  alt={product.nombre}
                  loading="lazy"
                  onClick={(e) => {
                    // On small viewports we want tapping the image to navigate to the product page.
                    // Desktop behavior: open image lightbox. We must prevent the preview controls
                    // (prev/next/dots) from being interactive on small viewports so the tap navigates.
                    // If client mobile, navigate immediately and stop further handling.
                    if (isClientMobile) {
                      // stopPropagation to avoid the parent onClick navigate firing twice
                      e.stopPropagation && e.stopPropagation()
                      navigateToProduct()
                      return
                    }

                    // Desktop: open image lightbox
                    e.stopPropagation()
                    onImageClick && onImageClick(product.id, imageIndex)
                  }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    cursor: 'zoom-in'
                  }}
                />

            {/* Prev / Next buttons */}
            {product.imagenes.length > 1 && (
              <>
                <button
                  aria-label="Anterior"
                  onClick={(e) => { e.stopPropagation(); if (!isClientMobile) setImageIndex(i => (i - 1 + product.imagenes.length) % product.imagenes.length) }}
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.45)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    width: 34,
                    height: 34,
                    cursor: 'pointer'
                  }}
                >◀</button>

                <button
                  aria-label="Siguiente"
                  onClick={(e) => { e.stopPropagation(); if (!isClientMobile) setImageIndex(i => (i + 1) % product.imagenes.length) }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.45)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    width: 34,
                    height: 34,
                    cursor: 'pointer'
                  }}
                >▶</button>
              </>
            )}

            {/* Dots indicadores clicables */}
            {product.imagenes.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '6px',
                alignItems: 'center'
              }}>
                {product.imagenes.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => { e.stopPropagation(); if (!isClientMobile) setImageIndex(index) }}
                    aria-label={`Mostrar imagen ${index + 1}`}
                    style={{
                      width: index === imageIndex ? 10 : 8,
                      height: index === imageIndex ? 10 : 8,
                      borderRadius: '50%',
                      background: index === imageIndex ? 'var(--accent-color)' : 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(0,0,0,0.15)',
                      padding: 0,
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem'
          }}>
            Sin imagen
          </div>
        )}
      </div>

      {/* Info del producto */}
      <div style={{ padding: '16px 20px 20px 20px' }}>
        {/* Título debajo de la imagen */}
        <h3 style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-primary, #e0e0e0)',
          margin: 0,
          marginBottom: '10px',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          <span
            onClick={(e) => { e.stopPropagation(); navigateToProduct() }}
            style={{ cursor: 'pointer' }}
          >
            {product.nombre}
          </span>
        </h3>
          {(() => {
            const secondaryTextColor = isDarkTheme ? '#d1d5db' : '#1f2937' // gray-800 for better contrast
            const categoryStyle = getCategoryStyle(product.categoria)
            // Ajustar estilo según tema: en versión light usar fondo más oscuro para visibilidad
            const badgeBackground = isDarkTheme ? 'transparent' : '#d1d5db' // gray-300 for better visibility
            // En dark: texto blanco con borde; en light: texto más oscuro sobre fondo más oscuro
            const badgeTextColor = isDarkTheme ? '#ffffff' : '#111827' // gray-900 for better contrast
            const badgeBorder = isDarkTheme ? `1px solid ${categoryStyle.color || 'rgba(0,0,0,0.12)'}` : 'none'
            
            return (
              <>
                {product.categoria && (
                  <div
                    className="category-badge"
                    aria-hidden={false}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: '2px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      background: badgeBackground,
                      color: badgeTextColor,
                      border: badgeBorder,
                      marginBottom: '10px',
                      cursor: 'default'
                    }}
                  >
                    {(() => {
                      const cat = resolveCategoriaDisplay(product)
                      if (cat.isHierarchy) {
                        return (
                          <>
                            <span style={{ opacity: 0.65, fontSize: '0.72rem', color: 'inherit' }}>{cat.parent}</span>
                            <span style={{ margin: '0 3px', opacity: 0.5, color: 'inherit' }}>›</span>
                            <span style={{ color: 'inherit' }}>{cat.label}</span>
                          </>
                        )
                      }
                      return <span style={{ color: 'inherit' }}>{cat.label || product.categoria}</span>
                    })()}
                  </div>
                )}
                
                {product.medidas && (
                  <p style={{
                    color: secondaryTextColor,
                    fontSize: '0.9rem',
                    marginBottom: '8px'
                  }}>
                    {product.medidas}
                  </p>
                )}

                {/* Material info removed from general catalog view - only shown on individual product page */}
              </>
            )
          })()}

        {/* category badge moved above title; duplicate removed */}

        <div className="product-price" style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
            {hasPromo && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                {formatCurrency(product.precioUnitario || 0)}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: hasPromo ? '1.2rem' : '1.1rem', fontWeight: hasPromo ? 800 : 700, color: hasPromo ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                {formatCurrency(displayPrice)}
              </div>

              {product && product.promotionBadges && product.promotionBadges.filter(b => b.type !== 'transfer_discount').length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {product.promotionBadges.filter(b => b.type !== 'transfer_discount').map((badge, idx) => {
                    const opacity = badge.opacity ?? 100
                    const bgColor = badge.color || '#3b82f6'
                    const hex = bgColor.replace('#', '')
                    const r = parseInt(hex.substring(0, 2), 16)
                    const g = parseInt(hex.substring(2, 4), 16)
                    const b = parseInt(hex.substring(4, 6), 16)
                    return (
                      <span
                        key={idx}
                        style={{
                          background: `rgba(${r}, ${g}, ${b}, ${opacity / 100})`,
                          color: badge.textColor || '#ffffff',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {badge.text}
                      </span>
                    )
                  })}
                </div>
              )}

              {product && product.promoBadge && (!product.promotionBadges || product.promotionBadges.filter(b => b.type !== 'transfer_discount').length === 0) && (
                <span style={{
                  background: '#3b82f6',
                  color: '#fff',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}>
                  {product.promoBadge}
                </span>
              )}

              {showControls && product.stock !== undefined && product.stock !== null && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: product.stock > 10 ? 'rgba(16, 185, 129, 0.1)' : product.stock > 0 ? 'rgba(251, 191, 36, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  color: product.stock > 10 ? '#10b981' : product.stock > 0 ? '#f59e0b' : '#ef4444',
                  border: `1px solid ${product.stock > 10 ? '#10b981' : product.stock > 0 ? '#f59e0b' : '#ef4444'}`
                }}>
                  <span>Stock: {product.stock}</span>
                </div>
              )}
            </div>

            {transferPrice !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatCurrency(transferPrice)}
                </div>
                {transferBadge && (() => {
                  const opacity = transferBadge.opacity ?? 100
                  const bgColor = transferBadge.color || '#9ca3af'
                  const hex = bgColor.replace('#', '')
                  const r = parseInt(hex.substring(0, 2), 16)
                  const g = parseInt(hex.substring(2, 4), 16)
                  const b = parseInt(hex.substring(4, 6), 16)
                  return (
                    <span style={{
                      background: `rgba(${r}, ${g}, ${b}, ${opacity / 100})`,
                      color: transferBadge.textColor || '#111827',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}>
                      {transferBadge.text}
                    </span>
                  )
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Controles de cantidad y botón */}
        {showActions && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          padding: '0 20px 20px 20px'
        }}>
          {/* Selector de cantidad: solo visible cuando showControls=true (carrito/checkout) */}
          {showControls && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  background: 'var(--bg-hover)',
                  border: 'none',
                  padding: '6px 10px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  width: '40px',
                  textAlign: 'center',
                  padding: '6px 4px',
                  fontSize: '0.9rem'
                }}
                min="1"
                max="999"
              />
              <button
                onClick={() => setQuantity(Math.min(999, quantity + 1))}
                style={{
                  background: 'var(--bg-hover)',
                  border: 'none',
                  padding: '6px 10px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                +
              </button>
            </div>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); handleAddToCart() }}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'var(--accent-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Agregar al carrito
          </button>
        </div>
        )}
      </div>
    </div>
  )
})

export async function getServerSideProps() {
  try {
    const seoConfig = await getSeoConfigServer()
    return { props: { seoConfig } }
  } catch {
    return { props: { seoConfig: null } }
  }
}

