import Layout from '../components/Layout'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '../utils/catalogUtils'

export default function Database() {
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    visibility: 'visible', // 'visible', 'hidden', 'all'
    category: 'all',
    type: 'all'
  })
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  // Cargar productos del localStorage
  const loadProducts = useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem('productosBase')
      const productList = stored ? JSON.parse(stored) : []
      setProducts(productList)
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
    }
  }, [])

  // Guardar productos al localStorage
  const saveProducts = useCallback((productList) => {
    try {
      localStorage.setItem('productosBase', JSON.stringify(productList))
    } catch (error) {
      console.error('Error saving products:', error)
    }
  }, [])

  // Aplicar filtros y ordenamiento
  const applyFiltersAndSort = useCallback(() => {
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
        p.medidas?.toLowerCase().includes(searchTerm) ||
        p.material?.toLowerCase().includes(searchTerm) ||
        String(p.id).includes(searchTerm)
      )
    }

    // Filtro por categoría
    if (filters.category !== 'all') {
      filtered = filtered.filter(p => p.categoria === filters.category)
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

    setFilteredProducts(filtered)
  }, [products, filters, sortConfig])

  // Manejar ordenamiento
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Cambiar visibilidad del producto
  const toggleProductVisibility = (id) => {
    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, active: !p.active } : p
    )
    setProducts(updatedProducts)
    saveProducts(updatedProducts)
  }

  // Cambiar estado de publicación
  const toggleProductPublished = (id) => {
    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, publicado: !p.publicado } : p
    )
    setProducts(updatedProducts)
    saveProducts(updatedProducts)
  }

  // Eliminar producto
  const deleteProduct = (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      const updatedProducts = products.filter(p => p.id !== id)
      setProducts(updatedProducts)
      saveProducts(updatedProducts)
    }
  }

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = [
      'ID', 'Nombre', 'Categoría', 'Tipo', 'Medidas', 'Tiempo Unitario', 
      'Unidades', 'Unidades por Placa', 'Uso Placas', 'Costo Placa', 
      'Costo Material', 'Margen Material (%)', 'Precio Unitario', 
      'Ensamble', 'Activo', 'Publicado'
    ]
    
    const data = filteredProducts.map(p => [
      p.id,
      p.nombre,
      p.categoria,
      p.tipo,
      p.medidas,
      p.tiempoUnitario,
      p.unidades,
      p.unidadesPorPlaca,
      p.usoPlacas,
      p.costoPlaca,
      p.costoMaterial,
      p.margenMaterial,
      p.precioUnitario,
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

  // Efectos
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    applyFiltersAndSort()
  }, [products, filters, sortConfig, applyFiltersAndSort])

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

        {/* Controles y Filtros */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
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
                placeholder="ID, nombre, categoría, medidas..."
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
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('tipo')}>
                      Tipo {getSortIcon('tipo')}
                    </th>
                    <th style={thStyle}>Medidas</th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('unidades')}>
                      Unidades {getSortIcon('unidades')}
                    </th>
                    <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('precioUnitario')}>
                      Precio {getSortIcon('precioUnitario')}
                    </th>
                    <th style={thStyle}>Tiempo</th>
                    <th style={thStyle}>Estados</th>
                    <th style={thStyle}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      isEven={index % 2 === 0}
                      onToggleVisibility={toggleProductVisibility}
                      onTogglePublished={toggleProductPublished}
                      onDelete={deleteProduct}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '60px 20px'
            }}>
              <p style={{ fontSize: '3rem', marginBottom: '16px' }}>🗄️</p>
              <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                {filters.search || filters.visibility !== 'visible' || filters.category !== 'all' || filters.type !== 'all'
                  ? 'No se encontraron productos con los filtros aplicados'
                  : 'No hay productos en la base de datos'
                }
              </p>
              <p style={{ fontSize: '0.9rem' }}>
                {filters.search || filters.visibility !== 'visible' || filters.category !== 'all' || filters.type !== 'all'
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
function ProductRow({ product, isEven, onToggleVisibility, onTogglePublished, onDelete }) {
  const getTypeColor = (type) => {
    switch (type) {
      case 'Venta': return '#10b981'
      case 'Presupuesto': return '#f59e0b'  
      case 'Stock': return '#3b82f6'
      default: return 'var(--text-secondary)'
    }
  }

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
      <td style={tdStyle}>{product.unidades || 0}</td>
      <td style={{ ...tdStyle, fontWeight: '600', color: 'var(--accent-blue)' }}>
        {formatCurrency(product.precioUnitario || 0)}
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