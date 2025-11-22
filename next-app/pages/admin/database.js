import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency } from '../../utils/catalogUtils'
import { getAllProductos, updateProducto, deleteProducto } from '../../utils/supabaseProducts'
import styles from '../../styles/pedidos-catalogo.module.css'
import dynamic from 'next/dynamic'

// Componente sin SSR para evitar hydration mismatches
const Database = dynamic(() => Promise.resolve(DatabaseComponent), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div>Cargando base de datos...</div>
    </div>
  )
});

function DatabaseComponent() {
  const [products, setProducts] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    visibility: 'visible', // 'visible', 'hidden', 'all'
    category: 'all',
    material: 'all',
    type: 'all'
  })
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [materials, setMaterials] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Cargar productos desde Supabase
  const loadProducts = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    setIsLoading(true)
    try {
      const { data: productList, error } = await getAllProductos()
      
      if (error) {
        console.error('Error loading products from Supabase:', error)
        setProducts([])
        return
      }
      
      // Mapear campos de snake_case a camelCase y calcular costo material
      const mappedProducts = (productList || []).map(p => {
        // Calcular costo material basado en la fórmula: costoPlaca / unidadesPorPlaca
        const unidadesPorPlaca = p.unidades_por_placa || 1
        const costoPlaca = p.costo_placa || 0
        const costoMaterialCalculado = unidadesPorPlaca > 0 ? costoPlaca / unidadesPorPlaca : 0
        
        return {
          id: p.id,
          nombre: p.nombre,
          categoria: p.categoria,
          tipo: p.tipo,
          medidas: p.medidas,
          tiempoUnitario: p.tiempo_unitario || '00:00:30',
          unidades: p.unidades || 1,
          unidadesPorPlaca: unidadesPorPlaca,
          usoPlacas: p.uso_placas || 0,
          costoPlaca: costoPlaca,
          costoMaterial: parseFloat(costoMaterialCalculado.toFixed(2)),
          margenMaterial: p.margen_material || 0,
          precioUnitario: p.precio_unitario || 0,
          precioPromos: p.precio_promos || 0,
          stock: p.stock || 0,
          ensamble: p.ensamble || 'Sin ensamble',
          material: p.material || '',
          materialId: p.material_id || '',
          active: p.active !== undefined ? p.active : true,
          publicado: p.publicado !== undefined ? p.publicado : false,
          hiddenInProductos: p.hidden_in_productos || false,
          imagen: (p.imagenes_urls && p.imagenes_urls.length > 0) ? p.imagenes_urls[0] : '',
          imagenes: p.imagenes_urls || [],
          fechaCreacion: p.created_at || new Date().toISOString()
        }
      })
      
      setProducts(mappedProducts)
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Cargar materiales desde Supabase con fallback a localStorage
  const loadMaterials = useCallback(async () => {
    if (typeof window === 'undefined') return
    
    try {
      // Intentar cargar desde Supabase primero
      const { getAllMateriales } = await import('../../utils/supabaseMateriales')
      const { data: materialesSupabase, error } = await getAllMateriales()
      
      if (materialesSupabase && !error && materialesSupabase.length > 0) {
        // Mapear de snake_case a camelCase
        const mappedMateriales = materialesSupabase.map(m => ({
          id: m.id,
          nombre: m.nombre,
          tipo: m.tipo,
          tamano: m.tamano,
          espesor: m.espesor,
          unidad: m.unidad || 'cm',
          costoUnitario: m.costo_unitario || 0,
          proveedor: m.proveedor,
          stock: m.stock || 0,
          notas: m.notas
        }))
        
        setMaterials(mappedMateriales)
        // console.log('✅ Materiales cargados desde Supabase en database:', mappedMateriales.length)
        return
      }
      
      // Fallback: localStorage si Supabase está vacío o falla
      console.warn('⚠️ Fallback a localStorage para materiales en database')
      const stored = localStorage.getItem('materiales')
      const materialList = stored ? JSON.parse(stored) : []
      setMaterials(materialList)
    } catch (error) {
      console.error('Error loading materials:', error)
      // Último recurso: localStorage
      try {
        const stored = localStorage.getItem('materiales')
        const materialList = stored ? JSON.parse(stored) : []
        setMaterials(materialList)
      } catch (e) {
        console.error('Error loading materials from localStorage:', e)
        setMaterials([])
      }
    }
  }, [])

  // Ya no guardamos en localStorage, se guarda directamente en Supabase
  // Esta función ya no es necesaria pero la mantenemos para compatibilidad
  const saveProducts = useCallback((productList) => {
    try {
      localStorage.setItem('productosBase', JSON.stringify(productList))
    } catch (error) {
      console.error('Error saving products:', error)
    }
  }, [])

  // Calcular productos filtrados y ordenados con useMemo (optimización)
  const filteredProducts = useMemo(() => {
    let filtered = [...products]

    // Filtro de visibilidad
    if (filters.visibility === 'visible') {
      filtered = filtered.filter(p => p.active !== false)
    } else if (filters.visibility === 'hidden') {
      filtered = filtered.filter(p => p.active === false)
    }

    // Filtro de búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(p => 
        p.nombre?.toLowerCase().includes(searchTerm) ||
        p.categoria?.toLowerCase().includes(searchTerm) ||
        p.tipo?.toLowerCase().includes(searchTerm) ||
        p.medidas?.toLowerCase().includes(searchTerm) ||
        p.material?.toLowerCase().includes(searchTerm) ||
        String(p.id).includes(searchTerm)
      )
    }

    // Filtro por categoría
    if (filters.category !== 'all') {
      filtered = filtered.filter(p => p.categoria === filters.category)
    }

    // Filtro por material
    if (filters.material !== 'all') {
      filtered = filtered.filter(p => p.material === filters.material)
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.tipo === filters.type)
    }

    // Aplicar ordenamiento
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        // Manejar valores numéricos
        if (typeof aValue === 'number' || typeof bValue === 'number') {
          aValue = Number(aValue) || 0
          bValue = Number(bValue) || 0
        } else {
          // Manejar valores de texto
          aValue = String(aValue || '').toLowerCase()
          bValue = String(bValue || '').toLowerCase()
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [products, filters, sortConfig])

  // Paginación: estado y computados
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage))

  // Resetear página cuando cambien filtros u orden
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, sortConfig, filteredProducts.length])

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProducts.slice(start, start + itemsPerPage)
  }, [filteredProducts, currentPage])

  // Manejar ordenamiento
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Cambiar visibilidad del producto
  const toggleProductVisibility = async (id) => {
    const product = products.find(p => p.id === id)
    if (!product) return
    
    const newActiveState = !product.active
    
    try {
      const { error } = await updateProducto(id, { active: newActiveState })
      
      if (error) {
        console.error('Error updating visibility:', error)
        alert('Error al cambiar la visibilidad del producto')
        return
      }
      
      // Actualizar estado local
      const updatedProducts = products.map(p => 
        p.id === id ? { ...p, active: newActiveState } : p
      )
      setProducts(updatedProducts)
    } catch (error) {
      console.error('Error updating visibility:', error)
      alert('Error al cambiar la visibilidad del producto')
    }
  }

  // Cambiar estado de publicación
  const toggleProductPublished = async (id) => {
    const product = products.find(p => p.id === id)
    if (!product) return
    
    const newPublishedState = !product.publicado
    
    try {
      const { error } = await updateProducto(id, { publicado: newPublishedState })
      
      if (error) {
        console.error('Error updating published state:', error)
        alert('Error al cambiar el estado de publicación')
        return
      }
      
      // Actualizar estado local
      const updatedProducts = products.map(p => 
        p.id === id ? { ...p, publicado: newPublishedState } : p
      )
      setProducts(updatedProducts)
    } catch (error) {
      console.error('Error updating published state:', error)
      alert('Error al cambiar el estado de publicación')
    }
  }

  // Eliminar producto
  const handleDeleteProduct = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return
    }
    
    try {
      const { error } = await deleteProducto(id)
      
      if (error) {
        console.error('Error deleting product:', error)
        alert('Error al eliminar el producto')
        return
      }
      
      // Actualizar estado local
      const updatedProducts = products.filter(p => p.id !== id)
      setProducts(updatedProducts)
      
      alert('Producto eliminado exitosamente')
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error al eliminar el producto')
    }
  }

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = [
      'ID', 'Nombre', 'Categoría', 'Material', 'Tipo', 'Medidas',
      'Costo Placa', 'Unidades por Placa', 'Stock',
      'Precio Unitario', 'Precio Promos', 'Tiempo Unitario',
      'Uso Placas', 'Costo Material', 'Margen Material (%)',
      'Ensamble', 'Activo', 'Publicado'
    ]
    
    const data = filteredProducts.map(p => [
      p.id,
      p.nombre,
      p.categoria,
      p.material || '',
      p.tipo,
      p.medidas,
      p.costoPlaca,
      p.unidadesPorPlaca,
      p.stock || 0,
      p.precioUnitario,
      (p.precioPromos !== undefined && p.precioPromos !== null) ? p.precioPromos : p.precioUnitario,
      p.tiempoUnitario,
      p.usoPlacas,
      p.costoMaterial,
      p.margenMaterial,
      p.ensamble,
      p.active !== false ? 'Sí' : 'No',
      p.publicado ? 'Sí' : 'No'
    ])

    let csvContent = headers.join(',') + '\n'
    data.forEach(row => {
      csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n'
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Obtener categorías únicas
  const getUniqueCategories = () => {
    return [...new Set(products.map(p => p.categoria).filter(Boolean))]
  }

  // Obtener información completa del material
  const getMaterialInfo = (materialName) => {
    if (!materialName) return null
    return materials.find(m => m.nombre === materialName)
  }

  // Obtener materiales únicos
  const getUniqueMaterials = () => {
    return [...new Set(products.map(p => p.material).filter(Boolean))]
  }

  // Efectos
  useEffect(() => {
    loadProducts()
    loadMaterials()
  }, [loadProducts, loadMaterials])

  // Escuchar actualizaciones desde la página de Productos
  useEffect(() => {
    const handleProductsUpdated = () => {
      loadProducts()
    }
    window.addEventListener('productos:updated', handleProductsUpdated)
    const storageListener = (e) => {
      if (e.key === 'productos_updated') {
        loadProducts()
      }
    }
    window.addEventListener('storage', storageListener)
    return () => {
      window.removeEventListener('productos:updated', handleProductsUpdated)
      window.removeEventListener('storage', storageListener)
    }
  }, [loadProducts])

  // Ya no necesitamos useEffect para applyFiltersAndSort porque usamos useMemo

  // Obtener icono de ordenamiento
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  return (
    <Layout title="Base de Datos - Sistema KOND">
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--person-color)',
            marginBottom: '8px'
          }}>
            🗄️ Base de Datos de Productos
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Vista completa de todos los productos con filtros avanzados
          </p>
        </div>

        {/* Indicador de carga */}
        {isLoading && (
          <div style={{
            background: 'var(--accent-blue)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.9rem'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid white',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            Cargando productos desde Supabase...
          </div>
        )}

        {/* Controles y Filtros */}
        <div className={styles.filtersSection}>
          <button 
            className={styles.filtersToggle}
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            aria-expanded={isFiltersOpen}
          >
            <span className={styles.filtersTitle}>🔍 Búsqueda y Filtros</span>
            <span className={styles.filtersToggleIcon}>{isFiltersOpen ? '▼' : '▶'}</span>
          </button>
          
          <div className={`${styles.filtersContent} ${isFiltersOpen ? styles.filtersContentOpen : ''}`}>
            <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            {/* Búsqueda */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Buscar
              </label>
              <input
                type="text"
                placeholder="ID, nombre, categoría, tipo, material, medidas..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Filtro de visibilidad */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Visibilidad
              </label>
              <select
                value={filters.visibility}
                onChange={(e) => setFilters(prev => ({ ...prev, visibility: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="visible">Visibles</option>
                <option value="hidden">Ocultos</option>
                <option value="all">Todos</option>
              </select>
            </div>

            {/* Filtro de categoría */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Categoría
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="all">Todas</option>
                {getUniqueCategories().map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Filtro de material */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Material
              </label>
              <select
                value={filters.material}
                onChange={(e) => setFilters(prev => ({ ...prev, material: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="all">Todos</option>
                {getUniqueMaterials().map(mat => (
                  <option key={mat} value={mat}>{mat}</option>
                ))}
              </select>
            </div>

            {/* Filtro de tipo */}
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Tipo
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="all">Todos</option>
                <option value="Venta">Venta</option>
                <option value="Presupuesto">Presupuesto</option>
                <option value="Stock">Stock</option>
              </select>
            </div>
          </div>

          {/* Acciones */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)'
          }}>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>
              Mostrando {filteredProducts.length} de {products.length} productos
            </div>

            <button
              onClick={exportToCSV}
              disabled={filteredProducts.length === 0}
              style={{
                background: filteredProducts.length > 0 ? 'var(--accent-blue)' : 'var(--text-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                cursor: filteredProducts.length > 0 ? 'pointer' : 'not-allowed',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              📊 Exportar CSV
            </button>
          </div>
          </div>
        </div>

        {/* Tabla */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {filteredProducts.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem'
              }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('id')}>
                      ID {getSortIcon('id')}
                    </th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('nombre')}>
                      Nombre {getSortIcon('nombre')}
                    </th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('categoria')}>
                      Categoría {getSortIcon('categoria')}
                    </th>
                    <th style={thStyle}>Material</th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('tipo')}>
                      Tipo {getSortIcon('tipo')}
                    </th>
                    <th style={thStyle}>Medidas</th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('costoPlaca')}>
                      Costo Placa {getSortIcon('costoPlaca')}
                    </th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('unidadesPorPlaca')}>
                      Unid/Placa {getSortIcon('unidadesPorPlaca')}
                    </th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('stock')}>
                      Stock {getSortIcon('stock')}
                    </th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('precioUnitario')}>
                      Precio {getSortIcon('precioUnitario')}
                    </th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('precioPromos')}>
                      Precio Promos {getSortIcon('precioPromos')}
                    </th>
                    <th style={thStyle}>Tiempo</th>
                    <th style={thStyle}>Estados</th>
                    <th style={thStyle}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product, index) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      isEven={index % 2 === 0}
                      materials={materials}
                      onToggleVisibility={toggleProductVisibility}
                      onTogglePublished={toggleProductPublished}
                      onDelete={handleDeleteProduct}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: currentPage === 1 ? 'var(--bg-section)' : 'var(--accent-blue)', color: currentPage === 1 ? 'var(--text-secondary)' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >◀ Prev</button>

              
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1
                  // Mostrar todos si <= 7 páginas, si no mostrar extremos y entorno del actual
                  if (totalPages <= 7 || Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        aria-current={page === currentPage}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: page === currentPage ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)', background: page === currentPage ? 'var(--accent-blue)' : 'var(--bg-section)', color: page === currentPage ? 'white' : 'var(--text-primary)', cursor: 'pointer' }}
                      >{page}</button>
                    )
                  }
                  // Insertar separador si se ha mostrado un botón y el siguiente está muy lejos
                  const shouldShowEllipsis = (i === 1 && currentPage > 3) || (i === totalPages - 2 && currentPage < totalPages - 2)
                  return shouldShowEllipsis ? <span key={page}>…</span> : null
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: currentPage === totalPages ? 'var(--bg-section)' : 'var(--accent-blue)', color: currentPage === totalPages ? 'var(--text-secondary)' : 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >Next ▶</button>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '60px 20px'
            }}>
              <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🗄️</p>
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                {filters.search || filters.visibility !== 'visible' || filters.category !== 'all' || filters.material !== 'all' || filters.type !== 'all'
                  ? 'No se encontraron productos con los filtros aplicados'
                  : 'No hay productos en la base de datos'
                }
              </p>
              <p style={{ fontSize: '0.9rem' }}>
                {filters.search || filters.visibility !== 'visible' || filters.category !== 'all' || filters.material !== 'all' || filters.type !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Agrega productos desde la sección de Productos'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

// Estilos para encabezados de tabla
const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: '600',
  color: 'var(--text-primary)',
  borderBottom: '2px solid var(--border-color)',
  whiteSpace: 'nowrap'
}

