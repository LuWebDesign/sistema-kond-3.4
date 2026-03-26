import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import styles from '../../styles/materiales.module.css'

const STORAGE_KEY = 'materiales'

function Materiales() {
  const [materiales, setMateriales] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [proveedores, setProveedores] = useState([])
  const [showNewProveedor, setShowNewProveedor] = useState(false)
  const [newProveedor, setNewProveedor] = useState('')
  const [tamanos, setTamanos] = useState([])
  const [showNewTamano, setShowNewTamano] = useState(false)
  const [newTamano, setNewTamano] = useState('')
  const [espesores, setEspesores] = useState([])
  const [showNewEspesor, setShowNewEspesor] = useState(false)
  const [newEspesor, setNewEspesor] = useState('')
  
  // Inicializar darkMode desde localStorage inmediatamente para evitar flash
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('finanzas_dark')
        return saved ? JSON.parse(saved) : false
      } catch {
        return false
      }
    }
    return false
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [form, setForm] = useState({
    nombre: '',
    tipo: '',
    tamano: '',
    espesor: '',
    costoUnitario: '',
    proveedor: '',
    stock: '',
    unidad: 'cm',
    notas: ''
  })
  const nombreRef = useRef(null)

  // Memoizar loadData con useCallback
  const loadData = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // 🆕 Intentar cargar materiales desde Supabase primero
      const { getAllMateriales, getAllProveedores, getAllTamanos, getAllEspesores } = await import('../../utils/supabaseMateriales')
      
      // Cargar materiales
      const { data: materialesSupabase, error: errorMateriales } = await getAllMateriales()
      
      if (materialesSupabase && !errorMateriales) {
        // Mapear de snake_case a camelCase
        const mappedMateriales = materialesSupabase.map(m => ({
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
        
        setMateriales(mappedMateriales)
        // console.log('✅ Materiales cargados desde Supabase:', mappedMateriales.length)
      } else {
        throw new Error('Supabase materiales failed')
      }
      
      // 🆕 Cargar proveedores desde Supabase
      try {
        const { data: proveedoresSupabase } = await getAllProveedores()
        if (proveedoresSupabase && proveedoresSupabase.length > 0) {
          const nombresProveedores = proveedoresSupabase.map(p => p.nombre)
          setProveedores(nombresProveedores)
          // console.log('✅ Proveedores cargados desde Supabase:', nombresProveedores.length)
        } else {
          // Fallback a localStorage
          const rawP = localStorage.getItem('proveedores')
          if (rawP) setProveedores(JSON.parse(rawP))
        }
      } catch (e) {
        console.warn('⚠️ Fallback a localStorage para proveedores')
        const rawP = localStorage.getItem('proveedores')
        if (rawP) setProveedores(JSON.parse(rawP))
      }
      
      // 🆕 Cargar tamaños desde Supabase
      try {
        const { data: tamanosSupabase } = await getAllTamanos()
        if (tamanosSupabase && tamanosSupabase.length > 0) {
          const valoresTamanos = tamanosSupabase.map(t => t.valor)
          setTamanos(valoresTamanos)
          // console.log('✅ Tamaños cargados desde Supabase:', valoresTamanos.length)
        } else {
          // Fallback a localStorage
          const rawT = localStorage.getItem('tamanos')
          if (rawT) setTamanos(JSON.parse(rawT))
        }
      } catch (e) {
        console.warn('⚠️ Fallback a localStorage para tamaños')
        const rawT = localStorage.getItem('tamanos')
        if (rawT) setTamanos(JSON.parse(rawT))
      }
      
      // 🆕 Cargar espesores desde Supabase
      try {
        const { data: espesoresSupabase } = await getAllEspesores()
        if (espesoresSupabase && espesoresSupabase.length > 0) {
          const valoresEspesores = espesoresSupabase.map(e => e.valor)
          setEspesores(valoresEspesores)
          // console.log('✅ Espesores cargados desde Supabase:', valoresEspesores.length)
        } else {
          // Fallback a localStorage
          const rawE = localStorage.getItem('espesores')
          if (rawE) setEspesores(JSON.parse(rawE))
        }
      } catch (e) {
        console.warn('⚠️ Fallback a localStorage para espesores')
        const rawE = localStorage.getItem('espesores')
        if (rawE) setEspesores(JSON.parse(rawE))
      }
      
    } catch (supabaseError) {
      console.warn('⚠️ Fallback completo a localStorage')
      
      // Fallback: localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) setMateriales(JSON.parse(raw))
      } catch (e) { 
        console.error('load materiales', e) 
      }
      
      try {
        const rawP = localStorage.getItem('proveedores')
        if (rawP) setProveedores(JSON.parse(rawP))
      } catch (e) { console.error('load proveedores', e) }
      
      try {
        const rawT = localStorage.getItem('tamanos')
        if (rawT) setTamanos(JSON.parse(rawT))
      } catch (e) { console.error('load tamanos', e) }
      
      try {
        const rawE = localStorage.getItem('espesores')
        if (rawE) setEspesores(JSON.parse(rawE))
      } catch (e) { console.error('load espesores', e) }
    }
    
    // Ya no necesitamos cargar darkMode aquí porque se inicializa en useState
    
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const save = useCallback(async (items, skipReload = false) => {
    setMateriales(items)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch (err) {}
    if (!skipReload) {
      await loadData()
    }
  }, [loadData])

  // reset form; if keepOpen === true the form remains visible (useful to create multiple items quickly)
  const resetForm = (keepOpen = false) => {
    setForm({ nombre: '', tipo: '', tamano: '', espesor: '', costoUnitario: '', proveedor: '', stock: '', unidad: 'cm', notas: '' })
    setEditingId(null)
    setShowForm(keepOpen)
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    
    try {
      if (editingId) {
        // 🆕 ACTUALIZAR en Supabase
        const { updateMaterial } = await import('../../utils/supabaseMateriales')
        const { data, error } = await updateMaterial(editingId, form)
        
        if (data && !error) {
          // console.log('✅ Material actualizado en Supabase')
          await loadData() // Recargar desde Supabase
          resetForm(false)
          alert('Material actualizado correctamente')
        } else {
          throw new Error('Supabase update failed')
        }
      } else {
        // 🆕 CREAR en Supabase
        const { createMaterial } = await import('../../utils/supabaseMateriales')
        const { data, error } = await createMaterial(form)
        
        if (data && !error) {
          // console.log('✅ Material creado en Supabase')
          await loadData() // Recargar desde Supabase
          resetForm(true) // Mantener form abierto para crear más
          
          // focus the nombre input for quick entry
          setTimeout(() => { 
            try { 
              nombreRef.current && nombreRef.current.focus()
              nombreRef.current && nombreRef.current.select()
            } catch (err) {} 
          }, 50)
        } else {
          throw new Error('Supabase create failed')
        }
      }
    } catch (supabaseError) {
      console.warn('⚠️ Fallback a localStorage:', supabaseError.message)
      
      // Fallback: localStorage (código original)
      const payload = { ...form, id: editingId || Date.now() }
      if (editingId) {
        save(materiales.map(m => m.id === editingId ? payload : m))
        resetForm(false)
      } else {
        save([ ...materiales, payload ])
        resetForm(true)
        setTimeout(() => { 
          try { 
            nombreRef.current && nombreRef.current.focus()
            nombreRef.current && nombreRef.current.select()
          } catch (err) {} 
        }, 50)
      }
    }
  }

  const handleEdit = (m) => {
    setForm({ ...m })
    setEditingId(m.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    const doDelete = async () => {
      try {
        const { deleteMaterial } = await import('../../utils/supabaseMateriales')
        const { error } = await deleteMaterial(id)
        if (!error) {
          await loadData()
        } else {
          throw new Error('Supabase delete failed')
        }
      } catch (supabaseError) {
        console.warn('⚠️ Fallback a localStorage para eliminar')
        save(materiales.filter(m => m.id !== id))
      }
    }
    if (typeof window !== 'undefined' && window.showCustomConfirm) {
      window.showCustomConfirm('Eliminar material', '¿Eliminar este material?', doDelete)
    } else {
      doDelete()
    }
  }

  const formatCurrency = (v) => {
    const n = Number(v || 0)
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
  }

  const handleToggleDark = useCallback(() => {
    const next = !darkMode
    setDarkMode(next)
    try { localStorage.setItem('finanzas_dark', JSON.stringify(next)) } catch {}
  }, [darkMode])

  const tipoColor = (tipo) => {
    const map = { mdf: '#2563eb', melamina: '#7c3aed', 'acrílico': '#059669', acrilico: '#059669', vidrio: '#0891b2', madera: '#d97706', aluminio: '#64748b', metal: '#64748b', pvc: '#db2777' }
    return map[(tipo || '').toLowerCase()] || '#64748b'
  }

  return (
    <Layout>
  <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Materiales</h1>
            <p className={styles.subtitle}>Gestión de materiales: costos, tamaños, espesor y proveedores</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.darkToggle} onClick={handleToggleDark} title="Alternar modo oscuro">
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className={styles.btnPrimary} onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: '', tipo: '', tamano: '', espesor: '', costoUnitario: '', proveedor: '', stock: '', unidad: 'cm', notas: '' }) }}>
              + Nuevo material
            </button>
          </div>
        </div>

        {!isLoading && materiales.length > 0 && (
          <div className={styles.kpiStrip}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiIcon}>📦</span>
              <div>
                <div className={styles.kpiLabel}>Materiales</div>
                <div className={styles.kpiValue}>{materiales.length}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiIcon}>🗂️</span>
              <div>
                <div className={styles.kpiLabel}>Tipos</div>
                <div className={styles.kpiValue}>{[...new Set(materiales.filter(m => m.tipo).map(m => m.tipo))].length}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiIcon}>⚠️</span>
              <div>
                <div className={styles.kpiLabel}>Sin stock</div>
                <div className={`${styles.kpiValue} ${materiales.filter(m => !m.stock || Number(m.stock) <= 0).length > 0 ? styles.kpiAlert : ''}`}>
                  {materiales.filter(m => !m.stock || Number(m.stock) <= 0).length}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.list}>
            {isLoading ? (
              <div className={styles.loading}>Cargando materiales…</div>
            ) : materiales.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📦</div>
                <div className={styles.emptyText}>No hay materiales definidos</div>
                <div className={styles.emptyHint}>Usá el botón «+ Nuevo material» para agregar el primero</div>
              </div>
            ) : (
              materiales.map(m => (
                <div key={m.id} className={styles.card} style={{ borderLeftColor: tipoColor(m.tipo) }}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleRow}>
                      <strong className={styles.name}>{m.nombre}</strong>
                      {m.tipo && <span className={styles.tipoBadge} style={{ background: tipoColor(m.tipo) + '18', color: tipoColor(m.tipo) }}>{m.tipo}</span>}
                    </div>
                    <div className={styles.actions}>
                      <button className={styles.btnSmall} onClick={() => handleEdit(m)}>Editar</button>
                      <button className={styles.btnSmallDanger} onClick={() => handleDelete(m.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className={styles.cardInfo}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Costo</span>
                      <span className={`${styles.infoValue} ${styles.infoCost}`}>{formatCurrency(m.costoUnitario)}</span>
                    </div>
                    {m.tamano && <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Tamaño</span>
                      <span className={styles.infoValue}>{m.tamano} {m.unidad}</span>
                    </div>}
                    {m.espesor && <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Espesor</span>
                      <span className={styles.infoValue}>{m.espesor}</span>
                    </div>}
                    {m.proveedor && <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Proveedor</span>
                      <span className={styles.infoValue}>{m.proveedor}</span>
                    </div>}
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Stock</span>
                      <span className={`${styles.stockPill} ${!m.stock || Number(m.stock) <= 0 ? styles.stockCero : Number(m.stock) <= 5 ? styles.stockBajo : styles.stockOk}`}>
                        {m.stock || 0} {m.unidad}
                      </span>
                    </div>
                  </div>
                  {m.notas && <div className={styles.notas}>{m.notas}</div>}
                </div>
              ))
            )}
          </div>

          {showForm && (
            <aside className={styles.formContainer}>
              <div className={styles.formHeader}>
                <h3 className={styles.formTitle}>{editingId ? 'Editar material' : 'Nuevo material'}</h3>
                <button type="button" className={styles.closeBtn} onClick={() => resetForm(false)} aria-label="Cerrar formulario">✕</button>
              </div>

              <form onSubmit={handleSubmit} className={styles.formGrid} onKeyDown={(e) => {
                // On Enter, move focus to the next form control; if none, submit.
                if (e.key === 'Enter' && e.target && e.target.tagName !== 'TEXTAREA') {
                  e.preventDefault()
                  try {
                    const formEl = e.currentTarget
                    const focusable = Array.from(formEl.querySelectorAll('input, select, textarea, button'))
                      .filter(el => !el.disabled && el.type !== 'hidden' && el.getAttribute('aria-hidden') !== 'true')
                    const idx = focusable.indexOf(e.target)
                    if (idx >= 0 && idx < focusable.length - 1) {
                      const next = focusable[idx + 1]
                      next.focus()
                      if (next.select) next.select()
                      return
                    }
                  } catch (err) {
                    // fallback to submit
                  }
                  handleSubmit(e)
                }
              }}>
                <div className={styles.formRow}>
                  <label className={styles.label}>Nombre <span className={styles.required}>*</span></label>
                  <input ref={nombreRef} className={styles.field} value={form.nombre} onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))} required />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Tipo</label>
                  <input className={styles.field} value={form.tipo} onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value }))} placeholder="ej: MDF, Melamina, Acrílico" />
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Tamaño</label>
                  <div className={styles.proveedorRow}>
                    <select className={styles.field} value={form.tamano || ''} onChange={(e) => {
                      const v = e.target.value
                      if (v === '__new__') { setShowNewTamano(true); setForm(prev => ({ ...prev, tamano: '' })) }
                      else setForm(prev => ({ ...prev, tamano: v }))
                    }}>
                      <option value="">— seleccionar —</option>
                      {form.tamano && !tamanos.includes(form.tamano) && <option value={form.tamano}>{form.tamano}</option>}
                      {tamanos.map((t, i) => <option key={i} value={t}>{t}</option>)}
                      <option value="__new__">+ Crear nuevo tamaño...</option>
                    </select>
                    <button type="button" className={styles.btnSmall} onClick={() => setShowNewTamano(true)}>+</button>
                  </div>

                  {showNewTamano && (
                    <div className={styles.newProveedorRow}>
                      <input className={styles.field} placeholder="ej: 100x200" value={newTamano} onChange={(e) => setNewTamano(e.target.value)} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="button" className={styles.btnPrimary} onClick={async () => {
                          const v = (newTamano || '').trim()
                          if (!v) return
                          
                          // 🆕 Intentar guardar en Supabase
                          try {
                            const { createTamano } = await import('../../utils/supabaseMateriales')
                            const { data, error } = await createTamano(v)
                            
                            if (data && !error) {
                              // console.log('✅ Tamaño creado en Supabase')
                              // Recargar catálogos
                              await loadData()
                              setForm(prev => ({ ...prev, tamano: v }))
                              setNewTamano('')
                              setShowNewTamano(false)
                              return
                            } else {
                              throw new Error('Supabase failed')
                            }
                          } catch (supabaseError) {
                            console.warn('⚠️ Fallback a localStorage para tamaño')
                            
                            // Fallback: localStorage
                            const next = Array.from(new Set([...(tamanos || []), v]))
                            setTamanos(next)
                            try { localStorage.setItem('tamanos', JSON.stringify(next)) } catch (err) { console.error('save tamanos', err) }
                            setForm(prev => ({ ...prev, tamano: v }))
                            setNewTamano('')
                            setShowNewTamano(false)
                          }
                        }}>Agregar</button>
                        <button type="button" className={styles.btnSecondary} onClick={() => { setNewTamano(''); setShowNewTamano(false) }}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Unidad</label>
                  <select className={styles.field} value={form.unidad} onChange={(e) => setForm(prev => ({ ...prev, unidad: e.target.value }))}>
                    <option value="m">m</option>
                    <option value="cm">cm</option>
                    <option value="mm">mm</option>
                    <option value="ud">ud</option>
                  </select>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Espesor</label>
                  <div className={styles.proveedorRow}>
                    <select className={styles.field} value={form.espesor || ''} onChange={(e) => {
                      const v = e.target.value
                      if (v === '__new__') { setShowNewEspesor(true); setForm(prev => ({ ...prev, espesor: '' })) }
                      else setForm(prev => ({ ...prev, espesor: v }))
                    }}>
                      <option value="">— seleccionar —</option>
                      {form.espesor && !espesores.includes(form.espesor) && <option value={form.espesor}>{form.espesor}</option>}
                      {espesores.map((t, i) => <option key={i} value={t}>{t}</option>)}
                      <option value="__new__">+ Crear nuevo espesor...</option>
                    </select>
                    <button type="button" className={styles.btnSmall} onClick={() => setShowNewEspesor(true)}>+</button>
                  </div>

                  {showNewEspesor && (
                    <div className={styles.newProveedorRow}>
                      <input className={styles.field} placeholder="ej: 2 mm" value={newEspesor} onChange={(e) => setNewEspesor(e.target.value)} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="button" className={styles.btnPrimary} onClick={async () => {
                          const v = (newEspesor || '').trim()
                          if (!v) return
                          
                          // 🆕 Intentar guardar en Supabase
                          try {
                            const { createEspesor } = await import('../../utils/supabaseMateriales')
                            const { data, error } = await createEspesor(v)
                            
                            if (data && !error) {
                              // console.log('✅ Espesor creado en Supabase')
                              // Recargar catálogos
                              await loadData()
                              setForm(prev => ({ ...prev, espesor: v }))
                              setNewEspesor('')
                              setShowNewEspesor(false)
                              return
                            } else {
                              throw new Error('Supabase failed')
                            }
                          } catch (supabaseError) {
                            console.warn('⚠️ Fallback a localStorage para espesor')
                            
                            // Fallback: localStorage
                            const next = Array.from(new Set([...(espesores || []), v]))
                            setEspesores(next)
                            try { localStorage.setItem('espesores', JSON.stringify(next)) } catch (err) { console.error('save espesores', err) }
                            setForm(prev => ({ ...prev, espesor: v }))
                            setNewEspesor('')
                            setShowNewEspesor(false)
                          }
                        }}>Agregar</button>
                        <button type="button" className={styles.btnSecondary} onClick={() => { setNewEspesor(''); setShowNewEspesor(false) }}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Costo unitario</label>
                  <input className={`${styles.field} ${styles.costInput}`} type="number" step="0.01" value={form.costoUnitario} onChange={(e) => setForm(prev => ({ ...prev, costoUnitario: e.target.value }))} />
                  <div className={styles.costPreviewFull}>{formatCurrency(form.costoUnitario)}</div>
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Proveedor</label>
                  <div className={styles.proveedorRow}>
                    <select className={styles.field} value={form.proveedor || ''} onChange={(e) => {
                      const v = e.target.value
                      if (v === '__new__') { setShowNewProveedor(true); setForm(prev => ({ ...prev, proveedor: '' })) }
                      else setForm(prev => ({ ...prev, proveedor: v }))
                    }}>
                      <option value="">— seleccionar —</option>
                      {proveedores.map((p, i) => <option key={i} value={p}>{p}</option>)}
                      <option value="__new__">+ Crear nuevo proveedor...</option>
                    </select>
                    <button type="button" className={styles.btnSmall} onClick={() => setShowNewProveedor(true)}>+</button>
                  </div>

                  {showNewProveedor && (
                    <div className={styles.newProveedorRow}>
                      <input className={styles.field} placeholder="Nombre del proveedor" value={newProveedor} onChange={(e) => setNewProveedor(e.target.value)} />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="button" className={styles.btnPrimary} onClick={async () => {
                          const v = (newProveedor || '').trim()
                          if (!v) return
                          
                          // 🆕 Intentar guardar en Supabase
                          try {
                            const { createProveedor } = await import('../../utils/supabaseMateriales')
                            const { data, error } = await createProveedor({ nombre: v })
                            
                            if (data && !error) {
                              // console.log('✅ Proveedor creado en Supabase')
                              // Recargar catálogos
                              await loadData()
                              setForm(prev => ({ ...prev, proveedor: v }))
                              setNewProveedor('')
                              setShowNewProveedor(false)
                              return
                            } else {
                              throw new Error('Supabase failed')
                            }
                          } catch (supabaseError) {
                            console.warn('⚠️ Fallback a localStorage para proveedor')
                            
                            // Fallback: localStorage
                            const next = Array.from(new Set([...(proveedores || []), v]))
                            setProveedores(next)
                            try { localStorage.setItem('proveedores', JSON.stringify(next)) } catch (err) { console.error('save proveedores', err) }
                            setForm(prev => ({ ...prev, proveedor: v }))
                            setNewProveedor('')
                            setShowNewProveedor(false)
                          }
                        }}>Agregar</button>
                        <button type="button" className={styles.btnSecondary} onClick={() => { setNewProveedor(''); setShowNewProveedor(false) }}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.formRow}>
                  <label className={styles.label}>Stock</label>
                  <input className={styles.field} type="number" value={form.stock} onChange={(e) => setForm(prev => ({ ...prev, stock: e.target.value }))} />
                </div>

                <div className={styles.formRowFull}>
                  <label className={styles.label}>Notas</label>
                  <textarea className={styles.field} rows={4} value={form.notas} onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))} />
                </div>

                <div className={styles.formActions}>
                  <button type="button" className={styles.btnSecondary} onClick={resetForm}>Cancelar</button>
                  <button type="submit" className={styles.btnPrimary}>{editingId ? 'Guardar cambios' : 'Crear'}</button>
                </div>
              </form>
            </aside>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(Materiales)
