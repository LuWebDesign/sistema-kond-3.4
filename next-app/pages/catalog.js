import PublicLayout from '../components/PublicLayout'
import { useProducts, useCart, useCoupons } from '../hooks/useCatalog'
import { 
  formatCurrency, 
  getCurrentUser,
  createToast
} from '../utils/catalogUtils'
import { getCatalogStyles } from '../utils/supabaseCatalogStyles'
import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useRouter } from 'next/router'
import { slugifyPreserveCase } from '../utils/slugify'
// SectionSelector is rendered by PublicLayout for all /catalog routes.
// Remove local import to avoid duplicate selectors.

export default function Catalog() {
  const router = useRouter()
  const { products, categories, materials, isLoading } = useProducts()
  const { addToCart, subtotal } = useCart()
  const { calculateDiscount } = useCoupons()

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [currentUserState, setCurrentUserState] = useState(null)
  // imageModal: { productId: Number, index: Number } or null
  const [imageModal, setImageModal] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 12
  const [gridColumnsDesktop, setGridColumnsDesktop] = useState(3)
  const [gridColumnsMobile, setGridColumnsMobile] = useState(2)

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

  // Debounce para la búsqueda (300ms)
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
    
    // Buscar la categoría si ya está cargada, sino el useEffect lo hará
    if (categories && categories.length > 0) {
      const foundCategory = categories.find(category => {
        if (!category) return false
        const categorySlug = slugifyPreserveCase(category)
        return categorySlug === slug
      })
      
      if (foundCategory) {
        setSelectedCategory(foundCategory)
      }
    }
    // Si categories no está listo, el useEffect de sincronización con router.asPath lo manejará
  }, [categories])

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
      
      const matchesCategory = !selectedCategory || 
        (product.categoria && product.categoria.trim() === selectedCategory.trim())
      
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
  }, [products, debouncedSearchTerm, selectedCategory])

  // Resetear página al cambiar filtros o categoría
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedCategory])

  // Paginar solo cuando "Todas las categorías" está seleccionada
  const showPagination = !selectedCategory
  const totalPages = showPagination ? Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)) : 1
  const displayedProducts = showPagination
    ? filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    : filteredProducts

  const discount = calculateDiscount(subtotal)
  const total = subtotal - discount

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
        background: 'linear-gradient(135deg, var(--accent-blue) 0%, #5dade2 100%)',
        icon: '🏷️',
        color: 'white'
      }
    }
    
    return categoryStyles[categoria] || categoryStyles.default
  }

  // Sincronizar selectedCategory con la ruta actual para evitar que la selección
  // se pierda cuando se navega a /catalog/:slug y hay re-mounts o eventos asíncronos.
  // Esto toma la parte de la URL después de /catalog/ y busca la categoría correspondiente.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      const path = router.asPath || ''
      // Extraer primer segmento después de /catalog/
      const match = path.match(/^\/catalog\/(?:categoria\/)?([^\/\?]+)/)
      const slug = match && match[1] ? match[1] : ''

      if (!slug) {
        // Si la URL es /catalog o no tiene slug, limpiar la selección
        setSelectedCategory('')
        return
      }

      // Buscar la categoría que corresponda al slug
      if (categories && categories.length) {
        const found = categories.find(c => slugifyPreserveCase(c) === slug)
        if (found) {
          setSelectedCategory(found)
        } else {
          // No limpiar la selección si la categoría aún no está cargada;
          // esto evita que la UI vuelva a 'Todas' en transiciones asíncronas.
          // Mantener el estado actual hasta que categories se actualice.
        }
      }
    } catch (e) {
      // ignore routing sync errors
    }
  }, [router.asPath, categories])

  // Memoizar handlers para evitar recrear funciones en cada render
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
    <PublicLayout title="Catálogo - KOND">
      <div className="catalog-container" style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        padding: '20px' 
      }}>
        {/* Header del catálogo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>🛒 Nuestros Productos</h1>

            {/* Section selector removed from here — PublicLayout renders it centered below the header for /catalog routes */}
          </div>
        </div>

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
              <select
              value={slugifyPreserveCase(selectedCategory)}
              onChange={(e) => {
                const v = e.target.value
                // Actualizar el estado local inmediatamente para que el filtro aplique al instante
                const found = categories.find(c => slugifyPreserveCase(c) === v)
                setSelectedCategory(found || '')

                if (!v) {
                  // volver a listado general (SPA)
                  router.push('/catalog')
                } else {
                  // navegar a la URL de categoría usando slug (SPA)
                  router.push(`/catalog/${v}`)
                }
              }}
              style={{
                padding: '12px 16px',
                border: '2px solid var(--border-color)',
                borderRadius: '12px',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontWeight: '500',
                minWidth: '200px',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns%3d%27http%3a//www.w3.org/2000/svg%27 width%3d%2712%27 height%3d%2712%27 viewBox%3d%270 0 12 12%27%3e%3cpath fill%3d%27%23666%27 d%3d%27M6 8L2 4h8z%27/%3e%3c/svg%3e")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '12px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              className="category-select"
              onMouseEnter={(e) => {
                e.target.style.borderColor = 'var(--accent-blue)'
                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = 'var(--border-color)'
                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                🏷️ Todas las categorías
              </option>
              {categories.map(category => {
                const categoryStyle = getCategoryStyle(category)
                const slug = slugifyPreserveCase(category)
                return (
                  <option 
                    key={category} 
                    value={slug}
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  >
                    {categoryStyle.icon} {category}
                  </option>
                )
              })}
            </select>
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
          {displayedProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              getCategoryStyle={getCategoryStyle}
              onImageClick={handleImageClick}
              onAddToCart={handleAddToCart}
              materials={materials}
              showControls={false}
              showActions={false}
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
// Componente de tarjeta de producto (memoizado para evitar re-renders innecesarios)
const ProductCard = memo(function ProductCard({ product, onAddToCart, getCategoryStyle, onImageClick, materials = [], showControls = false, showActions = true }) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  // ProductCard will use the shared slugify helper imported above

  // Detectar tema (dark vs light) para ajustar estilos de badge de categoría
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      
      // Función para detectar el tema actual desde data-theme del body
      const getTheme = () => {
        const theme = document.body.getAttribute('data-theme')
        return theme === 'dark'
      }
      
      setIsDarkTheme(getTheme())

      // Observar cambios en el atributo data-theme del body
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
            setIsDarkTheme(getTheme())
          }
        })
      })

      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-theme']
      })

      return () => observer.disconnect()
    } catch (e) {
      // ignore
    }
  }, [])

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

  // --- Accessibility / behavior: on small viewports tapping the image should
  // navigate to the product page instead of changing the preview. For desktop
  // we keep the ability to change the preview via arrows/dots. We guard image
  // preview controls so they only act on pointer events when viewport width
  // is > 640px; on smaller screens we let the image click navigate.
  const isSmallViewport = () => {
    try { return typeof window !== 'undefined' && window.innerWidth <= 640 } catch { return false }
  }

  const handleAddToCart = () => {
    onAddToCart(product.id, quantity)
    setQuantity(1)
  }

  const navigateToProduct = () => {
    try {
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
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden',
        cursor: 'pointer'
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
                    try {
                      if (isSmallViewport()) {
                        navigateToProduct()
                        return
                      }
                    } catch (err) { /* ignore and continue with desktop behavior */ }

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
                  onClick={(e) => { e.stopPropagation(); if (!isSmallViewport()) setImageIndex(i => (i - 1 + product.imagenes.length) % product.imagenes.length) }}
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
                  onClick={(e) => { e.stopPropagation(); if (!isSmallViewport()) setImageIndex(i => (i + 1) % product.imagenes.length) }}
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
                    onClick={(e) => { e.stopPropagation(); if (!isSmallViewport()) setImageIndex(index) }}
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
          color: 'var(--text-primary)',
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
            const secondaryTextColor = isDarkTheme ? '#d1d5db' : 'var(--text-secondary)'
            const categoryStyle = getCategoryStyle(product.categoria)
            // Ajustar estilo según tema: en versión light usar fondo gris claro y texto gris oscuro
            const badgeBackground = isDarkTheme ? 'transparent' : '#f3f4f6' // gray-100
            // En dark: texto blanco con borde; en light: texto gris oscuro sobre fondo gris claro
            const badgeTextColor = isDarkTheme ? '#ffffff' : '#374151' // gray-700
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
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      background: badgeBackground,
                      border: badgeBorder,
                      marginBottom: '10px',
                      cursor: 'default'
                    }}
                  >
                    <span>{product.categoria}</span>
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

                {materialInfo && (
                  <p style={{
                    color: secondaryTextColor,
                    fontSize: '0.9rem',
                    marginBottom: '8px'
                  }}>
                    Material: {materialInfo.nombre} • {materialInfo.tipo} • {materialInfo.espesor || 'N/A'}mm
                  </p>
                )}
                
                {!materialInfo && product.tipoMaterial && (
                  <p style={{
                    color: secondaryTextColor,
                    fontSize: '0.9rem',
                    marginBottom: '8px'
                  }}>
                    Material: {product.tipoMaterial}
                  </p>
                )}
              </>
            )
          })()}

        {/* category badge moved above title; duplicate removed */}

        <div className="product-price" style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          marginBottom: '16px'
        }}>
          {/* Mostrar precio con promoción si corresponde */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {product && product.hasPromotion && product.precioPromocional !== undefined && product.precioPromocional !== product.precioUnitario ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>{formatCurrency(product.precioUnitario || 0)}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue)' }}>{formatCurrency(product.precioPromocional)}</div>
              </div>
            ) : (
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(product.precioUnitario || 0)}</div>
            )}

            {/* Mostrar badges de promoción al lado del precio */}
            {product && product.promotionBadges && product.promotionBadges.length > 0 && (
              <div style={{ display: 'flex', gap: '4px' }}>
                {product.promotionBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    style={{
                      backgroundColor: badge.color || '#ef4444',
                      color: badge.textColor || '#ffffff',
                      padding: '3px 6px',
                      borderRadius: '10px',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}
                  >
                    {badge.text}
                  </span>
                ))}
              </div>
            )}

            {/* Indicador de stock al lado del precio (más pequeño, sin icono) */}
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

