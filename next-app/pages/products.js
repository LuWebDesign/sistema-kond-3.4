import Layout from '../components/Layout'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '../utils/catalogUtils'

export default function Products() {
  // Estados principales
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [expandedCards, setExpandedCards] = useState(new Set()) // Estado para tarjetas expandidas
  const [editingCards, setEditingCards] = useState(new Set()) // Estado para tarjetas en modo edición
  const [filters, setFilters] = useState({
    search: '',
    type: 'all'
  })

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    categoriaPersonalizada: '',
    tipo: 'Venta',
    medidas: '',
    tiempoUnitario: '00:00:30',
    unidades: 1,
    unidadesPorPlaca: 1,
    usoPlacas: 0,
    costoPlaca: 0,
    costoMaterial: 0,
    materialId: '',
    margenMaterial: 0,
    precioUnitario: 0,
    ensamble: 'Sin ensamble',
    imagen: ''
  })

  // Lista de materiales para el desplegable de costo de material
  const [materials, setMaterials] = useState([])

  // Estados para campos calculados
  const [calculatedFields, setCalculatedFields] = useState({
    tiempoTotal: '00:00:00',
    precioPorMinuto: 0,
    isUsoPlacasManual: false,
    isCostoMaterialManual: false,
    isPrecioUnitarioManual: false
  })

  // Métricas calculadas
  const [metrics, setMetrics] = useState({
    total: 0,
    totalValue: 0,
    totalTime: 0,
    averagePrice: 0,
    typeDistribution: { Venta: 0, Presupuesto: 0, Stock: 0 }
  })

  const pageSize = 10
  const categories = ['Decoración', 'Herramientas', 'Regalos', 'Llaveros', 'Arte', 'Personalizada']

  // Funciones utilitarias para tiempo
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const parts = timeStr.split(':')
    return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0) + (parseInt(parts[2] || 0) / 60)
  }

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    const secs = Math.floor((minutes % 1) * 60)
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Función para actualizar campos calculados
  const updateCalculatedFields = useCallback(() => {
    const { unidades, unidadesPorPlaca, costoPlaca, margenMaterial, tiempoUnitario, costoMaterial, precioUnitario } = formData
    const { isUsoPlacasManual, isCostoMaterialManual, isPrecioUnitarioManual } = calculatedFields

    let newFields = { ...calculatedFields }

    // Calcular uso de placas automáticamente si no es manual
    if (!isUsoPlacasManual) {
      const usoPlacas = unidadesPorPlaca > 0 ? Math.ceil(unidades / unidadesPorPlaca) : 0
      setFormData(prev => ({ ...prev, usoPlacas }))
    }

    // Calcular costo de material automáticamente si no es manual
    if (!isCostoMaterialManual) {
      const costoMaterialCalc = unidadesPorPlaca > 0 ? costoPlaca / unidadesPorPlaca : 0
      setFormData(prev => ({ ...prev, costoMaterial: parseFloat(costoMaterialCalc.toFixed(2)) }))
    }

    // Calcular precio/margen según modo seleccionado
    if (!isPrecioUnitarioManual) {
      // Modo auto: derivar precio desde margen y costo material
      const precioUnitarioCalc = costoMaterial * (1 + margenMaterial / 100)
      setFormData(prev => ({ ...prev, precioUnitario: parseFloat(precioUnitarioCalc.toFixed(2)) }))
    } else {
      // Modo manual de precio: derivar margen desde precio y costo material
      const margenDesdePrecio = costoMaterial > 0 ? ((precioUnitario / costoMaterial) - 1) * 100 : 0
      const margenRedondeado = parseFloat(margenDesdePrecio.toFixed(1))
      setFormData(prev => ({ ...prev, margenMaterial: margenRedondeado }))
    }

    // Calcular tiempo total
    const tiempoMinutos = timeToMinutes(tiempoUnitario || '00:00:30')
    const tiempoTotalMinutos = tiempoMinutos * unidades
    newFields.tiempoTotal = minutesToTime(tiempoTotalMinutos)

  // Calcular precio por minuto (siempre coherente con el precio actual)
  newFields.precioPorMinuto = tiempoMinutos > 0 ? precioUnitario / tiempoMinutos : 0

    setCalculatedFields(newFields)
  }, [formData, calculatedFields, timeToMinutes, minutesToTime])

  // Efecto para actualizar campos calculados
  useEffect(() => {
    updateCalculatedFields()
  }, [formData.unidades, formData.unidadesPorPlaca, formData.costoPlaca, formData.margenMaterial, formData.tiempoUnitario, formData.costoMaterial, formData.precioUnitario])

  // Función para toggle de campos manuales/automáticos
  const toggleFieldMode = (fieldName) => {
    setCalculatedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  // Cargar datos del localStorage
  const loadProducts = useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem('productosBase')
      const productList = stored ? JSON.parse(stored) : []
      
      // Inicializar productos con valores por defecto
      const initializedProducts = productList.map(p => ({
        ...p,
        id: p.id || Date.now() + Math.random(),
        active: p.active !== undefined ? p.active : true,
        publicado: p.publicado !== undefined ? p.publicado : false,
        unidadesPorPlaca: p.unidadesPorPlaca || 1,
        usoPlacas: p.usoPlacas || 0,
        costoPlaca: p.costoPlaca || 0,
  costoMaterial: p.costoMaterial || 0,
  materialId: p.materialId || '',
        margenMaterial: p.margenMaterial || 0,
        precioUnitario: p.precioUnitario || 0,
        unidades: p.unidades || 1,
        ensamble: p.ensamble || 'Sin ensamble',
        fechaCreacion: p.fechaCreacion || new Date().toISOString()
      }))

      setProducts(initializedProducts)
    } catch (error) {
      console.error('Error loading products:', error)
      setProducts([])
    }
  }, [])

  // Cargar materiales desde localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('materiales')
      const list = raw ? JSON.parse(raw) : []
      setMaterials(list)
    } catch (e) { console.error('load materiales', e) }
  }, [])

  // Guardar productos al localStorage
  const saveProducts = useCallback((productList) => {
    try {
      localStorage.setItem('productosBase', JSON.stringify(productList))
    } catch (error) {
      console.error('Error saving products:', error)
    }
  }, [])

  // Aplicar filtros
  const applyFilters = useCallback(() => {
    let filtered = [...products]

    // Filtro de búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(p => 
        p.nombre?.toLowerCase().includes(searchTerm) ||
        p.categoria?.toLowerCase().includes(searchTerm) ||
        p.medidas?.toLowerCase().includes(searchTerm)
      )
    }

    // Filtro por tipo
    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.tipo === filters.type)
    }

    // Solo productos activos
    filtered = filtered.filter(p => p.active !== false)

    setFilteredProducts(filtered)
    setCurrentPage(1)
  }, [products, filters])

  // Calcular métricas
  const calculateMetrics = useCallback(() => {
    const activeProducts = filteredProducts.filter(p => p.active !== false)
    
    const total = activeProducts.length
    const totalValue = activeProducts.reduce((sum, p) => sum + (p.precioUnitario || 0) * (p.unidades || 0), 0)
    
    // Calcular tiempo total
    const totalMinutes = activeProducts.reduce((sum, p) => {
      const timeStr = p.tiempoUnitario || '00:00:30'
      const [hours, minutes, seconds] = timeStr.split(':').map(Number)
      const totalMin = (hours * 60) + minutes + (seconds / 60)
      return sum + totalMin * (p.unidades || 0)
    }, 0)

    // Promedio ponderado por unidades: evita que productos con precio unitario alto
    // pero sin unidades distorsionen el promedio simple.
    const totalUnits = activeProducts.reduce((sum, p) => sum + (p.unidades || 0), 0)
    const averagePrice = totalUnits > 0
      ? activeProducts.reduce((sum, p) => sum + (p.precioUnitario || 0) * (p.unidades || 0), 0) / totalUnits
      : 0

    // Distribución por tipo
    const typeDistribution = { Venta: 0, Presupuesto: 0, Stock: 0 }
    activeProducts.forEach(p => {
      if (typeDistribution.hasOwnProperty(p.tipo)) {
        typeDistribution[p.tipo]++
      }
    })

    setMetrics({
      total,
      totalValue,
      totalTime: totalMinutes,
      averagePrice,
      typeDistribution
    })
  }, [filteredProducts])

  // Efectos
  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    applyFilters()
  }, [products, filters, applyFilters])

  useEffect(() => {
    calculateMetrics()
  }, [filteredProducts, calculateMetrics])

  // Manejar cambios en formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Manejar Enter para pasar al siguiente campo
  const handleKeyDown = (e, nextFieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (nextFieldName) {
        const nextField = document.querySelector(`[name="${nextFieldName}"]`)
        if (nextField) {
          nextField.focus()
          if (nextField.select) nextField.select()
        }
      } else {
        // Si no hay siguiente campo, guardar el producto
        if (formData.nombre && formData.medidas) {
          handleAddProduct()
        }
      }
    }
  }

  // Agregar nuevo producto
  const handleAddProduct = async () => {
    try {
      // Determinar la categoría final (personalizada o seleccionada)
      const categoriaFinal = formData.categoriaPersonalizada?.trim() || formData.categoria
      
      const newProduct = {
        ...formData,
        id: Date.now() + Math.random(),
        active: true,
        publicado: formData.publicado || false,
        fechaCreacion: new Date().toISOString(),
        categoria: categoriaFinal
      }

      const updatedProducts = [...products, newProduct]
      setProducts(updatedProducts)
      saveProducts(updatedProducts)
      
      // Si se creó una categoría nueva, no la agregamos automáticamente al array
      // para mantener las categorías predefinidas, pero el producto la tendrá
      
      // Resetear formulario
      setFormData({
        nombre: '',
        categoria: '',
        categoriaPersonalizada: '',
        tipo: 'Venta',
        medidas: '',
        tiempoUnitario: '00:00:30',
        unidades: 1,
        unidadesPorPlaca: 1,
        usoPlacas: 0,
        costoPlaca: 0,
        costoMaterial: 0,
        materialId: '',
        margenMaterial: 0,
        precioUnitario: 0,
        ensamble: 'Sin ensamble',
        imagen: '',
        publicado: false
      })
      setShowAddForm(false)

      // Mostrar notificación
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div')
        notification.textContent = '✅ Producto agregado exitosamente'
        notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 1000;
          background: #10b981; color: white; padding: 12px 20px;
          border-radius: 8px; font-weight: 600;
        `
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)
      }
    } catch (error) {
      console.error('Error adding product:', error)
    }
  }

  // Eliminar producto
  const handleDeleteProduct = (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      const updatedProducts = products.filter(p => p.id !== id)
      setProducts(updatedProducts)
      saveProducts(updatedProducts)
    }
  }

  // Cambiar visibilidad del producto
  const toggleProductVisibility = (id) => {
    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, active: !p.active } : p
    )
    setProducts(updatedProducts)
    saveProducts(updatedProducts)
  }

  // Alternar publicación en catálogo
  const toggleProductPublication = (id) => {
    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, publicado: !p.publicado } : p
    )
    setProducts(updatedProducts)
    saveProducts(updatedProducts)
  }

  // Alternar expansión de tarjeta
  const toggleCardExpansion = (id) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Alternar modo de edición de tarjeta
  const toggleCardEditing = (id) => {
    setEditingCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
        // Expandir automáticamente cuando se entra en modo edición
        setExpandedCards(prevExp => {
          const newExpSet = new Set(prevExp)
          newExpSet.add(id)
          return newExpSet
        })
      }
      return newSet
    })
  }

  // Guardar cambios de producto editado
  const saveProductChanges = async (id, newData) => {
    try {
      const updatedProducts = products.map(p => 
        p.id === id ? { ...p, ...newData } : p
      )
      setProducts(updatedProducts)
      saveProducts(updatedProducts)
      
      // Salir del modo edición
      setEditingCards(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })

      // Mostrar notificación de éxito
      if (typeof window !== 'undefined') {
        // Aquí podrías agregar una notificación
        console.log('Producto actualizado correctamente')
      }
    } catch (error) {
      console.error('Error al guardar producto:', error)
      if (typeof window !== 'undefined') {
        alert('Error al guardar el producto')
      }
    }
  }

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentProducts = filteredProducts.slice(startIndex, endIndex)

  // Formatear tiempo
  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    const secs = Math.floor((minutes % 1) * 60)
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Layout title="Productos - Sistema KOND">
      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 700,
            color: 'var(--person-color)',
            marginBottom: '8px'
          }}>
            🏷️ Gestión de Productos
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Administra tu catálogo de productos, precios y configuraciones
          </p>
        </div>

        {/* Métricas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <MetricCard
            title="Total Productos"
            value={metrics.total}
            icon="📦"
            color="#3b82f6"
          />
          <MetricCard
            title="Valor Total"
            value={formatCurrency(metrics.totalValue)}
            icon="💰"
            color="#f59e0b"
            isAmount
          />
          <MetricCard
            title="Tiempo Total"
            value={formatTime(metrics.totalTime)}
            icon="⏱️"
            color="#8b5cf6"
          />
          <MetricCard
            title="Precio Promedio"
            value={formatCurrency(metrics.averagePrice)}
            icon="📊"
            color="#10b981"
            isAmount
          />
        </div>

        {/* Controles */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                background: showAddForm ? 'var(--text-secondary)' : 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              {showAddForm ? '∧ Ocultar Formulario' : '+ Agregar Producto'}
            </button>

            <Link href="/materiales" style={{
              marginLeft: '8px',
              background: '#e5e7eb',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '12px 20px',
              cursor: 'pointer',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block'
            }}>Ir a Materiales</Link>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Buscar productos..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="all">Todos los tipos</option>
                <option value="Venta">Venta</option>
                <option value="Presupuesto">Presupuesto</option>
                <option value="Stock">Stock</option>
              </select>
            </div>
          </div>

          {/* Formulario Agregar Producto */}
          {showAddForm && (
            <div style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '20px',
              marginTop: '16px'
            }}>
              <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
                Agregar Nuevo Producto
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                {/* Nombre */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'categoria')}
                    placeholder="Ej: Llavero Corazón"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Categoría
                  </label>
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={(e) => {
                      handleInputChange(e)
                      // Si selecciona "nueva", mostrar campo personalizado
                      if (e.target.value === '__nueva__') {
                        setFormData(prev => ({ ...prev, categoria: '', categoriaPersonalizada: '' }))
                        setTimeout(() => {
                          const input = document.querySelector('[name="categoriaPersonalizada"]')
                          if (input) input.focus()
                        }, 100)
                      }
                    }}
                    onKeyDown={(e) => handleKeyDown(e, formData.categoria === '' && formData.categoriaPersonalizada === '' ? 'categoriaPersonalizada' : 'tipo')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__nueva__">✏️ Crear nueva categoría...</option>
                  </select>
                  
                  {/* Campo para categoría personalizada */}
                  {(formData.categoria === '' && formData.categoriaPersonalizada !== undefined) && (
                    <input
                      type="text"
                      name="categoriaPersonalizada"
                      value={formData.categoriaPersonalizada}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'tipo')}
                      placeholder="Ingrese nueva categoría"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        marginTop: '8px'
                      }}
                    />
                  )}
                </div>

                {/* Tipo */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Tipo *
                  </label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'medidas')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Venta">Venta</option>
                    <option value="Presupuesto">Presupuesto</option>
                    <option value="Stock">Stock</option>
                  </select>
                </div>

                {/* Medidas */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Medidas *
                  </label>
                  <input
                    type="text"
                    name="medidas"
                    value={formData.medidas}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'tiempoUnitario')}
                    placeholder="Ej: 5x3 cm"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Tiempo Unitario */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Tiempo Unitario (HH:MM:SS) *
                  </label>
                  <input
                    type="text"
                    name="tiempoUnitario"
                    value={formData.tiempoUnitario}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'unidades')}
                    placeholder="00:13:00"
                    pattern="^[0-9]{2}:[0-9]{2}:[0-9]{2}$"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Unidades */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Unidades a producir *
                  </label>
                  <input
                    type="number"
                    name="unidades"
                    value={formData.unidades}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'unidadesPorPlaca')}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Unidades por Placa */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Unidades por Placa
                  </label>
                  <input
                    type="number"
                    name="unidadesPorPlaca"
                    value={formData.unidadesPorPlaca}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'usoPlacas')}
                    min="1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Uso de Placas */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Uso de Placas
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      name="usoPlacas"
                      value={formData.usoPlacas}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'ensamble')}
                      readOnly={!calculatedFields.isUsoPlacasManual}
                      min="0"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: calculatedFields.isUsoPlacasManual ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        cursor: calculatedFields.isUsoPlacasManual ? 'text' : 'not-allowed'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => toggleFieldMode('isUsoPlacasManual')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      {calculatedFields.isUsoPlacasManual ? 'Auto' : 'Manual'}
                    </button>
                  </div>
                </div>

                {/* Ensamble */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Ensamble
                  </label>
                  <select
                    name="ensamble"
                    value={formData.ensamble}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'costoPlaca')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="Sin ensamble">Sin ensamble</option>
                    <option value="Manual">Manual</option>
                    <option value="Automático">Automático</option>
                  </select>
                </div>

                {/* Costo Placa */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Costo Placa ($)
                  </label>
                  <input
                    type="number"
                    name="costoPlaca"
                    value={formData.costoPlaca}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'costoMaterial')}
                    min="0"
                    step="0.01"
                    readOnly
                    title="Este valor se extrae del material seleccionado"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                {/* Material (selección desde Materiales) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Material
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                      name="materialId"
                      value={formData.materialId || ''}
                      onChange={(e) => {
                        const id = e.target.value
                        const sel = materials.find(x => String(x.id) === String(id))
                        if (sel) {
                          setFormData(prev => ({ ...prev, materialId: id, costoMaterial: Number(sel.costoUnitario || 0), costoPlaca: Number(sel.costoUnitario || 0) }))
                        } else {
                          setFormData(prev => ({ ...prev, materialId: '', costoMaterial: 0, costoPlaca: 0 }))
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, 'margenMaterial')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="">-- Seleccionar material --</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}{m.tipo ? ` — ${m.tipo}` : ''}{m.espesor ? ` — ${m.espesor}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Margen Material */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Margen Material (%)
                  </label>
                  <input
                    type="number"
                    name="margenMaterial"
                    value={formData.margenMaterial}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'precioUnitario')}
                    min="0"
                    step="0.1"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Precio Unitario */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Precio Unitario *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: '#2563eb',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      textAlign: 'center'
                    }}>
                      {formatCurrency(formData.precioUnitario)}
                    </div>

                    {calculatedFields.isPrecioUnitarioManual && (
                      <input
                        type="number"
                        name="precioUnitario"
                        value={formData.precioUnitario}
                        onChange={handleInputChange}
                        onKeyDown={(e) => handleKeyDown(e, null)}
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: '#2563eb',
                          fontSize: '1.05rem',
                          fontWeight: 700
                        }}
                      />
                    )}

                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => toggleFieldMode('isPrecioUnitarioManual')}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {calculatedFields.isPrecioUnitarioManual ? 'Auto' : 'Manual'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Campos calculados */}
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Tiempo Total
                  </label>
                  <input
                    type="text"
                    value={calculatedFields.tiempoTotal}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Precio por Minuto
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(calculatedFields.precioPorMinuto)}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
              </div>

              {/* Opciones adicionales */}
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: '8px',
                padding: '16px',
                marginTop: '20px'
              }}>
                <h4 style={{ 
                  margin: '0 0 12px 0', 
                  fontSize: '0.95rem', 
                  color: 'var(--text-secondary)',
                  fontWeight: 600 
                }}>
                  Opciones de Visibilidad
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.publicado || false}
                      onChange={(e) => setFormData(prev => ({ ...prev, publicado: e.target.checked }))}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ color: 'var(--text-primary)' }}>
                      Publicar en catálogo público
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={handleAddProduct}
                  disabled={!formData.nombre || !formData.medidas}
                  style={{
                    background: (formData.nombre && formData.medidas) ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    cursor: (formData.nombre && formData.medidas) ? 'pointer' : 'not-allowed',
                    fontWeight: '600'
                  }}
                >
                  ✅ Agregar Producto
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    // Limpiar formulario
                    setFormData({
                      nombre: '',
                      categoria: '',
                      categoriaPersonalizada: '',
                      tipo: 'Venta',
                      medidas: '',
                      tiempoUnitario: '00:00:30',
                      unidades: 1,
                      unidadesPorPlaca: 1,
                      usoPlacas: 0,
                      costoPlaca: 0,
                      costoMaterial: 0,
                      materialId: '',
                      margenMaterial: 0,
                      precioUnitario: 0,
                      ensamble: 'Sin ensamble',
                      imagen: '',
                      publicado: false
                    })
                    setCalculatedFields({
                      tiempoTotal: '00:00:00',
                      precioPorMinuto: 0,
                      isUsoPlacasManual: false,
                      isCostoMaterialManual: false,
                      isPrecioUnitarioManual: false
                    })
                  }}
                  style={{
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px 20px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Productos */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
            Productos ({filteredProducts.length})
          </h2>

          {currentProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isExpanded={expandedCards.has(product.id)}
                  isEditing={editingCards.has(product.id)}
                  onDelete={handleDeleteProduct}
                  onToggleVisibility={toggleProductVisibility}
                  onTogglePublication={toggleProductPublication}
                  onToggleExpansion={toggleCardExpansion}
                  onToggleEditing={toggleCardEditing}
                  onSaveChanges={saveProductChanges}
                />
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '40px'
            }}>
              {filters.search || filters.type !== 'all' 
                ? 'No se encontraron productos con los filtros aplicados'
                : 'No hay productos. ¡Agrega tu primer producto!'
              }
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginTop: '20px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  background: currentPage === 1 ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                  color: currentPage === 1 ? 'var(--text-secondary)' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Anterior
              </button>
              
              <span style={{ color: 'var(--text-secondary)' }}>
                Página {currentPage} de {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  background: currentPage === totalPages ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                  color: currentPage === totalPages ? 'var(--text-secondary)' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

// Componente de tarjeta de métrica
function MetricCard({ title, value, icon, color, isAmount = false }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    }}>
      <div style={{
        fontSize: '1.5rem',
        background: `${color}20`,
        color: color,
        padding: '8px',
        borderRadius: '6px'
      }}>
        {icon}
      </div>
      <div>
        <h4 style={{
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          marginBottom: '4px',
          fontWeight: 500
        }}>
          {title}
        </h4>
        <p style={{
          fontSize: isAmount ? '1.1rem' : '1.3rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0
        }}>
          {value}
        </p>
      </div>
    </div>
  )
}

