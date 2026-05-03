import Layout from '../../../components/Layout'
import withAdminAuth from '../../../components/withAdminAuth'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { formatCurrency, timeToSeconds, secondsToTime, compressImage } from '../../../utils/catalogUtils'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useMateriales, useProductos } from '../../../hooks/useSupabaseQuery'
import { QUERY_KEYS, STALE_TIMES } from '../../../lib/queryKeys'
import { createProducto, updateProducto, uploadProductoImagen } from '../../../utils/supabaseProducts'
import dynamic from 'next/dynamic'

const NewProduct = dynamic(() => Promise.resolve(NewProductComponent), {
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
      <div>Cargando formulario...</div>
    </div>
  )
})

function NewProductComponent() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: materialesResult } = useMateriales()

  // Fuente primaria: categorías derivadas de productos existentes (siempre funciona)
  const { data: productosData } = useProductos()
  const products = Array.isArray(productosData) ? productosData : (productosData?.data || [])
  const categoriesFromProducts = [...new Set(products.map(p => p.categoria).filter(Boolean))].sort()

  // Fuente secundaria: categorías desde API (requiere migración de tabla categorias)
  const { data: categoriasData } = useQuery({
    queryKey: QUERY_KEYS.categorias.list(),
    queryFn: async () => {
      const res = await fetch('/api/categorias')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: STALE_TIMES.categorias
  })
  const categoriasFromAPI = categoriasData?.data || []

  // Usar API si tiene datos, de lo contrario usar categorías derivadas de productos
  const usandoAPICategories = categoriasFromAPI.length > 0

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: '',
    categoriaPersonalizada: '',
    categoriaPadreId: '',
    categoriaId: '',
    tipo: 'Corte Laser',
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
    precioPromos: 0,
    ensamble: 'Sin ensamble',
    imagen: '',
    stock: 0,
    description: '',
    publicado: false
  })

  // Estados para manejo de imagen
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])

  // Estados para edición de materiales
  const [editingMaterial, setEditingMaterial] = useState(null)
  const [materialForm, setMaterialForm] = useState({
    nombre: '',
    tipo: '',
    espesor: '',
    costoUnitario: ''
  })

  // Lista de materiales
  const [materials, setMaterials] = useState([])

  // Estados para campos calculados
  const [calculatedFields, setCalculatedFields] = useState({
    tiempoTotal: '00:00:00',
    precioPorMinuto: 0,
    isUsoPlacasManual: false,
    isCostoMaterialManual: false,
    isPrecioUnitarioManual: false
  })

  // Wire React Query materiales data → local materials state
  useEffect(() => {
    const materialesList = Array.isArray(materialesResult) ? materialesResult : (materialesResult?.data || [])
    if (!materialesList || materialesList.length === 0) return

    const mappedMateriales = materialesList.map(m => ({
      id: m.id,
      nombre: m.nombre,
      tipo: m.tipo,
      tamano: m.tamano,
      espesor: m.espesor,
      unidad: m.unidad,
      costoUnitario: m.costo_unitario,
      proveedor: m.proveedor,
      stock: m.stock,
      notas: m.notas
    }))
    setMaterials(mappedMateriales)
  }, [materialesResult])

  // Efecto para actualizar costos cuando cambian los materiales
  useEffect(() => {
    if (formData.materialId && materials.length > 0) {
      const selectedMaterial = materials.find(m => String(m.id) === String(formData.materialId))
      if (selectedMaterial) {
        setFormData(prev => ({
          ...prev,
          costoMaterial: Number(selectedMaterial.costoUnitario || 0),
          costoPlaca: Number(selectedMaterial.costoUnitario || 0)
        }))
      }
    }
  }, [materials, formData.materialId])

  // Actualizar campos calculados cuando cambien inputs relevantes
  useEffect(() => {
    try {
      const { unidades, unidadesPorPlaca, costoPlaca, margenMaterial, tiempoUnitario, costoMaterial, precioUnitario } = formData
      const { isUsoPlacasManual, isCostoMaterialManual, isPrecioUnitarioManual } = calculatedFields

      const updates = {}

      if (!isUsoPlacasManual) {
        const usoPlacas = unidadesPorPlaca > 0 ? Math.ceil(unidades / unidadesPorPlaca) : 0
        if (Number(formData.usoPlacas) !== Number(usoPlacas)) updates.usoPlacas = usoPlacas
      }

      let costoMaterialEfectivo = costoMaterial
      if (!isCostoMaterialManual) {
        const costoMaterialCalc = unidadesPorPlaca > 0 ? costoPlaca / unidadesPorPlaca : 0
        const costoMaterialRounded = parseFloat(costoMaterialCalc.toFixed(2))
        if (Number(costoMaterial) !== costoMaterialRounded) updates.costoMaterial = costoMaterialRounded
        costoMaterialEfectivo = costoMaterialRounded
      }

      if (!isPrecioUnitarioManual) {
        const precioUnitarioCalc = costoMaterialEfectivo * (1 + margenMaterial / 100)
        const precioRounded = parseFloat(precioUnitarioCalc.toFixed(2))
        if (Number(precioUnitario) !== precioRounded) updates.precioUnitario = precioRounded
      } else {
        const margenDesdePrecio = costoMaterialEfectivo > 0 ? ((precioUnitario / costoMaterialEfectivo) - 1) * 100 : 0
        const margenRedondeado = parseFloat(margenDesdePrecio.toFixed(1))
        if (Number(margenMaterial) !== margenRedondeado) updates.margenMaterial = margenRedondeado
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }))
      }

      const tiempoSegundos = timeToSeconds(tiempoUnitario || '00:00:30')
      const tiempoTotalSegundos = tiempoSegundos * unidades
      const tiempoMinutos = tiempoSegundos / 60
      const precioEfectivo = updates.precioUnitario !== undefined ? updates.precioUnitario : precioUnitario
      const newTiempoTotal = secondsToTime(tiempoTotalSegundos)
      const newPrecioPorMinuto = tiempoMinutos > 0 ? precioEfectivo / tiempoMinutos : 0

      setCalculatedFields(prev => {
        if (prev.tiempoTotal === newTiempoTotal && prev.precioPorMinuto === newPrecioPorMinuto) return prev
        return { ...prev, tiempoTotal: newTiempoTotal, precioPorMinuto: newPrecioPorMinuto }
      })
    } catch (e) {
      console.error('Error al actualizar campos calculados:', e)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tiempoUnitario, formData.unidades, formData.unidadesPorPlaca, formData.costoPlaca, formData.costoMaterial, formData.margenMaterial, formData.precioUnitario, calculatedFields.isUsoPlacasManual, calculatedFields.isCostoMaterialManual, calculatedFields.isPrecioUnitarioManual])

  // Manejar cambio de imagen
  const handleImageChange = (e) => {
    const MAX_FILE_SIZE = 8 * 1024 * 1024
    const files = Array.from(e.target.files).slice(0, 5)
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length > 0) {
      alert(`La imagen "${oversized[0].name}" supera los 8MB. Por favor usá una imagen más chica.`)
      e.target.value = ''
      return
    }
    if (files.length > 0) {
      setImageFiles(files)
      const previews = files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (ev) => resolve(ev.target.result)
          reader.readAsDataURL(file)
        })
      })
      Promise.all(previews).then(setImagePreviews)
    } else {
      setImageFiles([])
      setImagePreviews([])
    }
  }

  const fileToBase64 = async (file, maxWidth = 1200, quality = 0.82) => {
    try {
      const blob = await compressImage(file, maxWidth, quality)
      const toRead = (blob && blob.size) ? blob : file
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(toRead)
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
      })
    } catch (e) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = error => reject(error)
      })
    }
  }

  // Función para toggle de campos manuales/automáticos
  const toggleFieldMode = (fieldName) => {
    setCalculatedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }))
  }

  // Funciones para editar materiales
  const startEditingMaterial = (materialId) => {
    const material = materials.find(m => String(m.id) === String(materialId))
    if (material) {
      setEditingMaterial(materialId)
      setMaterialForm({
        nombre: material.nombre || '',
        tipo: material.tipo || '',
        espesor: material.espesor || '',
        costoUnitario: material.costoUnitario || ''
      })
    }
  }

  const cancelEditingMaterial = () => {
    setEditingMaterial(null)
    setMaterialForm({
      nombre: '',
      tipo: '',
      espesor: '',
      costoUnitario: ''
    })
  }

  const saveMaterialChanges = async () => {
    try {
      try {
        const { updateMaterial } = await import('../../../utils/supabaseMateriales')
        const { data, error } = await updateMaterial(editingMaterial, materialForm)

        if (data && !error) {
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materiales.all })

          if (formData.materialId === editingMaterial) {
            const updatedMaterial = materials.find(m => String(m.id) === String(editingMaterial))
            if (updatedMaterial) {
              setFormData(prev => ({
                ...prev,
                costoMaterial: Number(updatedMaterial.costoUnitario || 0),
                costoPlaca: Number(updatedMaterial.costoUnitario || 0)
              }))
            }
          }

          cancelEditingMaterial()
          alert('Material actualizado correctamente')
          return
        } else {
          throw new Error('Supabase update failed')
        }
      } catch (supabaseError) {
        console.warn('⚠️ Fallback a localStorage para actualizar material')

        const updatedMaterials = materials.map(m =>
          String(m.id) === String(editingMaterial)
            ? { ...m, ...materialForm }
            : m
        )

        localStorage.setItem('materiales', JSON.stringify(updatedMaterials))
        setMaterials(updatedMaterials)

        if (formData.materialId === editingMaterial) {
          const updatedMaterial = updatedMaterials.find(m => String(m.id) === String(editingMaterial))
          if (updatedMaterial) {
            setFormData(prev => ({
              ...prev,
              costoMaterial: Number(updatedMaterial.costoUnitario || 0),
              costoPlaca: Number(updatedMaterial.costoUnitario || 0)
            }))
          }
        }

        cancelEditingMaterial()
        alert('Material actualizado correctamente')
      }
    } catch (error) {
      console.error('Error al guardar material:', error)
      alert('Error al guardar el material')
    }
  }

  // Manejar cambios en formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target

    const numericFields = new Set(['unidades', 'unidadesPorPlaca', 'usoPlacas', 'costoPlaca', 'costoMaterial', 'margenMaterial', 'precioUnitario', 'precioPromos', 'stock'])

    let newValue = value
    if (numericFields.has(name)) {
      if (value === '') {
        newValue = ''
      } else {
        const parsed = parseFloat(value)
        newValue = Number.isNaN(parsed) ? 0 : parsed
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
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
        if (formData.nombre && formData.medidas) {
          handleAddProduct()
        }
      }
    }
  }

  // Agregar nuevo producto
  const handleAddProduct = async () => {
    try {
      const categoriaFinal = formData.categoriaPersonalizada?.trim() || formData.categoria

      let finalFormData = { ...formData }

      if (finalFormData.materialId && materials.length > 0) {
        const selectedMaterial = materials.find(m => String(m.id) === String(finalFormData.materialId))
        if (selectedMaterial) {
          finalFormData.material = selectedMaterial.nombre
          finalFormData.tipoMaterial = selectedMaterial.tipo || ''
        }
      } else {
        finalFormData.material = ''
        finalFormData.tipoMaterial = ''
      }

      const newProductData = {
        nombre: finalFormData.nombre,
        categoria: categoriaFinal,
        categoria_id: formData.categoriaId ? Number(formData.categoriaId) : null,
        tipo: finalFormData.tipo,
        tipo_trabajo: finalFormData.tipo || finalFormData.tipo_trabajo,
        medidas: finalFormData.medidas,
        tiempoUnitario: finalFormData.tiempoUnitario,
        publicado: finalFormData.publicado || false,
        hiddenInProductos: false,
        unidadesPorPlaca: finalFormData.unidadesPorPlaca,
        usoPlacas: finalFormData.usoPlacas,
        costoPlaca: finalFormData.costoPlaca,
        costoMaterial: finalFormData.costoMaterial,
        materialId: finalFormData.materialId,
        material: finalFormData.material,
        tipoMaterial: finalFormData.tipoMaterial,
        margenMaterial: finalFormData.margenMaterial,
        precioUnitario: finalFormData.precioUnitario,
        precioPromos: finalFormData.precioPromos,
        unidades: finalFormData.unidades,
        stock: finalFormData.stock,
        ensamble: finalFormData.ensamble,
        imagenes: [],
        description: finalFormData.description || ''
      }

      const { data: createdProduct, error } = await createProducto(newProductData)

      if (error) {
        console.error('Error creating product:', error)
        alert('Error al crear el producto: ' + error)
        return
      }

      if (imageFiles.length > 0 && createdProduct) {
        try {
          const uploadPromises = imageFiles.map(file => uploadProductoImagen(file, createdProduct.id))
          const uploadResults = await Promise.all(uploadPromises)

          const imageUrls = uploadResults
            .filter(result => !result.error && result.data)
            .map(result => result.data.url)

          if (imageUrls.length > 0) {
            await updateProducto(createdProduct.id, { imagenes: imageUrls })
          }
        } catch (uploadErr) {
          console.warn('No se pudieron subir algunas imágenes:', uploadErr)
        }
      }

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productos.all })

      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('productos:updated'))
          localStorage.setItem('productos_updated', Date.now().toString())
        }
      } catch (e) {
        console.warn('No se pudo despachar evento de productos actualizados:', e)
      }

      // Mostrar notificación de éxito antes de redirigir
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

      // Redirigir a la lista de productos
      router.push('/admin/products')
    } catch (error) {
      console.error('Error adding product:', error)
      alert('Error al agregar el producto')
    }
  }

  const categoriasRaiz = categoriasFromAPI.filter(c => !c.parent_id)
  const subcategoriasDePadre = formData.categoriaPadreId
    ? categoriasFromAPI.filter(c => String(c.parent_id) === String(formData.categoriaPadreId))
    : []

  return (    <Layout title="Agregar Producto - Sistema KOND">
      <div style={{ padding: '20px' }}>
        {/* Header de página */}
        <div style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
          border: '2px solid var(--border-color)',
          borderRadius: '16px',
          padding: '32px',
          marginTop: '20px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)'
        }}>
          {/* Header del formulario */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
            paddingBottom: '20px',
            borderBottom: '2px solid var(--border-color)'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              ✨
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Agregar Nuevo Producto
              </h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Completa los campos para crear un nuevo producto
              </p>
            </div>
          </div>

          {/* Sección: Información Básica */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(96, 165, 250, 0.08) 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Información Básica
              </h4>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {/* Nombre */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Nombre <span style={{ color: '#ef4444' }}>*</span>
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
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              {/* Categoría */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Categoría
                </label>

                {usandoAPICategories ? (
                  /* Selector estructurado con IDs (requiere migración de categorias) */
                  <select
                    name="categoriaPadreId"
                    value={formData.categoriaPadreId}
                    onChange={(e) => {
                      const padreId = e.target.value
                      const padre = categoriasFromAPI.filter(c => !c.parent_id).find(c => String(c.id) === String(padreId))
                      setFormData(prev => ({
                        ...prev,
                        categoriaPadreId: padreId,
                        categoriaId: padreId,
                        categoria: padre ? padre.nombre : ''
                      }))
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categoriasFromAPI.filter(c => !c.parent_id).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                ) : (
                  /* Selector de texto (compatibilidad sin migración) */
                  <select
                    name="categoria"
                    value={formData.categoria}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '__nueva__') {
                        setFormData(prev => ({ ...prev, categoria: '', categoriaPersonalizada: '' }))
                        setTimeout(() => {
                          const input = document.querySelector('[name="categoriaPersonalizada"]')
                          if (input) input.focus()
                        }, 100)
                      } else {
                        setFormData(prev => ({ ...prev, categoria: v, categoriaPersonalizada: '' }))
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categoriesFromProducts.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__nueva__">✏️ Crear nueva categoría...</option>
                  </select>
                )}

                {/* Input para nueva categoría (modo texto) */}
                {!usandoAPICategories && formData.categoria === '' && (
                  <input
                    type="text"
                    name="categoriaPersonalizada"
                    value={formData.categoriaPersonalizada}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'tipo')}
                    placeholder="Ingrese nueva categoría"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid #3b82f6',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      marginTop: '12px'
                    }}
                  />
                )}
              </div>

              {/* Subcategoría (solo en modo API) */}
              {usandoAPICategories && formData.categoriaPadreId && (() => {
                const subs = categoriasFromAPI.filter(c => String(c.parent_id) === String(formData.categoriaPadreId))
                if (subs.length === 0) return null
                return (
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}>
                      Subcategoría <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span>
                    </label>
                    <select
                      name="categoriaId"
                      value={formData.categoriaId}
                      onChange={(e) => {
                        const subId = e.target.value
                        const sub = subs.find(c => String(c.id) === String(subId))
                        const padre = categoriasFromAPI.find(c => String(c.id) === String(formData.categoriaPadreId))
                        setFormData(prev => ({
                          ...prev,
                          categoriaId: subId || prev.categoriaPadreId,
                          categoria: sub ? sub.nombre : (padre ? padre.nombre : '')
                        }))
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.95rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value={formData.categoriaPadreId}>-- Sin subcategoría --</option>
                      {subs.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                )
              })()}

              {/* Tipo */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Tipo <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  onKeyDown={(e) => handleKeyDown(e, 'medidas')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Corte Laser">Corte Laser</option>
                  <option value="Corte + Grabado Laser">Corte + Grabado Laser</option>
                  <option value="Grabado Laser">Grabado Laser</option>
                  <option value="Corte CNC">Corte CNC</option>
                </select>
              </div>

              {/* Medidas */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Medidas <span style={{ color: '#ef4444' }}>*</span>
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
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(52, 211, 153, 0.08) 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px' }}>📝</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Descripción
              </h4>
            </div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Descripción del producto (visible en el catálogo)"
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#10b981'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Sección: Producción y Tiempos */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(96, 165, 250, 0.08) 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px' }}>⏱️</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Producción y Tiempos
              </h4>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {/* Tiempo Unitario */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Tiempo Unitario <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
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
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem'
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    pointerEvents: 'none'
                  }}>
                    HH:MM:SS
                  </span>
                </div>
              </div>

              {/* Unidades */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Unidades a producir <span style={{ color: '#ef4444' }}>*</span>
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
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              {/* Stock */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Stock
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  onKeyDown={(e) => handleKeyDown(e, 'unidadesPorPlaca')}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              {/* Tiempo Total (calculado) */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Tiempo Total
                </label>
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: '#10b981',
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}>
                  {calculatedFields.tiempoTotal}
                </div>
              </div>
            </div>
          </div>

          {/* Sección: Material y Placas */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(96, 165, 250, 0.08) 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px' }}>🎨</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Material y Placas
              </h4>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px'
            }}>
              {/* Unidades por Placa */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
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
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              {/* Uso de Placas */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Uso de Placas
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    name="usoPlacas"
                    value={formData.usoPlacas}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'materialId')}
                    readOnly={!calculatedFields.isUsoPlacasManual}
                    min="0"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: calculatedFields.isUsoPlacasManual ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      cursor: calculatedFields.isUsoPlacasManual ? 'text' : 'not-allowed'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => toggleFieldMode('isUsoPlacasManual')}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: calculatedFields.isUsoPlacasManual ? '#3b82f6' : 'var(--bg-secondary)',
                      color: calculatedFields.isUsoPlacasManual ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      minWidth: '80px'
                    }}
                  >
                    {calculatedFields.isUsoPlacasManual ? 'Manual' : 'Auto'}
                  </button>
                </div>
              </div>

              {/* Material */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Material
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                    onKeyDown={(e) => handleKeyDown(e, 'ensamble')}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Seleccionar material --</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}{m.tipo ? ` — ${m.tipo}` : ''}{m.espesor ? ` — ${m.espesor}` : ''}
                      </option>
                    ))}
                  </select>

                  {formData.materialId && (
                    <button
                      type="button"
                      onClick={() => startEditingMaterial(formData.materialId)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#3b82f6',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ✏️ Editar
                    </button>
                  )}
                </div>

                {/* Formulario de edición de material */}
                {editingMaterial && (
                  <div style={{
                    marginTop: '12px',
                    padding: '16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-tertiary)'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
                      Editar Material
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Nombre
                        </label>
                        <input
                          type="text"
                          value={materialForm.nombre}
                          onChange={(e) => setMaterialForm(prev => ({ ...prev, nombre: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Tipo
                        </label>
                        <input
                          type="text"
                          value={materialForm.tipo}
                          onChange={(e) => setMaterialForm(prev => ({ ...prev, tipo: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Espesor
                        </label>
                        <input
                          type="text"
                          value={materialForm.espesor}
                          onChange={(e) => setMaterialForm(prev => ({ ...prev, espesor: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Costo Unitario
                        </label>
                        <input
                          type="number"
                          value={materialForm.costoUnitario}
                          onChange={(e) => setMaterialForm(prev => ({ ...prev, costoUnitario: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={cancelEditingMaterial}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={saveMaterialChanges}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          background: 'var(--accent-blue)',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ensamble */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Ensamble
                </label>
                <select
                  name="ensamble"
                  value={formData.ensamble}
                  onChange={handleInputChange}
                  onKeyDown={(e) => handleKeyDown(e, 'costoPlaca')}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Sin ensamble">Sin ensamble</option>
                  <option value="Manual">Manual</option>
                  <option value="Automático">Automático</option>
                </select>
              </div>

              {/* Costo Placa */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Costo Placa ($)
                </label>
                <input
                  type="number"
                  name="costoPlaca"
                  value={formData.costoPlaca}
                  onChange={handleInputChange}
                  onKeyDown={(e) => handleKeyDown(e, 'margenMaterial')}
                  min="0"
                  step="0.01"
                  readOnly
                  title="Este valor se extrae del material seleccionado"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                    fontSize: '0.95rem',
                    cursor: 'not-allowed'
                  }}
                />
              </div>

              {/* Margen Material */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
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
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '2px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              {/* Precio por Minuto (calculado) */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Precio por Minuto
                </label>
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: '#10b981',
                  fontSize: '0.95rem',
                  fontWeight: 600
                }}>
                  {formatCurrency(calculatedFields.precioPorMinuto)}
                </div>
              </div>
            </div>
          </div>

          {/* Sección: Precios */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(96, 165, 250, 0.08) 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px' }}>💰</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Gestión de Precios
              </h4>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}>
              {/* Precio Unitario */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Precio Unitario <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    border: '3px solid #3b82f6',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)',
                    color: '#2563eb',
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)'
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
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px solid #3b82f6',
                        background: 'var(--bg-secondary)',
                        color: '#2563eb',
                        fontSize: '1.05rem',
                        fontWeight: 700
                      }}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => toggleFieldMode('isPrecioUnitarioManual')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '2px solid var(--border-color)',
                      background: calculatedFields.isPrecioUnitarioManual ? '#3b82f6' : 'var(--bg-secondary)',
                      color: calculatedFields.isPrecioUnitarioManual ? 'white' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      minWidth: '100px'
                    }}
                  >
                    {calculatedFields.isPrecioUnitarioManual ? 'Manual' : 'Auto'}
                  </button>
                </div>
              </div>

              {/* Precio Promos */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Precio Promociones
                </label>
                <div style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid var(--border-color)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.95rem',
                  fontStyle: 'italic'
                }}>
                  {formData.precioPromos > 0
                    ? `${formatCurrency(formData.precioPromos)} (activo desde Marketing)`
                    : 'Sin promoción activa'
                  }
                </div>
                <small style={{
                  display: 'block',
                  marginTop: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)'
                }}>
                  Los precios promocionales se gestionan desde el módulo de Marketing
                </small>
              </div>
            </div>
          </div>

          {/* Sección: Imágenes */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(96, 165, 250, 0.08) 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px' }}>📸</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Imágenes del Producto
              </h4>
            </div>

            <div>
              <label style={{
                display: 'block',
                marginBottom: '12px',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                Subir imágenes (hasta 5)
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px dashed var(--border-color)',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              />

              {imagePreviews.length > 0 && (
                <div style={{
                  marginTop: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '12px'
                }}>
                  {imagePreviews.map((preview, index) => (
                    <div key={index} style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: '2px solid var(--border-color)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      position: 'relative'
                    }}>
                      <img
                        src={preview}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        alt={`Preview ${index + 1}`}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        fontSize: '0.75rem',
                        padding: '4px',
                        textAlign: 'center'
                      }}>
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sección: Visibilidad */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(96, 165, 250, 0.08) 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>👁️</span>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Opciones de Visibilidad
              </h4>
            </div>

            <div style={{
              padding: '16px',
              border: '2px solid var(--border-color)',
              borderRadius: '10px',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>
                  Publicar en catálogo público
                </div>
                <div style={{
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)'
                }}>
                  Visible para clientes en el catálogo público
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: '56px',
                height: '30px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.publicado || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, publicado: e.target.checked }))}
                  style={{ display: 'none' }}
                />
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: formData.publicado ? '#10b981' : '#ccc',
                  borderRadius: '30px',
                  transition: 'background 0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '22px',
                    width: '22px',
                    left: formData.publicado ? '30px' : '4px',
                    bottom: '4px',
                    background: 'white',
                    borderRadius: '50%',
                    transition: 'left 0.3s',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}></span>
                </span>
              </label>
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '2px solid var(--border-color)'
          }}>
            <button
              onClick={handleAddProduct}
              disabled={!formData.nombre || !formData.medidas}
              style={{
                flex: 1,
                background: (formData.nombre && formData.medidas)
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'var(--text-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: (formData.nombre && formData.medidas) ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                fontSize: '0.9rem',
                boxShadow: (formData.nombre && formData.medidas)
                  ? '0 2px 8px rgba(16, 185, 129, 0.25)'
                  : 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (formData.nombre && formData.medidas) {
                  e.target.style.transform = 'translateY(-1px)'
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = formData.nombre && formData.medidas
                  ? '0 2px 8px rgba(16, 185, 129, 0.25)'
                  : 'none'
              }}
            >
              ✅ Agregar Producto
            </button>
            <button
              onClick={() => router.push('/admin/products')}
              style={{
                flex: 0.6,
                background: 'transparent',
                color: 'var(--text-primary)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--bg-secondary)'
                e.target.style.borderColor = 'var(--text-secondary)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.borderColor = 'var(--border-color)'
              }}
            >
              ✕ Cancelar
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(NewProduct)