// Componente de fila de producto
function ProductRow({ product, isEven, materials, onToggleVisibility, onTogglePublished, onDelete }) {
  const [editingStock, setEditingStock] = useState(false)
  const [stockValue, setStockValue] = useState(product.stock || 0)
  const [isSaving, setIsSaving] = useState(false)

  const getTypeColor = (type) => {
    switch (type) {
      case 'Venta': return '#10b981'
      case 'Presupuesto': return '#f59e0b'  
      case 'Stock': return '#3b82f6'
      default: return 'var(--text-secondary)'
    }
  }

  // Obtener información completa del material
  const getMaterialInfo = (materialName) => {
    if (!materialName) return null
    // Usar materials desde props (cargados desde Supabase)
    return materials.find(m => m.nombre === materialName)
  }

  // Guardar cambios de stock
  const handleSaveStock = async () => {
    setIsSaving(true)
    try {
      const { data, error } = await updateProducto(product.id, { stock: parseInt(stockValue) || 0 })
      
      if (error) {
        console.error('Error al actualizar stock:', error)
        alert('Error al actualizar el stock')
        return
      }
      
      // Disparar evento para actualizar la lista
      window.dispatchEvent(new CustomEvent('productos:updated'))
      setEditingStock(false)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar el stock')
    } finally {
      setIsSaving(false)
    }
  }

  // Cancelar edición
  const handleCancelStock = () => {
    setStockValue(product.stock || 0)
    setEditingStock(false)
  }

  const materialInfo = getMaterialInfo(product.material)

  const totalValue = (product.precioUnitario || 0) * (product.unidades || 0)
  const isHidden = product.active === false

  return (
    <tr style={{
      background: isEven ? 'var(--bg-tertiary)' : 'transparent',
      opacity: isHidden ? 0.6 : 1
    }}>
  <td style={tdStyle}>{product.id}</td>
      <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--text-primary)' }}>
        {product.nombre}
      </td>
      <td style={tdStyle}>{product.categoria || '-'}</td>
      <td style={tdStyle}>
        {materialInfo ? (
          <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
            <div style={{ fontWeight: '600', color: 'var(--accent-blue)', marginBottom: '2px' }}>
              {materialInfo.nombre}
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Tipo: {materialInfo.tipo || '-'} • 
              Espesor: {materialInfo.espesor || '-'}
            </div>
          </div>
        ) : (
          <span style={{
            background: 'var(--text-secondary)20',
            color: 'var(--text-secondary)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            Sin material
          </span>
        )}
      </td>
      <td style={tdStyle}>
        <span style={{
          background: getTypeColor(product.tipo) + '20',
          color: getTypeColor(product.tipo),
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: 500
        }}>
          {product.tipo}
        </span>
      </td>
      <td style={tdStyle}>{product.medidas || '-'}</td>
      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
        {formatCurrency(product.costoPlaca || 0)}
      </td>
      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
        {product.unidadesPorPlaca || 0}
      </td>
      <td style={tdStyle}>
        {editingStock ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="number"
              value={stockValue}
              onChange={(e) => setStockValue(e.target.value)}
              disabled={isSaving}
              style={{
                width: '60px',
                padding: '4px 6px',
                border: '1px solid var(--accent-blue)',
                borderRadius: '4px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveStock()
                if (e.key === 'Escape') handleCancelStock()
              }}
              autoFocus
            />
            <button
              onClick={handleSaveStock}
              disabled={isSaving}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 6px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '0.75rem'
              }}
            >
              ✓
            </button>
            <button
              onClick={handleCancelStock}
              disabled={isSaving}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 6px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: '0.75rem'
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              color: product.stock > 0 ? '#10b981' : '#ef4444'
            }}
            onClick={() => setEditingStock(true)}
            title="Clic para editar"
          >
            <span>{product.stock || 0}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>✏️</span>
          </div>
        )}
      </td>
      <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--accent-blue)' }}>
        {formatCurrency(product.precioUnitario || 0)}
      </td>
      <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--accent-blue)' }}>
        {formatCurrency((product.precioPromos !== undefined && product.precioPromos !== null) ? product.precioPromos : (product.precioUnitario || 0))}
      </td>
      <td style={tdStyle}>{product.tiempoUnitario || '00:00:30'}</td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <span style={{
            background: isHidden ? '#ef444420' : '#10b98120',
            color: isHidden ? '#ef4444' : '#10b981',
            padding: '2px 4px',
            borderRadius: '3px',
            fontSize: '0.7rem',
            fontWeight: 500
          }}>
            {isHidden ? 'Oculto' : 'Visible'}
          </span>
          {product.publicado && (
            <span style={{
              background: '#3b82f620',
              color: '#3b82f6',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '0.7rem',
              fontWeight: 500
            }}>
              Público
            </span>
          )}
        </div>
      </td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onToggleVisibility(product.id)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: isHidden ? '#ef4444' : '#10b981'
            }}
            title={isHidden ? 'Mostrar' : 'Ocultar'}
          >
            {isHidden ? '👁️‍🗨️' : '👁️'}
          </button>
          
          <button
            onClick={() => onTogglePublished(product.id)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              padding: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: product.publicado ? '#3b82f6' : 'var(--text-secondary)'
            }}
            title={product.publicado ? 'Quitar del catálogo público' : 'Publicar en catálogo'}
          >
            {product.publicado ? '🌐' : '🌍'}
          </button>
          
          <button
            onClick={() => onDelete(product.id)}
            style={{
              background: 'transparent',
              border: '1px solid #ef4444',
              borderRadius: '4px',
              padding: '4px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: '#ef4444'
            }}
            title="Eliminar"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  )
}

// Estilos para celdas de tabla
const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  verticalAlign: 'top'
}

export default withAdminAuth(Database)

// Agregar estilos de animación
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `
  if (!document.querySelector('style[data-database-animations]')) {
    style.setAttribute('data-database-animations', 'true')
    document.head.appendChild(style)
  }
}