// Componente de tarjeta de producto
function ProductCard({ 
  product, 
  isExpanded, 
  isEditing, 
  onDelete, 
  onToggleVisibility, 
  onTogglePublication, 
  onToggleExpansion,
  onToggleEditing,
  onSaveChanges 
}) {
  const [editData, setEditData] = useState({
    nombre: product.nombre || '',
    categoria: product.categoria || '',
    medidas: product.medidas || '',
    tipo: product.tipo || 'Venta',
    tiempoUnitario: product.tiempoUnitario || '00:00:30',
    unidades: product.unidades || 1,
    unidadesPorPlaca: product.unidadesPorPlaca || 1,
    usoPlacas: product.usoPlacas || 0,
    costoPlaca: product.costoPlaca || 0,
    costoMaterial: product.costoMaterial || 0,
    margenMaterial: product.margenMaterial || 0,
    precioUnitario: product.precioUnitario || 0,
    ensamble: product.ensamble || 'Sin ensamble',
    imagen: product.imagen || ''
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(product.imagen || '')

  // Actualizar datos de edición cuando cambia el producto
  useEffect(() => {
    if (!isEditing) {
      setEditData({
        nombre: product.nombre || '',
        categoria: product.categoria || '',
        medidas: product.medidas || '',
        tipo: product.tipo || 'Venta',
        tiempoUnitario: product.tiempoUnitario || '00:00:30',
        unidades: product.unidades || 1,
        unidadesPorPlaca: product.unidadesPorPlaca || 1,
        usoPlacas: product.usoPlacas || 0,
        costoPlaca: product.costoPlaca || 0,
        costoMaterial: product.costoMaterial || 0,
        margenMaterial: product.margenMaterial || 0,
        precioUnitario: product.precioUnitario || 0,
        ensamble: product.ensamble || 'Sin ensamble',
        imagen: product.imagen || ''
      })
      setImagePreview(product.imagen || '')
      setImageFile(null)
    }
  }, [product, isEditing])

  const getTypeColor = (type) => {
    switch (type) {
      case 'Venta': return '#10b981'
      case 'Presupuesto': return '#f59e0b'  
      case 'Stock': return '#3b82f6'
      default: return 'var(--text-secondary)'
    }
  }

  // Función auxiliar para convertir tiempo a minutos
  function timeToMinutes(timeString) {
    if (!timeString) return 0
    const [hours, minutes, seconds] = timeString.split(':').map(Number)
    return (hours * 60) + minutes + (seconds / 60)
  }

  // Manejar cambio de imagen
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Convertir archivo a base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = error => reject(error)
    })
  }

  // Guardar cambios
  const handleSave = async () => {
    try {
      let finalData = { ...editData }
      
      // Si hay una nueva imagen, convertirla a base64
      if (imageFile) {
        const imageData = await fileToBase64(imageFile)
        finalData.imagen = imageData
      }

      // Validaciones básicas
      if (!finalData.nombre.trim()) {
        alert('El nombre es requerido')
        return
      }
      if (!finalData.categoria.trim()) {
        alert('La categoría es requerida')
        return
      }
      if (finalData.unidades <= 0) {
        alert('Las unidades deben ser mayor a 0')
        return
      }
      if (finalData.precioUnitario <= 0) {
        alert('El precio debe ser mayor a 0')
        return
      }

      await onSaveChanges(product.id, finalData)
    } catch (error) {
      console.error('Error al guardar:', error)
      alert('Error al guardar los cambios')
    }
  }

  // Calcular valores para vista resumida y expandida
  const totalValue = (product.precioUnitario || 0) * (product.unidades || 0)
  const tiempoMinutos = product.tiempoUnitario ? timeToMinutes(product.tiempoUnitario) : 0
  const tiempoTotal = tiempoMinutos * (product.unidades || 0)
  const precioPorMinuto = tiempoMinutos > 0 ? (product.precioUnitario || 0) / tiempoMinutos : 0

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '16px',
      opacity: product.active === false ? 0.6 : 1,
      transition: 'all 0.3s ease',
      borderColor: isEditing ? '#3b82f6' : 'var(--border-color)'
    }}>
      {/* Header con información resumida */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: isExpanded ? '16px' : '0'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              {product.nombre}
            </h3>
            <span style={{
              background: getTypeColor(product.tipo) + '20',
              color: getTypeColor(product.tipo),
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 500
            }}>
              {product.tipo}
            </span>
            {product.publicado && (
              <span style={{
                background: '#10b98120',
                color: '#10b981',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 500
              }}>
                Público
              </span>
            )}
            {isEditing && (
              <span style={{
                background: '#3b82f620',
                color: '#3b82f6',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 500
              }}>
                ✏️ Editando
              </span>
            )}
          </div>
          
          {/* Información resumida cuando está colapsada (versión compacta) */}
          {!isExpanded && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              marginTop: '8px'
            }}>
              {/* Mostramos sólo precio por unidad y total en la vista cerrada */}
              <span>
                <strong style={{ color: 'var(--accent-blue)' }}>{formatCurrency(product.precioUnitario || 0)}</strong>/ud
              </span>
              <span>•</span>
              <span>
                Total: <strong style={{ color: '#10b981' }}>{formatCurrency(totalValue)}</strong>
              </span>
              {precioPorMinuto > 0 && (
                <>
                  <span>•</span>
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(precioPorMinuto)}</strong>/min
                  </span>
                </>
              )}
            </div>
          )}
          
          {isExpanded && !isEditing && (
            <p style={{
              margin: '0 0 8px 0',
              color: 'var(--text-secondary)',
              fontSize: '0.9rem'
            }}>
              ID: {product.id} • {product.categoria} • {product.medidas} • Creado: {product.fechaCreacion ? new Date(product.fechaCreacion).toLocaleDateString() : '—'}
              {product.publicado ? ' • Público' : ''}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                style={{
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 500
                }}
                title="Guardar cambios"
              >
                💾 Guardar
              </button>
              <button
                onClick={() => onToggleEditing(product.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid #6b7280',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '0.8rem'
                }}
                title="Cancelar edición"
              >
                ✕ Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onToggleEditing(product.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)'
                }}
                title="Editar producto"
              >
                ✏️
              </button>
              
              <button
                onClick={() => onTogglePublication(product.id)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${product.publicado ? '#10b981' : '#6b7280'}`,
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: product.publicado ? '#10b981' : '#6b7280'
                }}
                title={product.publicado ? 'Despublicar del catálogo' : 'Publicar en catálogo'}
              >
                {product.publicado ? '🌐' : '🔒'}
              </button>
              
              <button
                onClick={() => onDelete(product.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#ef4444'
                }}
                title="Eliminar producto"
              >
                🗑️
              </button>

              <button
                onClick={() => onToggleExpansion(product.id)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  minWidth: '28px'
                }}
                title={isExpanded ? 'Colapsar tarjeta' : 'Expandir tarjeta'}
              >
                {isExpanded ? '−' : '+'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Contenido detallado cuando está expandida */}
      {isExpanded && (
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '16px'
        }}>
          {isEditing ? (
            // Modo edición
            <EditForm 
              editData={editData}
              setEditData={setEditData}
              imagePreview={imagePreview}
              onImageChange={handleImageChange}
              onSave={handleSave}
            />
          ) : (
            // Modo vista
            <ViewMode product={product} />
          )}
        </div>
      )}
    </div>
  )
}

// Componente para el modo de vista
function ViewMode({ product }) {
  const tiempoMinutos = product.tiempoUnitario ? timeToMinutes(product.tiempoUnitario) : 0
  const tiempoTotal = tiempoMinutos * (product.unidades || 0)
  const totalValue = (product.precioUnitario || 0) * (product.unidades || 0)
  const precioPorMinuto = tiempoMinutos > 0 ? (product.precioUnitario || 0) / tiempoMinutos : 0

  function timeToMinutes(timeString) {
    if (!timeString) return 0
    const [hours, minutes, seconds] = timeString.split(':').map(Number)
    return (hours * 60) + minutes + (seconds / 60)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      fontSize: '0.9rem'
    }}>
      <div>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Información Básica
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Categoría: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.categoria || 'Sin categoría'}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Medidas: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.medidas || 'No especificadas'}</span>
          </div>
          {product.ensamble && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Ensamble: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.ensamble}</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Producción
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Unidades a producir: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.unidades || 0}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Unidades por placa: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.unidadesPorPlaca || 1}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Tiempo unitario: </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.tiempoUnitario || '00:00:30'}</span>
          </div>
          {tiempoTotal > 0 && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Tiempo total: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {Math.floor(tiempoTotal / 60)}h {Math.floor(tiempoTotal % 60)}m
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Costos y Precios
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Precio unitario: </span>
            <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>
              {formatCurrency(product.precioUnitario || 0)}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Total: </span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>
              {formatCurrency(totalValue)}
            </span>
          </div>
          {precioPorMinuto > 0 && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Por minuto: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                {formatCurrency(precioPorMinuto)}
              </span>
            </div>
          )}
          {typeof product.margenMaterial !== 'undefined' && (
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Margen material: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(product.margenMaterial || 0)}%</span>
            </div>
          )}
        </div>
      </div>

      {(product.usoPlacas > 0 || product.costoMaterial > 0) && (
        <div>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            fontWeight: 600 
          }}>
            Materiales
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {product.usoPlacas > 0 && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Uso placas: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.usoPlacas}</span>
              </div>
            )}
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Unidades por placa: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{product.unidadesPorPlaca || 1}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Costo placa: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatCurrency(product.costoPlaca || 0)}</span>
            </div>
            {product.costoMaterial > 0 && (
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Costo material: </span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {formatCurrency(product.costoMaterial)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {product.imagen && (
        <div>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            fontWeight: 600 
          }}>
            Imagen
          </h4>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)'
          }}>
            <img 
              src={product.imagen} 
              alt={product.nombre}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Componente para el formulario de edición
function EditForm({ editData, setEditData, imagePreview, onImageChange, onSave }) {
  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      fontSize: '0.9rem'
    }}>
      {/* Información básica */}
      <div>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Información Básica
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Nombre
            </label>
            <input
              type="text"
              value={editData.nombre}
              onChange={(e) => handleInputChange('nombre', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Categoría
            </label>
            <input
              type="text"
              value={editData.categoria}
              onChange={(e) => handleInputChange('categoria', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Medidas
            </label>
            <input
              type="text"
              value={editData.medidas}
              onChange={(e) => handleInputChange('medidas', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Tipo
            </label>
            <select
              value={editData.tipo}
              onChange={(e) => handleInputChange('tipo', e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            >
              <option value="Venta">Venta</option>
              <option value="Presupuesto">Presupuesto</option>
              <option value="Stock">Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Producción */}
      <div>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Producción
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Unidades a producir
            </label>
            <input
              type="number"
              value={editData.unidades}
              onChange={(e) => handleInputChange('unidades', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Tiempo Unitario
            </label>
            <input
              type="text"
              value={editData.tiempoUnitario}
              onChange={(e) => handleInputChange('tiempoUnitario', e.target.value)}
              placeholder="HH:MM:SS"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Precio Unitario
            </label>
            <input
              type="number"
              value={editData.precioUnitario}
              onChange={(e) => handleInputChange('precioUnitario', Number(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  // Trigger parent save if provided
                  try { onSave && onSave() } catch (err) { console.error(err) }
                }
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Materiales */}
      <div>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Materiales
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Unidades por Placa
            </label>
            <input
              type="number"
              value={editData.unidadesPorPlaca}
              onChange={(e) => handleInputChange('unidadesPorPlaca', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Uso de Placas
            </label>
            <input
              type="number"
              value={editData.usoPlacas}
              onChange={(e) => handleInputChange('usoPlacas', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Costo Material
            </label>
            <input
              type="number"
              value={editData.costoMaterial}
              onChange={(e) => handleInputChange('costoMaterial', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
              step="0.01"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Costo Placa ($)
            </label>
            <input
              type="number"
              value={editData.costoPlaca}
              onChange={(e) => handleInputChange('costoPlaca', Number(e.target.value))}
              readOnly
              title="Este valor se extrae del material seleccionado"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                cursor: 'not-allowed',
                opacity: 0.9
              }}
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Margen Material (%)
            </label>
            <input
              type="number"
              value={editData.margenMaterial}
              onChange={(e) => handleInputChange('margenMaterial', Number(e.target.value))}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem'
              }}
              min="0"
              step="0.1"
            />
          </div>
        </div>
      </div>

      {/* Imagen */}
      <div>
        <h4 style={{ 
          margin: '0 0 12px 0', 
          fontSize: '0.85rem', 
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontWeight: 600 
        }}>
          Imagen
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input
            type="file"
            accept="image/*"
            onChange={onImageChange}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontSize: '0.9rem'
            }}
          />
          {imagePreview && (
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)'
            }}>
              <img 
                src={imagePreview} 
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Visibilidad / Publicación */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={editData.publicado || false} onChange={(e) => handleInputChange('publicado', e.target.checked)} />
          <span style={{ color: 'var(--text-primary)' }}>Publicar en catálogo público</span>
        </label>
      </div>
    </div>
  )
}