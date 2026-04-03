import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatCurrency } from '../../utils/catalogUtils'
import { getAllCotizaciones, createCotizacion, updateCotizacion, deleteCotizacion } from '../../utils/supabaseCotizaciones'
import dynamic from 'next/dynamic'

const Cotizaciones = dynamic(() => Promise.resolve(CotizacionesComponent), {
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
      <div>Cargando cotizaciones...</div>
    </div>
  )
})

function CotizacionesComponent() {
  // Estados principales
  const [cotizaciones, setCotizaciones] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [filters, setFilters] = useState({ search: '', estado: 'all' })
  const [materials, setMaterials] = useState([])
  const [costoHoraPredeterminado, setCostoHoraPredeterminado] = useState(0)

  // Estado del formulario
  const [formData, setFormData] = useState({
    clienteNombre: '',
    clienteTelefono: '',
    clienteEmail: '',
    descripcion: '',
    medidas: '',
    cantidad: 1,
    materialId: '',
    materialNombre: '',
    costoMaterial: 0,
    tiempoMaquina: '00:00:00',
    costoHoraMaquina: 0,
    costoTiempoMaquina: 0,
    costoDiseno: 0,
    subtotal: 0,
    margen: 0,
    total: 0,
    notas: ''
  })

  // Cargar cotizaciones
  const loadCotizaciones = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      const { data, error } = await getAllCotizaciones()
      if (error) {
        console.error('Error loading cotizaciones:', error)
        setCotizaciones([])
        return
      }
      const mapped = (data || []).map(c => ({
        id: c.id,
        clienteNombre: c.cliente_nombre,
        clienteTelefono: c.cliente_telefono,
        clienteEmail: c.cliente_email,
        descripcion: c.descripcion,
        medidas: c.medidas,
        cantidad: c.cantidad,
        materialId: c.material_id,
        materialNombre: c.material_nombre,
        costoMaterial: c.costo_material || 0,
        tiempoMaquina: c.tiempo_maquina || '00:00:00',
        costoHoraMaquina: c.costo_hora_maquina || 0,
        costoTiempoMaquina: c.costo_tiempo_maquina || 0,
        costoDiseno: c.costo_diseno || 0,
        subtotal: c.subtotal || 0,
        margen: c.margen || 0,
        total: c.total || 0,
        estado: c.estado || 'pendiente',
        notas: c.notas,
        createdAt: c.created_at
      }))
      setCotizaciones(mapped)
    } catch (err) {
      console.error('Error:', err)
      setCotizaciones([])
    }
  }, [])

  // Cargar materiales
  const loadMaterials = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      const { getAllMateriales } = await import('../../utils/supabaseMateriales')
      const { data, error } = await getAllMateriales()
      if (data && !error) {
        setMaterials(data.map(m => ({
          id: m.id,
          nombre: m.nombre,
          tipo: m.tipo,
          espesor: m.espesor,
          costoUnitario: m.costo_unitario
        })))
      }
    } catch {
      try {
        const raw = localStorage.getItem('materiales')
        setMaterials(raw ? JSON.parse(raw) : [])
      } catch { setMaterials([]) }
    }
  }, [])

  useEffect(() => {
    loadCotizaciones()
    loadMaterials()
    // Cargar costo por hora predeterminado
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('costoHoraMaquinaPredeterminado')
      if (saved) {
        const valor = parseFloat(saved)
        setCostoHoraPredeterminado(valor)
        setFormData(prev => ({ ...prev, costoHoraMaquina: valor }))
      }
    }
  }, [loadCotizaciones, loadMaterials])

  // Convertir tiempo HH:MM:SS a horas decimales
  const timeToHours = (timeStr) => {
    if (!timeStr) return 0
    const parts = timeStr.split(':').map(Number)
    if (parts.length !== 3) return 0
    return parts[0] + parts[1] / 60 + parts[2] / 3600
  }

  // Recalcular totales cuando cambian los costos
  useEffect(() => {
    const horasMaquina = timeToHours(formData.tiempoMaquina)
    const costoTiempoMaquina = parseFloat((horasMaquina * formData.costoHoraMaquina).toFixed(2))
    const costoMaterialTotal = parseFloat((formData.costoMaterial * formData.cantidad).toFixed(2))
    const subtotal = parseFloat((costoMaterialTotal + costoTiempoMaquina + Number(formData.costoDiseno)).toFixed(2))
    const total = parseFloat((subtotal * (1 + formData.margen / 100)).toFixed(2))

    setFormData(prev => {
      if (prev.costoTiempoMaquina === costoTiempoMaquina && prev.subtotal === subtotal && prev.total === total) return prev
      return { ...prev, costoTiempoMaquina, subtotal, total }
    })
  }, [formData.costoMaterial, formData.cantidad, formData.tiempoMaquina, formData.costoHoraMaquina, formData.costoDiseno, formData.margen])

  // Manejar cambios
  const handleInputChange = (e) => {
    const { name, value } = e.target
    const numericFields = new Set(['cantidad', 'costoMaterial', 'costoHoraMaquina', 'costoDiseno', 'margen'])
    let newValue = value
    if (numericFields.has(name)) {
      if (value === '') { newValue = '' }
      else {
        const parsed = parseFloat(value)
        newValue = Number.isNaN(parsed) ? 0 : parsed
      }
    }
    setFormData(prev => ({ ...prev, [name]: newValue }))
  }

  // Guardar cotización
  const handleSaveCotizacion = async () => {
    try {
      const { data, error } = await createCotizacion(formData)
      if (error) {
        alert('Error al crear cotización: ' + error)
        return
      }
      await loadCotizaciones()
      resetForm()
      setShowForm(false)
      showNotification('Cotización creada exitosamente')
    } catch (err) {
      console.error('Error:', err)
      alert('Error al crear la cotización')
    }
  }

  // Cambiar estado de cotización  
  const handleChangeEstado = async (id, nuevoEstado) => {
    const { error } = await updateCotizacion(id, { estado: nuevoEstado })
    if (!error) {
      await loadCotizaciones()
      showNotification('Estado actualizado')
    }
  }

  // Eliminar cotización
  const handleDeleteCotizacion = (cotizacion) => {
    setDeleteConfirm({ id: cotizacion.id, descripcion: cotizacion.descripcion })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    const { error } = await deleteCotizacion(deleteConfirm.id)
    setDeleteConfirm(null)
    if (!error) {
      await loadCotizaciones()
      showNotification('Cotización eliminada')
    }
  }

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      clienteNombre: '',
      clienteTelefono: '',
      clienteEmail: '',
      descripcion: '',
      medidas: '',
      cantidad: 1,
      materialId: '',
      materialNombre: '',
      costoMaterial: 0,
      tiempoMaquina: '00:00:00',
      costoHoraMaquina: costoHoraPredeterminado,
      costoTiempoMaquina: 0,
      costoDiseno: 0,
      subtotal: 0,
      margen: 0,
      total: 0,
      notas: ''
    })
  }

  // Notificación
  const showNotification = (msg) => {
    if (typeof window === 'undefined') return
    const n = document.createElement('div')
    n.textContent = '✅ ' + msg
    n.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 1000;
      background: #10b981; color: white; padding: 12px 20px;
      border-radius: 8px; font-weight: 600;
    `
    document.body.appendChild(n)
    setTimeout(() => n.remove(), 3000)
  }

  // Filtrar cotizaciones
  const filteredCotizaciones = useMemo(() => {
    let filtered = [...cotizaciones]
    if (filters.search) {
      const s = filters.search.toLowerCase()
      filtered = filtered.filter(c =>
        c.clienteNombre?.toLowerCase().includes(s) ||
        c.descripcion?.toLowerCase().includes(s) ||
        c.materialNombre?.toLowerCase().includes(s) ||
        String(c.id).includes(s)
      )
    }
    if (filters.estado !== 'all') {
      filtered = filtered.filter(c => c.estado === filters.estado)
    }
    return filtered
  }, [cotizaciones, filters])

  // Métricas
  const metrics = useMemo(() => {
    const total = cotizaciones.length
    const pendientes = cotizaciones.filter(c => c.estado === 'pendiente').length
    const aprobadas = cotizaciones.filter(c => c.estado === 'aprobada').length
    const valorTotal = cotizaciones.reduce((s, c) => s + (c.total || 0), 0)
    return { total, pendientes, aprobadas, valorTotal }
  }, [cotizaciones])

  // Colores de estado
  const estadoConfig = {
    pendiente: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente' },
    aprobada: { bg: '#d1fae5', color: '#065f46', label: 'Aprobada' },
    rechazada: { bg: '#fee2e2', color: '#991b1b', label: 'Rechazada' },
    completada: { bg: '#dbeafe', color: '#1e40af', label: 'Completada' }
  }

  // Estilos reusables
  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-primary)'
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '2px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
    outline: 'none',
    boxSizing: 'border-box'
  }

  const sectionStyle = {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(168, 85, 247, 0.08) 100%)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    boxShadow: '0 2px 8px rgba(139, 92, 246, 0.08)'
  }

  return (
    <Layout title="Cotizaciones de Corte - Sistema KOND">
      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div
          onClick={() => setDeleteConfirm(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 9999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary, #fff)', borderRadius: '16px',
              padding: '32px', maxWidth: '420px', width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center'
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '1.5rem'
            }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #111)' }}>
              Eliminar cotización
            </h3>
            <p style={{ margin: '0 0 8px', color: 'var(--text-secondary, #666)', fontSize: '0.95rem' }}>
              ¿Estás seguro de que quieres eliminar la cotización{' '}
              <strong style={{ color: 'var(--text-primary, #111)' }}>{deleteConfirm.descripcion}</strong>?
            </p>
            <p style={{ margin: '0 0 24px', color: '#ef4444', fontSize: '0.8rem', fontWeight: 500 }}>
              Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1, padding: '10px 20px', borderRadius: '10px',
                  border: '1px solid var(--border-color, #ddd)',
                  background: 'var(--bg-primary, #f5f5f5)',
                  color: 'var(--text-primary, #333)', fontSize: '0.9rem',
                  fontWeight: 600, cursor: 'pointer'
                }}
              >Cancelar</button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1, padding: '10px 20px', borderRadius: '10px',
                  border: 'none', background: '#ef4444', color: 'white',
                  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer'
                }}
              >Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            ✂️ Cotizaciones de Servicio de Corte
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Genera cotizaciones para trabajos de corte láser con desglose de costos
          </p>
        </div>

        {/* Métricas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {[
            { label: 'Total Cotizaciones', value: metrics.total, icon: '📋', color: '#3b82f6' },
            { label: 'Pendientes', value: metrics.pendientes, icon: '⏳', color: '#f59e0b' },
            { label: 'Aprobadas', value: metrics.aprobadas, icon: '✅', color: '#10b981' },
            { label: 'Valor Total', value: formatCurrency(metrics.valorTotal), icon: '💰', color: '#8b5cf6' }
          ].map((m, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: '12px', padding: '20px',
              borderLeft: `4px solid ${m.color}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{m.label}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Botones y Filtros */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: '12px', padding: '20px', marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '12px'
          }}>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                background: showForm ? 'var(--text-secondary)' : '#8b5cf6',
                color: 'white', border: 'none', borderRadius: '8px',
                padding: '12px 20px', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.9rem', height: '44px', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}
            >
              {showForm ? '∧ Ocultar Formulario' : '+ Nueva Cotización de Corte'}
            </button>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Buscar cotización..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{
                  padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  fontSize: '0.9rem', minWidth: '220px'
                }}
              />
              <select
                value={filters.estado}
                onChange={(e) => setFilters(prev => ({ ...prev, estado: e.target.value }))}
                style={{
                  padding: '8px 12px', borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="completada">Completada</option>
              </select>
            </div>
          </div>

          {/* Formulario de Cotización */}
          {showForm && (
            <div style={{
              background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
              border: '2px solid var(--border-color)',
              borderRadius: '16px',
              padding: '32px',
              marginTop: '20px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                marginBottom: '32px', paddingBottom: '20px',
                borderBottom: '2px solid var(--border-color)'
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '12px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
                }}>✂️</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Nueva Cotización de Corte
                  </h3>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Ingresa los datos del trabajo para generar la cotización
                  </p>
                </div>
              </div>

              {/* Sección: Cliente */}
              <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>👤</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Datos del Cliente
                  </h4>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px'
                }}>
                  <div>
                    <label style={labelStyle}>
                      Nombre <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="clienteNombre"
                      value={formData.clienteNombre}
                      onChange={handleInputChange}
                      placeholder="Nombre del cliente"
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Teléfono</label>
                    <input
                      type="tel"
                      name="clienteTelefono"
                      value={formData.clienteTelefono}
                      onChange={handleInputChange}
                      placeholder="Ej: +54 11 1234-5678"
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      name="clienteEmail"
                      value={formData.clienteEmail}
                      onChange={handleInputChange}
                      placeholder="cliente@email.com"
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Descripción del Trabajo */}
              <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>📝</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Descripción del Trabajo
                  </h4>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px'
                }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>
                      Descripción <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleInputChange}
                      placeholder="Describe el trabajo a realizar (ej: Corte de 50 piezas en MDF 3mm con diseño personalizado)"
                      rows={3}
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                        minHeight: '80px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Medidas</label>
                    <input
                      type="text"
                      name="medidas"
                      value={formData.medidas}
                      onChange={handleInputChange}
                      placeholder="Ej: 10x15 cm"
                      style={inputStyle}
                      onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Cantidad <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      name="cantidad"
                      value={formData.cantidad}
                      onChange={handleInputChange}
                      min="1"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Sección: Costo de Material */}
              <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>🎨</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Costo de Material
                  </h4>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px'
                }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={labelStyle}>Material</label>
                    <select
                      name="materialId"
                      value={formData.materialId}
                      onChange={(e) => {
                        const id = e.target.value
                        const sel = materials.find(x => String(x.id) === String(id))
                        if (sel) {
                          setFormData(prev => ({
                            ...prev,
                            materialId: id,
                            materialNombre: sel.nombre + (sel.tipo ? ` — ${sel.tipo}` : '') + (sel.espesor ? ` — ${sel.espesor}` : ''),
                            costoMaterial: Number(sel.costoUnitario || 0)
                          }))
                        } else {
                          setFormData(prev => ({ ...prev, materialId: '', materialNombre: '', costoMaterial: 0 }))
                        }
                      }}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="">-- Seleccionar material --</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}{m.tipo ? ` — ${m.tipo}` : ''}{m.espesor ? ` — ${m.espesor}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Costo Material (unitario $)</label>
                    <input
                      type="number"
                      name="costoMaterial"
                      value={formData.costoMaterial}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      style={inputStyle}
                    />
                    {formData.cantidad > 1 && (
                      <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                        Total material: {formatCurrency(formData.costoMaterial * formData.cantidad)} ({formData.cantidad} unidades)
                      </small>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección: Tiempo de Máquina */}
              <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>⚙️</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Costo de Tiempo de Máquina
                  </h4>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px'
                }}>
                  <div>
                    <label style={labelStyle}>Tiempo de Máquina</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        name="tiempoMaquina"
                        value={formData.tiempoMaquina}
                        onChange={handleInputChange}
                        placeholder="00:30:00"
                        pattern="^[0-9]{2}:[0-9]{2}:[0-9]{2}$"
                        style={inputStyle}
                      />
                      <span style={{
                        position: 'absolute', right: '16px', top: '50%',
                        transform: 'translateY(-50%)', color: 'var(--text-secondary)',
                        fontSize: '0.85rem', pointerEvents: 'none'
                      }}>HH:MM:SS</span>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Costo por Hora de Máquina ($)</label>
                    <input
                      type="number"
                      name="costoHoraMaquina"
                      value={formData.costoHoraMaquina}
                      onChange={(e) => {
                        handleInputChange(e)
                        // Guardar como valor predeterminado
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('costoHoraMaquinaPredeterminado', e.target.value)
                          setCostoHoraPredeterminado(parseFloat(e.target.value) || 0)
                        }
                      }}
                      min="0"
                      step="0.01"
                      style={inputStyle}
                    />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      Este valor se guardará como predeterminado
                    </small>
                  </div>
                  <div>
                    <label style={labelStyle}>Costo Tiempo Máquina</label>
                    <div style={{
                      ...inputStyle,
                      background: 'var(--bg-tertiary)',
                      color: '#10b981',
                      fontWeight: 600,
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {formatCurrency(formData.costoTiempoMaquina)}
                    </div>
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      {timeToHours(formData.tiempoMaquina).toFixed(2)} hs × {formatCurrency(formData.costoHoraMaquina)}/h
                    </small>
                  </div>
                </div>
              </div>

              {/* Sección: Costo de Diseño */}
              <div style={sectionStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>🎨</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Costo de Diseño
                  </h4>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px'
                }}>
                  <div>
                    <label style={labelStyle}>Costo de Diseño ($)</label>
                    <input
                      type="number"
                      name="costoDiseno"
                      value={formData.costoDiseno}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      style={inputStyle}
                    />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      Incluye vectorizado, ajustes y preparación del archivo de corte
                    </small>
                  </div>
                </div>
              </div>

              {/* Sección: Resumen y Totales */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.08) 100%)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '20px' }}>💰</span>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Resumen de Costos
                  </h4>
                </div>

                {/* Desglose visual */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  padding: '20px',
                  marginBottom: '20px',
                  border: '1px solid var(--border-color)'
                }}>
                  {[
                    { label: 'Material', value: formData.costoMaterial * formData.cantidad },
                    { label: 'Tiempo de corte', value: formData.costoTiempoMaquina },
                    { label: 'Diseño', value: Number(formData.costoDiseno) }
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: i < 2 ? '1px solid var(--border-color)' : 'none'
                    }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0 4px', borderTop: '2px solid var(--border-color)',
                    marginTop: '8px'
                  }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>Subtotal</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                      {formatCurrency(formData.subtotal)}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px'
                }}>
                  <div>
                    <label style={labelStyle}>Margen de Ganancia (%)</label>
                    <input
                      type="number"
                      name="margen"
                      value={formData.margen}
                      onChange={handleInputChange}
                      min="0"
                      step="0.1"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Total</label>
                    <div style={{
                      ...inputStyle,
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.3rem',
                      textAlign: 'center',
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none'
                    }}>
                      {formatCurrency(formData.total)}
                    </div>
                    {formData.margen > 0 && (
                      <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                        Ganancia: {formatCurrency(formData.total - formData.subtotal)}
                      </small>
                    )}
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Notas adicionales</label>
                <textarea
                  name="notas"
                  value={formData.notas}
                  onChange={handleInputChange}
                  placeholder="Observaciones, condiciones de entrega, etc."
                  rows={2}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: '60px'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
              </div>

              {/* Botones */}
              <div style={{
                display: 'flex', gap: '16px', paddingTop: '24px',
                borderTop: '2px solid var(--border-color)'
              }}>
                <button
                  onClick={handleSaveCotizacion}
                  disabled={!formData.clienteNombre || !formData.descripcion}
                  style={{
                    flex: 1,
                    background: (formData.clienteNombre && formData.descripcion)
                      ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                      : 'var(--text-secondary)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    padding: '10px 20px', cursor: (formData.clienteNombre && formData.descripcion) ? 'pointer' : 'not-allowed',
                    fontWeight: 600, fontSize: '0.9rem',
                    boxShadow: (formData.clienteNombre && formData.descripcion)
                      ? '0 2px 8px rgba(139, 92, 246, 0.25)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (formData.clienteNombre && formData.descripcion) {
                      e.target.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)' }}
                >
                  ✅ Crear Cotización
                </button>
                <button
                  onClick={() => { setShowForm(false); resetForm() }}
                  style={{
                    flex: 0.6, background: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '8px', padding: '10px 20px',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.target.style.background = 'var(--bg-secondary)' }}
                  onMouseLeave={(e) => { e.target.style.background = 'transparent' }}
                >
                  ✕ Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Cotizaciones */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: '12px', padding: '20px'
        }}>
          <h2 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>
            Cotizaciones ({filteredCotizaciones.length})
          </h2>

          {filteredCotizaciones.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredCotizaciones.map(cot => {
                const eConf = estadoConfig[cot.estado] || estadoConfig.pendiente
                return (
                  <div key={cot.id} style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '20px',
                    transition: 'all 0.2s',
                    borderLeft: `4px solid ${eConf.color}`
                  }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      flexWrap: 'wrap', gap: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            #{cot.id} — {cot.descripcion}
                          </h3>
                          <span style={{
                            padding: '3px 10px', borderRadius: '20px',
                            fontSize: '0.75rem', fontWeight: 600,
                            background: eConf.bg, color: eConf.color
                          }}>
                            {eConf.label}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <strong>Cliente:</strong> {cot.clienteNombre}
                          {cot.clienteTelefono && ` · ${cot.clienteTelefono}`}
                        </p>
                        {cot.medidas && (
                          <p style={{ margin: '2px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Medidas: {cot.medidas} · Cantidad: {cot.cantidad}
                            {cot.materialNombre && ` · Material: ${cot.materialNombre}`}
                          </p>
                        )}
                        {cot.createdAt && (
                          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem', opacity: 0.7 }}>
                            {new Date(cot.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      {/* Costos desglosados */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Material</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(cot.costoMaterial * cot.cantidad)}</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Corte</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(cot.costoTiempoMaquina)}</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diseño</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(cot.costoDiseno)}</div>
                        </div>
                        <div style={{
                          textAlign: 'center', minWidth: '100px',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                          padding: '8px 16px', borderRadius: '10px', color: 'white'
                        }}>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>Total</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(cot.total)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Información adicional y Acciones */}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      gap: '16px', marginTop: '12px', paddingTop: '12px',
                      borderTop: '1px solid var(--border-color)', flexWrap: 'wrap'
                    }}>
                      {/* Info adicional: Tiempo y Precio por minuto */}
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>⏱️ Tiempo:</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {cot.tiempoMaquina || '00:00:00'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>💵 Precio/min:</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {(() => {
                              const mins = timeToHours(cot.tiempoMaquina || '00:00:00') * 60
                              const precioMinuto = mins > 0 ? (cot.costoTiempoMaquina / mins) : 0
                              return formatCurrency(precioMinuto)
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {cot.estado === 'pendiente' && (
                          <>
                            <button
                              onClick={() => handleChangeEstado(cot.id, 'aprobada')}
                              style={{
                                padding: '6px 14px', borderRadius: '6px', border: 'none',
                                background: '#10b981', color: 'white', fontSize: '0.8rem',
                                fontWeight: 600, cursor: 'pointer'
                              }}
                            >Aprobar</button>
                            <button
                              onClick={() => handleChangeEstado(cot.id, 'rechazada')}
                              style={{
                                padding: '6px 14px', borderRadius: '6px', border: 'none',
                                background: '#ef4444', color: 'white', fontSize: '0.8rem',
                                fontWeight: 600, cursor: 'pointer'
                              }}
                            >Rechazar</button>
                          </>
                        )}
                        {cot.estado === 'aprobada' && (
                          <button
                            onClick={() => handleChangeEstado(cot.id, 'completada')}
                            style={{
                              padding: '6px 14px', borderRadius: '6px', border: 'none',
                              background: '#3b82f6', color: 'white', fontSize: '0.8rem',
                              fontWeight: 600, cursor: 'pointer'
                            }}
                          >Marcar Completada</button>
                        )}
                        <button
                          onClick={() => handleDeleteCotizacion(cot)}
                          style={{
                            padding: '6px 14px', borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'transparent', color: 'var(--text-secondary)',
                            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                          }}
                        >🗑️ Eliminar</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>✂️</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
                No hay cotizaciones
              </p>
              <p style={{ fontSize: '0.9rem' }}>
                Crea tu primera cotización de servicio de corte
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(Cotizaciones)
