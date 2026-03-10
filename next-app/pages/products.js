import Layout from '../components/Layout'
import { useAdminProducts } from '../hooks/useAdmin'
import { useState, useEffect } from 'react'

export default function Products() {
  const { 
    products, 
    loading, 
    error, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    refreshProducts 
  } = useAdminProducts()

  // Estados para UI
  const [filteredProducts, setFilteredProducts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [expandedCards, setExpandedCards] = useState(new Set())
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    category: 'all'
  })

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    tipo: 'Venta',
    medidas: '',
    tiempo_unitario: '00:00:30',
    unidades_por_placa: 1,
    uso_placas: 0,
    costo_placa: 0,
    costo_material: 0,
    publicado: true,
    active: true,
    imagen: null
  })

  const itemsPerPage = 12

  // Aplicar filtros cuando cambien products o filters
  useEffect(() => {
    let filtered = [...products]

    // Filtro por búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(product => 
        product.nombre?.toLowerCase().includes(searchLower) ||
        product.categoria?.toLowerCase().includes(searchLower) ||
        product.medidas?.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      filtered = filtered.filter(product => product.tipo === filters.type)
    }

    // Filtro por categoría
    if (filters.category !== 'all') {
      filtered = filtered.filter(product => product.categoria === filters.category)
    }

    setFilteredProducts(filtered)
    setCurrentPage(1) // Reset pagination
  }, [products, filters])

  // Obtener categorías únicas
  const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))]

  // Paginación
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount || 0)
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      categoria: '',
      tipo: 'Venta',
      medidas: '',
      tiempo_unitario: '00:00:30',
      unidades_por_placa: 1,
      uso_placas: 0,
      costo_placa: 0,
      costo_material: 0,
      publicado: true,
      active: true,
      imagen: null
    })
    setEditingProduct(null)
    setShowAddForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData)
      } else {
        await addProduct(formData)
      }
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
      alert(`Error al ${editingProduct ? 'actualizar' : 'crear'} el producto: ${error.message}`)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setFormData({
      nombre: product.nombre || '',
      categoria: product.categoria || '',
      tipo: product.tipo || 'Venta',
      medidas: product.medidas || '',
      tiempo_unitario: product.tiempo_unitario || '00:00:30',
      unidades_por_placa: product.unidades_por_placa || 1,
      uso_placas: product.uso_placas || 0,
      costo_placa: product.costo_placa || 0,
      costo_material: product.costo_material || 0,
      publicado: product.publicado !== false,
      active: product.active !== false,
      imagen: product.imagen || null
    })
    setShowAddForm(true)
  }

  const handleDelete = async (product) => {
    if (confirm(`¿Estás seguro de eliminar "${product.nombre}"?`)) {
      try {
        await deleteProduct(product.id)
      } catch (error) {
        console.error('Error deleting product:', error)
        alert(`Error al eliminar el producto: ${error.message}`)
      }
    }
  }

  const toggleCardExpansion = (productId) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId)
    } else {
      newExpanded.add(productId)
    }
    setExpandedCards(newExpanded)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFormData(prev => ({
          ...prev,
          imagen: e.target.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  if (loading) {
    return (
      <Layout title="Gestión de Productos - Sistema KOND">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div className="loading-spinner">Cargando productos...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Gestión de Productos - Sistema KOND">
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--primary-color)',
              marginBottom: '8px'
            }}>
              📦 Gestión de Productos
            </h1>
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '1rem',
              margin: 0
            }}>
              {filteredProducts.length} de {products.length} productos
            </p>
            {error && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                color: '#856404',
                padding: '8px 12px',
                borderRadius: '4px',
                marginTop: '8px',
                fontSize: '0.9rem'
              }}>
                ⚠️ {error} (usando datos locales como respaldo)
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={refreshProducts}
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--secondary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🔄 Actualizar
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                padding: '10px 16px',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ➕ Nuevo Producto
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{
          backgroundColor: 'var(--card-bg)',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <input
            type="text"
            placeholder="🔍 Buscar productos..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.9rem',
              minWidth: '200px',
              flex: 1
            }}
          />
          
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">Todos los tipos</option>
            <option value="Venta">Venta</option>
            <option value="Stock">Stock</option>
            <option value="Promocion">Promoción</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">Todas las categorías</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Modal de formulario */}
        {showAddForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'var(--card-bg)',
              padding: '24px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90%',
              overflow: 'auto'
            }}>
              <h2 style={{
                margin: '0 0 20px 0',
                color: 'var(--primary-color)'
              }}>
                {editingProduct ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
              </h2>

              <form onSubmit={handleSubmit}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                      Categoría
                    </label>
                    <input
                      type="text"
                      value={formData.categoria}
                      onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                      Tipo
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="Venta">Venta</option>
                      <option value="Stock">Stock</option>
                      <option value="Promocion">Promoción</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                      Medidas
                    </label>
                    <input
                      type="text"
                      value={formData.medidas}
                      onChange={(e) => setFormData(prev => ({ ...prev, medidas: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                      Costo Material
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costo_material}
                      onChange={(e) => setFormData(prev => ({ ...prev, costo_material: parseFloat(e.target.value) || 0 }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                      Unidades por Placa
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.unidades_por_placa}
                      onChange={(e) => setFormData(prev => ({ ...prev, unidades_por_placa: parseInt(e.target.value) || 1 }))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                    Imagen del producto
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px'
                    }}
                  />
                  {formData.imagen && (
                    <img
                      src={formData.imagen}
                      alt="Preview"
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginTop: '8px'
                      }}
                    />
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.publicado}
                      onChange={(e) => setFormData(prev => ({ ...prev, publicado: e.target.checked }))}
                    />
                    Publicado en catálogo
                  </label>
                  
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                    />
                    Activo
                  </label>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'var(--text-secondary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {editingProduct ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de productos */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '20px',
          marginBottom: '24px'
        }}>
          {paginatedProducts.map(product => (
            <div
              key={product.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: `1px solid ${product.active ? 'var(--border-color)' : '#dc3545'}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: 'var(--card-shadow)',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {/* Imagen del producto */}
              {product.imagen && (
                <img
                  src={product.imagen}
                  alt={product.nombre}
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginBottom: '12px'
                  }}
                />
              )}

              {/* Información básica */}
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: product.active ? 'var(--text-primary)' : '#dc3545'
                }}>
                  {product.nombre}
                </h3>
                
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: 'var(--primary-color)',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '0.7rem'
                  }}>
                    {product.tipo}
                  </span>
                  
                  {product.categoria && (
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: 'var(--secondary-color)',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '0.7rem'
                    }}>
                      {product.categoria}
                    </span>
                  )}

                  {product.publicado && (
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '0.7rem'
                    }}>
                      📢 Público
                    </span>
                  )}
                </div>

                {product.medidas && (
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                  }}>
                    📏 {product.medidas}
                  </p>
                )}

                {product.costo_material > 0 && (
                  <p style={{
                    margin: '0',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--success-color)'
                  }}>
                    💰 {formatCurrency(product.costo_material)}
                  </p>
                )}
              </div>

              {/* Botones de acción */}
              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'space-between'
              }}>
                <button
                  onClick={() => toggleCardExpansion(product.id)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                >
                  {expandedCards.has(product.id) ? '🔼 Menos' : '🔽 Más'}
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEdit(product)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    onClick={() => handleDelete(product)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>

              {/* Información expandida */}
              {expandedCards.has(product.id) && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-color)',
                  fontSize: '0.9rem'
                }}>
                  <p><strong>Tiempo unitario:</strong> {product.tiempo_unitario || 'N/A'}</p>
                  <p><strong>Unidades por placa:</strong> {product.unidades_por_placa || 'N/A'}</p>
                  <p><strong>Uso placas:</strong> {product.uso_placas || 0}</p>
                  <p><strong>Costo placa:</strong> {formatCurrency(product.costo_placa || 0)}</p>
                  <p><strong>Creado:</strong> {product.created_at ? new Date(product.created_at).toLocaleDateString('es-AR') : 'N/A'}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sin productos */}
        {filteredProducts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
            <h3>No se encontraron productos</h3>
            <p>Intenta ajustar los filtros o crear un nuevo producto.</p>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '24px'
          }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                backgroundColor: currentPage === 1 ? '#ccc' : 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ⬅️ Anterior
            </button>
            
            <span style={{
              padding: '8px 16px',
              backgroundColor: 'var(--card-bg)',
              borderRadius: '4px',
              border: '1px solid var(--border-color)'
            }}>
              Página {currentPage} de {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                backgroundColor: currentPage === totalPages ? '#ccc' : 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              Siguiente ➡️
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-spinner {
          display: inline-block;
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  )
}