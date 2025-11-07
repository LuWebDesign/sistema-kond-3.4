import { useState, useEffect, useRef } from 'react'
import Layout from '../components/Layout'
import withAdminAuth from '../components/withAdminAuth'
import styles from '../styles/materiales.module.css'

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
  const [darkMode, setDarkMode] = useState(false)
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

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    
    try {
      // 🆕 Intentar cargar desde Supabase primero
      const { getAllMateriales } = await import('../utils/supabaseMateriales')
      const { data: materialesSupabase, error } = await getAllMateriales()
      
      if (materialesSupabase && !error) {
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
        console.log('✅ Materiales cargados desde Supabase:', mappedMateriales.length)
      } else {
        throw new Error('Supabase failed')
      }
    } catch (supabaseError) {
      console.warn('⚠️ Fallback a localStorage para materiales')
      
      // Fallback: localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) setMateriales(JSON.parse(raw))
      } catch (e) { 
        console.error('load materiales', e) 
      }
    }
    
    // Cargar catálogos auxiliares (localStorage por ahora)
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
    
    // load dark mode preference
    try {
      const saved = JSON.parse(localStorage.getItem('finanzas_dark'))
      if (typeof saved === 'boolean') setDarkMode(saved)
    } catch (e) {}
    
    setIsLoading(false)
  }

  const save = async (items, skipReload = false) => {
    // Esta función ahora es un wrapper de compatibilidad
    setMateriales(items)
    try { 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) 
    } catch (e) { 
      console.error('save materiales to localStorage', e) 
    }
    
    if (!skipReload) {
      // Recargar desde Supabase para sincronizar
      await loadData()
    }
  }

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
        const { updateMaterial } = await import('../utils/supabaseMateriales')
        const { data, error } = await updateMaterial(editingId, form)
        
        if (data && !error) {
          console.log('✅ Material actualizado en Supabase')
          await loadData() // Recargar desde Supabase
          resetForm(false)
          alert('Material actualizado correctamente')
        } else {
          throw new Error('Supabase update failed')
        }
      } else {
        // 🆕 CREAR en Supabase
        const { createMaterial } = await import('../utils/supabaseMateriales')
        const { data, error } = await createMaterial(form)
        
        if (data && !error) {
          console.log('✅ Material creado en Supabase')
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
    if (!confirm('Eliminar material?')) return
    
    try {
      // 🆕 ELIMINAR de Supabase
      const { deleteMaterial } = await import('../utils/supabaseMateriales')
      const { error } = await deleteMaterial(id)
      
      if (!error) {
        console.log('✅ Material eliminado de Supabase')
        await loadData() // Recargar desde Supabase
      } else {
        throw new Error('Supabase delete failed')
      }
    } catch (supabaseError) {
      console.warn('⚠️ Fallback a localStorage para eliminar')
      
      // Fallback: localStorage
      save(materiales.filter(m => m.id !== id))
    }
  }

  const formatCurrency = (v) => {
    const n = Number(v || 0)
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
  }

  return (
    <Layout>
  <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Materiales</h1>
            <p className={styles.subtitle}>Gestión de materiales: costos, tamaños, espesor y proveedores</p>
          </div>
          <div>
            <button className={styles.btnPrimary} onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: '', tipo: '', tamano: '', espesor: '', costoUnitario: '', proveedor: '', stock: '', unidad: 'cm', notas: '' }) }}>
              Nuevo material
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.list}>
            {materiales.length === 0 ? (
              <div className={styles.empty}>No hay materiales definidos</div>
            ) : (
              materiales.map(m => (
                <div key={m.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <strong className={styles.name}>{m.nombre}</strong>
                      <div className={styles.meta}>ID: {m.id} • {m.tipo} • {m.tamano} {m.unidad} • Espesor: {m.espesor}</div>
                    </div>
                    <div className={styles.actions}>
                      <button className={styles.btnSmall} onClick={() => handleEdit(m)}>Editar</button>
                      <button className={styles.btnSmallDanger} onClick={() => handleDelete(m.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <div>Proveedor: <strong>{m.proveedor || '—'}</strong></div>
                    <div>Stock: <strong>{m.stock || 0} {m.unidad}</strong></div>
                    <div>Costo unitario: <strong>{formatCurrency(m.costoUnitario)}</strong></div>
                    {m.notas && <div className={styles.notas}>Notas: {m.notas}</div>}
                  </div>
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
                        <button type="button" className={styles.btnPrimary} onClick={() => {
                          const v = (newTamano || '').trim()
                          if (!v) return
                          const next = Array.from(new Set([...(tamanos || []), v]))
                          setTamanos(next)
                          try { localStorage.setItem('tamanos', JSON.stringify(next)) } catch (err) { console.error('save tamanos', err) }
                          setForm(prev => ({ ...prev, tamano: v }))
                          setNewTamano('')
                          setShowNewTamano(false)
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
                        <button type="button" className={styles.btnPrimary} onClick={() => {
                          const v = (newEspesor || '').trim()
                          if (!v) return
                          const next = Array.from(new Set([...(espesores || []), v]))
                          setEspesores(next)
                          try { localStorage.setItem('espesores', JSON.stringify(next)) } catch (err) { console.error('save espesores', err) }
                          setForm(prev => ({ ...prev, espesor: v }))
                          setNewEspesor('')
                          setShowNewEspesor(false)
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
                        <button type="button" className={styles.btnPrimary} onClick={() => {
                          const v = (newProveedor || '').trim()
                          if (!v) return
                          const next = Array.from(new Set([...(proveedores || []), v]))
                          setProveedores(next)
                          try { localStorage.setItem('proveedores', JSON.stringify(next)) } catch (err) { console.error('save proveedores', err) }
                          setForm(prev => ({ ...prev, proveedor: v }))
                          setNewProveedor('')
                          setShowNewProveedor(false)
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
