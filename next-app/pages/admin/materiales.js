import { useState, useRef, useMemo, useCallback } from 'react'
import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import styles from '../../styles/materiales.module.css'
import { createToast } from '../../utils/catalogUtils'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, STALE_TIMES } from '../../lib/queryKeys'
import {
  useMateriales,
  useProveedores,
  useTamanos,
  useEspesores,
} from '../../hooks/useSupabaseQuery'
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createProveedor,
  createTamano,
  createEspesor,
} from '../../utils/supabaseMateriales'

const STORAGE_KEY = 'materiales'

// Safe localStorage set — handles QuotaExceededError gracefully
const safeSetItem = (key, value) => {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(key, value) } catch (err) {
    console.warn(`⚠️ localStorage setItem failed for "${key}":`, err.message)
  }
}

function Materiales() {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showNewProveedor, setShowNewProveedor] = useState(false)
  const [newProveedor, setNewProveedor] = useState('')
  const [showNewTamano, setShowNewTamano] = useState(false)
  const [newTamano, setNewTamano] = useState('')
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
  const queryClient = useQueryClient()

  // React Query: fetch data (client-only for SSR safety)
  const { data: materialesRaw = [], isLoading: loadingMateriales } = useMateriales()
  const { data: proveedoresRaw = [], isLoading: loadingProveedores } = useProveedores()
  const { data: tamanosRaw = [], isLoading: loadingTamanos } = useTamanos()
  const { data: espesoresRaw = [], isLoading: loadingEspesores } = useEspesores()

  // Map raw data to UI-friendly format
  const materiales = useMemo(() =>
    (materialesRaw || []).map(m => ({
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
    })), [materialesRaw])

  const proveedores = useMemo(() =>
    (proveedoresRaw || []).map(p => p.nombre), [proveedoresRaw])

  const tamanos = useMemo(() =>
    (tamanosRaw || []).map(t => t.valor), [tamanosRaw])

  const espesores = useMemo(() =>
    (espesoresRaw || []).map(e => e.valor), [espesoresRaw])

  const isLoading = loadingMateriales || loadingProveedores || loadingTamanos || loadingEspesores

  // Fallback to localStorage if React Query data is empty
  const [localMateriales, setLocalMateriales] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
      } catch { return [] }
    }
    return []
  })
  const [localProveedores, setLocalProveedores] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('proveedores')
        return raw ? JSON.parse(raw) : []
      } catch { return [] }
    }
    return []
  })
  const [localTamanos, setLocalTamanos] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('tamanos')
        return raw ? JSON.parse(raw) : []
      } catch { return [] }
    }
    return []
  })
  const [localEspesores, setLocalEspesores] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('espesores')
        return raw ? JSON.parse(raw) : []
      } catch { return [] }
    }
    return []
  })

  // Use Supabase data if available, otherwise fallback to localStorage
  const displayMateriales = materiales.length > 0 ? materiales : localMateriales
  const displayProveedores = proveedores.length > 0 ? proveedores : localProveedores
  const displayTamanos = tamanos.length > 0 ? tamanos : localTamanos
  const displayEspesores = espesores.length > 0 ? espesores : localEspesores

  // Mutations for materiales
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materiales.all })
  }

  const resetForm = (keepOpen = false) => {
    setForm({ nombre: '', tipo: '', tamano: '', espesor: '', costoUnitario: '', proveedor: '', stock: '', unidad: 'cm', notas: '' })
    setEditingId(null)
    setShowForm(keepOpen)
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    try {
      if (editingId) {
        const { data, error } = await updateMaterial(editingId, form)
        if (data && !error) {
          invalidateAll()
          resetForm(false)
          createToast('✅ Material actualizado correctamente', 'success')
        } else {
          throw new Error(error || 'Update failed')
        }
      } else {
        const { data, error } = await createMaterial(form)
        if (data && !error) {
          invalidateAll()
          resetForm(true)
          createToast('✅ Material creado correctamente', 'success')
          setTimeout(() => {
            try {
              nombreRef.current && nombreRef.current.focus()
              nombreRef.current && nombreRef.current.select()
            } catch (err) {}
          }, 50)
        } else {
          throw new Error(error || 'Create failed')
        }
      }
    } catch (supabaseError) {
      console.warn('⚠️ Fallback a localStorage:', supabaseError.message)

      // Fallback: localStorage
      const payload = { ...form, id: editingId || Date.now() }
      if (editingId) {
        setLocalMateriales(prev => {
          const next = prev.map(m => m.id === editingId ? payload : m)
          safeSetItem(STORAGE_KEY, JSON.stringify(next))
          return next
        })
        resetForm(false)
        createToast('✅ Material actualizado (local)', 'success')
      } else {
        setLocalMateriales(prev => {
          const next = [...prev, payload]
          safeSetItem(STORAGE_KEY, JSON.stringify(next))
          return next
        })
        resetForm(true)
        createToast('✅ Material creado (local)', 'success')
        setTimeout(() => {
          try {
            nombreRef.current && nombreRef.current.focus()
            nombreRef.current && nombreRef.current.select()
          } catch (err) {}
        }, 50)
      }
    }
  }

  const [confirmModal, setConfirmModal] = useState(null)

  const showConfirm = useCallback((title, message, onConfirm) => {
    setConfirmModal({ title, message, onConfirm })
  }, [])

  const handleEdit = (m) => {
    showConfirm(
      'Editar material',
      `¿Querés editar "${m.nombre}"?`,
      () => {
        setForm({ ...m })
        setEditingId(m.id)
        setShowForm(true)
      }
    )
  }

  const handleDelete = (id) => {
    const material = displayMateriales.find(m => m.id === id)
    const nombre = material ? material.nombre : 'este material'
    showConfirm(
      'Eliminar material',
      `¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        try {
          const { error } = await deleteMaterial(id)
          if (!error) {
            invalidateAll()
          } else {
            throw new Error(error)
          }
        } catch (supabaseError) {
          console.warn('⚠️ Fallback a localStorage para eliminar')
          setLocalMateriales(prev => {
            const next = prev.filter(m => m.id !== id)
            safeSetItem(STORAGE_KEY, JSON.stringify(next))
            return next
          })
        }
      }
    )
  }

  const formatCurrency = (v) => {
    const n = Number(v || 0)
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
  }

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
          <div>
            <button className={styles.btnPrimary} onClick={() => { setShowForm(true); setEditingId(null); setForm({ nombre: '', tipo: '', tamano: '', espesor: '', costoUnitario: '', proveedor: '', stock: '', unidad: 'cm', notas: '' }) }}>
              + Nuevo material
            </button>
          </div>
        </div>

        {!isLoading && displayMateriales.length > 0 && (
          <div className={styles.kpiStrip}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiIcon}>📦</span>
              <div>
                <div className={styles.kpiLabel}>Materiales</div>
                <div className={styles.kpiValue}>{displayMateriales.length}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiIcon}>🗂️</span>
              <div>
                <div className={styles.kpiLabel}>Tipos</div>
                <div className={styles.kpiValue}>{[...new Set(displayMateriales.filter(m => m.tipo).map(m => m.tipo))].length}</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiIcon}>⚠️</span>
              <div>
                <div className={styles.kpiLabel}>Sin stock</div>
                <div className={`${styles.kpiValue} ${displayMateriales.filter(m => !m.stock || Number(m.stock) <= 0).length > 0 ? styles.kpiAlert : ''}`}>
                  {displayMateriales.filter(m => !m.stock || Number(m.stock) <= 0).length}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.list}>
            {isLoading ? (
              <div className={styles.loading}>Cargando materiales…</div>
            ) : displayMateriales.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📦</div>
                <div className={styles.emptyText}>No hay materiales definidos</div>
                <div className={styles.emptyHint}>Usá el botón «+ Nuevo material» para agregar el primero</div>
              </div>
            ) : (
              displayMateriales.map(m => (
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
                      {form.tamano && !displayTamanos.includes(form.tamano) && <option value={form.tamano}>{form.tamano}</option>}
                      {displayTamanos.map((t, i) => <option key={i} value={t}>{t}</option>)}
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
                          
                          try {
                            const { data, error } = await createTamano(v)
                            
                            if (data && !error) {
                              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materiales.tamanos() })
                              setForm(prev => ({ ...prev, tamano: v }))
                              setNewTamano('')
                              setShowNewTamano(false)
                              return
                            } else {
                              throw new Error('Supabase failed')
                            }
                          } catch (supabaseError) {
                            console.warn('⚠️ Fallback a localStorage para tamaño')
                            
                            const next = Array.from(new Set([...(localTamanos || []), v]))
                            setLocalTamanos(next)
                            safeSetItem('tamanos', JSON.stringify(next))
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
                      {form.espesor && !displayEspesores.includes(form.espesor) && <option value={form.espesor}>{form.espesor}</option>}
                      {displayEspesores.map((t, i) => <option key={i} value={t}>{t}</option>)}
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
                          
                          try {
                            const { data, error } = await createEspesor(v)
                            
                            if (data && !error) {
                              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materiales.espesores() })
                              setForm(prev => ({ ...prev, espesor: v }))
                              setNewEspesor('')
                              setShowNewEspesor(false)
                              return
                            } else {
                              throw new Error('Supabase failed')
                            }
                          } catch (supabaseError) {
                            console.warn('⚠️ Fallback a localStorage para espesor')
                            
                            const next = Array.from(new Set([...(localEspesores || []), v]))
                            setLocalEspesores(next)
                            safeSetItem('espesores', JSON.stringify(next))
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
                      {displayProveedores.map((p, i) => <option key={i} value={p}>{p}</option>)}
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
                          
                          try {
                            const { data, error } = await createProveedor({ nombre: v })
                            
                            if (data && !error) {
                              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.materiales.proveedores() })
                              setForm(prev => ({ ...prev, proveedor: v }))
                              setNewProveedor('')
                              setShowNewProveedor(false)
                              return
                            } else {
                              throw new Error('Supabase failed')
                            }
                          } catch (supabaseError) {
                            console.warn('⚠️ Fallback a localStorage para proveedor')
                            
                            const next = Array.from(new Set([...(localProveedores || []), v]))
                            setLocalProveedores(next)
                            safeSetItem('proveedores', JSON.stringify(next))
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
                  <button type="button" className={styles.btnSecondary} onClick={() => resetForm(false)}>Cancelar</button>
                  <button type="submit" className={styles.btnPrimary}>{editingId ? 'Guardar cambios' : 'Crear'}</button>
                </div>
              </form>
            </aside>
          )}
        </div>
      </div>

      {confirmModal && (
        <div className={`${styles.confirmOverlay} ${darkMode ? styles.dark : ''}`} onClick={() => setConfirmModal(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <h4 className={styles.confirmTitle}>{confirmModal.title}</h4>
            <p className={styles.confirmMsg}>{confirmModal.message}</p>
            <div className={styles.confirmActions}>
              <button className={styles.btnSecondary} onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button
                className={styles.btnDanger}
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }}
              >Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default withAdminAuth(Materiales)
