// next-app/pages/admin/website/index.js
// Website → Home admin page.
// Controls: category order, featured products, announcement bar, sections.

import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../../../components/Layout'
import withAdminAuth from '../../../components/withAdminAuth'
import ConfirmDialog from '../../../components/ConfirmDialog'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_CONFIG = { bannerMessages: [], categoryOrder: [], hiddenCategories: [], sections: [] }

async function fetchConfig() {
  try {
    const res = await fetch('/api/admin/home-config')
    if (!res.ok) return EMPTY_CONFIG
    const { config } = await res.json()
    return config || EMPTY_CONFIG
  } catch {
    return EMPTY_CONFIG
  }
}

async function saveConfig(config) {
  const res = await fetch('/api/admin/home-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || 'Error al guardar')
  }
}

async function fetchCategories() {
  try {
    const res = await fetch('/api/categorias')
    if (!res.ok) return []
    const json = await res.json()
    // API returns { data: [...] }
    const list = json.data || json.categorias || (Array.isArray(json) ? json : [])
    return list.filter((c) => !c.parent_id) // top-level only
  } catch {
    return []
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
}

const sectionTitle = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: '4px',
}

const sectionSubtitle = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)',
  marginBottom: '20px',
}

const btnPrimary = {
  padding: '9px 20px',
  borderRadius: '8px',
  background: 'var(--accent-blue)',
  color: '#fff',
  border: 'none',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
}

const btnSecondary = {
  padding: '9px 20px',
  borderRadius: '8px',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border-color)',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
}

const badge = (active) => ({
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: '20px',
  fontSize: '0.75rem',
  fontWeight: 600,
  background: active ? 'var(--accent-green)22' : 'var(--bg-secondary)',
  color: active ? 'var(--accent-green)' : 'var(--text-muted)',
  border: `1px solid ${active ? 'var(--accent-green)44' : 'var(--border-color)'}`,
})

// ─── Section type constants ───────────────────────────────────────────────────

const SECTION_TYPES = [
  { value: 'featured',           label: 'Productos Destacados' },
  { value: 'categories',         label: 'Categorías' },
  { value: 'promos',             label: 'En Promoción' },
  { value: 'categoria_carousel', label: 'Carrusel por Categoría' },
]

// ─── Drop indicator line ──────────────────────────────────────────────────────
function DropLine() {
  return (
    <div style={{
      height: '2px',
      background: 'var(--accent-blue)',
      borderRadius: '2px',
      margin: '0 4px 4px',
      boxShadow: '0 0 8px var(--accent-blue)',
    }} />
  )
}

// ─── Tab components ───────────────────────────────────────────────────────────

// Inline form for creating/editing a section
function SectionForm({ initial, categories, onSave, onCancel }) {
  const [label, setLabel] = useState(initial?.label || '')
  const [type, setType] = useState(initial?.type || 'featured')
  const [categoryId, setCategoryId] = useState(initial?.config?.categoryId || '')

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }

  const handleSubmit = () => {
    if (!label.trim()) return
    const config = type === 'categoria_carousel' && categoryId ? { categoryId: Number(categoryId) } : {}
    onSave({ label: label.trim(), type, config })
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-blue)66', borderRadius: '8px', padding: '16px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: '180px' }}>
          <label style={labelStyle}>Nombre</label>
          <input style={inputStyle} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: Novedades" />
        </div>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <label style={labelStyle}>Tipo</label>
          <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
            {SECTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {type === 'categoria_carousel' && (
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={labelStyle}>Categoría</label>
            <select style={inputStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">— elegir —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button onClick={handleSubmit} style={{ ...btnPrimary, padding: '7px 16px', fontSize: '0.85rem' }}>
          Guardar
        </button>
        <button onClick={onCancel} style={{ ...btnSecondary, padding: '7px 16px', fontSize: '0.85rem' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// Tab 1: Category order + visibility
function CategoryOrderTab({ config, categories, onSave, saving }) {
  const [order, setOrder] = useState([])
  const [hidden, setHidden] = useState(new Set())
  const [dropTarget, setDropTarget] = useState(null)
  const [pendingToggle, setPendingToggle] = useState(null)
  const dragIndex = useRef(null)

  useEffect(() => {
    const savedOrder = config.categoryOrder || []
    const savedHidden = new Set(config.hiddenCategories || [])

    // Merge: ordered first, then remaining categories not in savedOrder
    const allIds = categories.map((c) => c.id)
    const merged = [
      ...savedOrder.filter((id) => allIds.includes(id)),
      ...allIds.filter((id) => !savedOrder.includes(id)),
    ]
    setOrder(merged)
    setHidden(savedHidden)
  }, [config, categories])

  const move = (index, dir) => {
    const next = [...order]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
  }

  const toggleHidden = (id) => {
    setHidden((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const requestToggleHidden = (id) => setPendingToggle(id)

  const handleSave = () => {
    onSave({
      ...config,
      categoryOrder: order,
      hiddenCategories: [...hidden],
    })
  }

  // Drag & drop handlers
  const handleDragStart = (i) => {
    dragIndex.current = i
  }

  const handleDragOver = (e, i) => {
    e.preventDefault()
    if (dropTarget !== i) setDropTarget(i)
  }

  const handleDrop = (i) => {
    setDropTarget(null)
    if (dragIndex.current === null || dragIndex.current === i) {
      dragIndex.current = null
      return
    }
    const next = [...order]
    const [removed] = next.splice(dragIndex.current, 1)
    next.splice(i, 0, removed)
    setOrder(next)
    dragIndex.current = null
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    setDropTarget(null)
  }

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]))
  const isDraggingId = dragIndex.current !== null ? order[dragIndex.current] : null

  return (
    <div>
      <p style={sectionSubtitle}>
        Arrastrá (o usá las flechas) para cambiar el orden. Desactivá una categoría para ocultarla en la home.
      </p>

      {order.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay categorías publicadas.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
        {order.map((id, i) => {
          const cat = catById[id]
          if (!cat) return null
          const isHidden = hidden.has(id)
          const isDragging = isDraggingId === id
          const isDropTarget = dropTarget === i && !isDragging

          return (
            <div key={id}>
              {/* Blue insert line above target row */}
              {isDropTarget && <DropLine />}

              <div
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: isDragging ? 'var(--accent-blue)11' : 'var(--bg-secondary)',
                  border: `1px solid ${isDragging ? 'var(--accent-blue)66' : 'var(--border-color)'}`,
                  opacity: isDragging ? 0.5 : isHidden ? 0.55 : 1,
                  transition: 'opacity 0.15s, border 0.15s, background 0.15s',
                  cursor: 'grab',
                  marginBottom: '8px',
                }}
              >
                {/* Drag handle indicator */}
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', userSelect: 'none' }}>⠿</span>

                {/* Position number */}
                <span style={{ minWidth: 24, fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {isHidden ? '—' : `#${order.filter((oid) => !hidden.has(oid)).indexOf(id) + 1}`}
                </span>

                {/* Category name */}
                <span style={{ flex: 1, fontWeight: 500 }}>{cat.nombre}</span>

                {/* Visibility toggle */}
                <button
                  onClick={() => requestToggleHidden(id)}
                  title={isHidden ? 'Mostrar en home' : 'Ocultar de home'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '4px',
                    color: isHidden ? 'var(--text-muted)' : 'var(--accent-green)',
                  }}
                >
                  {isHidden ? '👁‍🗨' : '👁'}
                </button>

                {/* Move up */}
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  style={{ ...btnSecondary, padding: '4px 10px', opacity: i === 0 ? 0.3 : 1 }}
                >
                  ↑
                </button>
                {/* Move down */}
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  style={{ ...btnSecondary, padding: '4px 10px', opacity: i === order.length - 1 ? 0.3 : 1 }}
                >
                  ↓
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={handleSave} disabled={saving} style={btnPrimary}>
        {saving ? 'Guardando...' : '💾 Guardar orden'}
      </button>

      {/* Confirm visibility toggle */}
      <ConfirmDialog
        open={!!pendingToggle}
        onClose={() => setPendingToggle(null)}
        onConfirm={() => {
          if (pendingToggle) toggleHidden(pendingToggle)
          setPendingToggle(null)
        }}
        title={pendingToggle && hidden.has(pendingToggle) ? 'Mostrar categoría' : 'Ocultar categoría'}
        message={pendingToggle
          ? `¿Confirmar cambio de visibilidad para "${catById[pendingToggle]?.nombre}"?`
          : ''}
        confirmText="Confirmar"
        cancelText="Cancelar"
        type="info"
      />
    </div>
  )
}

// Tab 3: Announcement bar
function BannerTab({ config, onSave, saving }) {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    setMessages(config.bannerMessages || [])
  }, [config])

  const update = (i, val) => {
    const next = [...messages]
    next[i] = val
    setMessages(next)
  }

  const add = () => setMessages([...messages, ''])
  const remove = (i) => setMessages(messages.filter((_, idx) => idx !== i))
  const move = (i, dir) => {
    const next = [...messages]
    const t = i + dir
    if (t < 0 || t >= next.length) return
    ;[next[i], next[t]] = [next[t], next[i]]
    setMessages(next)
  }

  const handleSave = () => {
    onSave({ ...config, bannerMessages: messages.filter((m) => m.trim()) })
  }

  return (
    <div>
      <p style={sectionSubtitle}>
        Mensajes del banner de anuncios (barra superior deslizante). Uno por línea.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={msg}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Mensaje ${i + 1}`}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...btnSecondary, padding: '7px 10px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === messages.length - 1} style={{ ...btnSecondary, padding: '7px 10px', opacity: i === messages.length - 1 ? 0.3 : 1 }}>↓</button>
            <button onClick={() => remove(i)} style={{ ...btnSecondary, padding: '7px 10px', color: 'var(--accent-red)', borderColor: 'var(--accent-red)44' }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button onClick={add} style={btnSecondary}>+ Agregar mensaje</button>
        <button onClick={handleSave} disabled={saving} style={btnPrimary}>
          {saving ? 'Guardando...' : '💾 Guardar mensajes'}
        </button>
      </div>
    </div>
  )
}

// Tab 4: Sections
function SectionsTab({ config, categories, onSave, saving }) {
  const [sections, setSections] = useState([])
  const [dropTarget, setDropTarget] = useState(null)
  const [pendingToggle, setPendingToggle] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const dragIndex = useRef(null)

  useEffect(() => {
    const LEGACY_TYPE_MAP = { featured: 'featured', categories: 'categories', promo: 'promos' }
    const saved = config.sections || []

    if (saved.length > 0) {
      // Trust saved config as-is — only normalize missing type fields
      const normalized = saved
        .map((s) => ({ ...s, type: s.type || LEGACY_TYPE_MAP[s.id] || 'featured' }))
        .sort((a, b) => a.order - b.order)
      setSections(normalized)
    } else {
      // No saved config yet — seed with defaults
      setSections([
        { id: 'featured',   label: 'Productos Destacados', type: 'featured',   enabled: true,  order: 1 },
        { id: 'categories', label: 'Categorías',           type: 'categories', enabled: true,  order: 2 },
        { id: 'promo',      label: 'En Promoción',         type: 'promos',     enabled: false, order: 3 },
      ])
    }
  }, [config])

  const applyToggle = (id) => {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  const requestToggle = (id) => setPendingToggle(id)

  const move = (index, dir) => {
    const next = [...sections]
    const t = index + dir
    if (t < 0 || t >= next.length) return
    ;[next[index], next[t]] = [next[t], next[index]]
    setSections(next.map((s, i) => ({ ...s, order: i + 1 })))
  }

  // Drag & drop handlers
  const handleDragStart = (i) => {
    dragIndex.current = i
  }

  const handleDragOver = (e, i) => {
    e.preventDefault()
    if (dropTarget !== i) setDropTarget(i)
  }

  const handleDrop = (i) => {
    setDropTarget(null)
    if (dragIndex.current === null || dragIndex.current === i) {
      dragIndex.current = null
      return
    }
    const next = [...sections]
    const [removed] = next.splice(dragIndex.current, 1)
    next.splice(i, 0, removed)
    setSections(next.map((s, idx) => ({ ...s, order: idx + 1 })))
    dragIndex.current = null
  }

  const handleDragEnd = () => {
    dragIndex.current = null
    setDropTarget(null)
  }

  const handleSave = () => {
    onSave({ ...config, sections })
  }

  const handleAddSection = (formVals) => {
    const id = `custom_${Date.now()}`
    const newSection = {
      id,
      label: formVals.label,
      type: formVals.type,
      enabled: true,
      order: sections.length + 1,
      ...(formVals.config && Object.keys(formVals.config).length ? { config: formVals.config } : {}),
    }
    setSections((prev) => [...prev, newSection].map((s, i) => ({ ...s, order: i + 1 })))
    setEditingId(null)
  }

  const handleEditSection = (id, formVals) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              label: formVals.label,
              type: formVals.type,
              ...(formVals.config && Object.keys(formVals.config).length
                ? { config: formVals.config }
                : { config: undefined }),
            }
          : s
      )
    )
    setEditingId(null)
  }

  const handleDeleteSection = (id) => {
    setSections((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })))
    setPendingDelete(null)
  }

  const isDraggingId = dragIndex.current !== null ? sections[dragIndex.current]?.id : null

  return (
    <div>
      <p style={sectionSubtitle}>
        Activá, desactivá y reordenará las secciones de la home.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
        {sections.map((s, i) => {
          const isDragging = isDraggingId === s.id
          const isDropTarget = dropTarget === i && !isDragging

          if (editingId === s.id) {
            return (
              <div key={s.id}>
                {isDropTarget && <DropLine />}
                <SectionForm
                  initial={s}
                  categories={categories || []}
                  onSave={(formVals) => handleEditSection(s.id, formVals)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )
          }

          return (
            <div key={s.id}>
              {/* Blue insert line above target row */}
              {isDropTarget && <DropLine />}

              <div
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: isDragging
                    ? 'var(--accent-blue)11'
                    : s.enabled ? 'var(--accent-green)08' : 'var(--bg-secondary)',
                  border: `1px solid ${isDragging
                    ? 'var(--accent-blue)66'
                    : s.enabled ? 'var(--accent-green)33' : 'var(--border-color)'}`,
                  transition: 'all 0.15s',
                  opacity: isDragging ? 0.5 : 1,
                  cursor: 'grab',
                  marginBottom: '8px',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', userSelect: 'none' }}>⠿</span>
                <span style={{ minWidth: 20, fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 600 }}>{s.label}</span>
                <span style={badge(s.enabled)}>{s.enabled ? 'Activa' : 'Inactiva'}</span>

                <button
                  onClick={() => requestToggle(s.id)}
                  style={{ ...btnSecondary, padding: '6px 14px', fontSize: '0.85rem' }}
                >
                  {s.enabled ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...btnSecondary, padding: '6px 10px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} style={{ ...btnSecondary, padding: '6px 10px', opacity: i === sections.length - 1 ? 0.3 : 1 }}>↓</button>
                <button
                  onClick={() => setEditingId(s.id)}
                  title="Editar"
                  style={{ ...btnSecondary, padding: '6px 10px', fontSize: '0.85rem' }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => setPendingDelete(s.id)}
                  title="Eliminar"
                  style={{ ...btnSecondary, padding: '6px 10px', fontSize: '0.85rem', color: 'var(--accent-red, #ef4444)' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {editingId === 'new'
        ? (
          <SectionForm
            initial={null}
            categories={categories || []}
            onSave={handleAddSection}
            onCancel={() => setEditingId(null)}
          />
        )
        : (
          <button
            onClick={() => setEditingId('new')}
            style={{ ...btnSecondary, marginBottom: '16px' }}
          >
            + Nueva sección
          </button>
        )
      }

      <button onClick={handleSave} disabled={saving} style={btnPrimary}>
        {saving ? 'Guardando...' : '💾 Guardar secciones'}
      </button>

      {/* Confirm section toggle */}
      {pendingToggle && (() => {
        const sec = sections.find((s) => s.id === pendingToggle)
        return (
          <ConfirmDialog
            open={true}
            onClose={() => setPendingToggle(null)}
            onConfirm={() => {
              applyToggle(pendingToggle)
              setPendingToggle(null)
            }}
            title={sec?.enabled ? 'Desactivar sección' : 'Activar sección'}
            message={`¿Confirmar cambio para la sección "${sec?.label}"?`}
            confirmText="Confirmar"
            cancelText="Cancelar"
            type="info"
          />
        )
      })()}

      {/* Confirm section delete */}
      {pendingDelete && (() => {
        const sec = sections.find((s) => s.id === pendingDelete)
        return (
          <ConfirmDialog
            open={true}
            onClose={() => setPendingDelete(null)}
            onConfirm={() => handleDeleteSection(pendingDelete)}
            title="Eliminar sección"
            message={`¿Eliminar la sección "${sec?.label}"? Esta acción no se puede deshacer.`}
            confirmText="Eliminar"
            cancelText="Cancelar"
            type="danger"
          />
        )
      })()}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'categories', label: '📂 Categorías' },
  { id: 'banner',     label: '📢 Banner' },
  { id: 'sections',   label: '🧩 Secciones' },
]

function WebsitePage() {
  const [activeTab, setActiveTab] = useState('categories')
  const [config, setConfig] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    Promise.all([fetchConfig(), fetchCategories()])
      .then(([cfg, cats]) => {
        setConfig(cfg)
        setCategories(cats)
      })
      .catch((e) => {
        showToast(e.message || 'Error al cargar datos', 'error')
        // Ensure config is never null so tab components don't crash
        setConfig(EMPTY_CONFIG)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSaveConfig = useCallback(async (next) => {
    setSaving(true)
    try {
      await saveConfig(next)
      setConfig(next)
      showToast('✅ Guardado correctamente')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [])

  // Wrapped version that shows confirm dialog before saving
  const handleSaveConfigWithConfirm = useCallback((next) => {
    setConfirm({
      title: 'Guardar cambios',
      message: '¿Confirmar los cambios?',
      onConfirm: () => {
        setConfirm(null)
        handleSaveConfig(next)
      },
    })
  }, [handleSaveConfig])

  return (
    <Layout title="Website — Home | Sistema KOND">
      <div style={{ padding: '24px', maxWidth: '900px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🖥️ Website</h1>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px',
              borderRadius: '4px', background: 'var(--accent-green)', color: '#fff',
            }}>Home</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Controlá el contenido y la estructura de la página de inicio pública.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: toast.type === 'error' ? 'var(--accent-red)22' : 'var(--accent-green)22',
            color: toast.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)',
            border: `1px solid ${toast.type === 'error' ? 'var(--accent-red)44' : 'var(--accent-green)44'}`,
            fontSize: '0.9rem',
            fontWeight: 500,
          }}>
            {toast.msg}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Cargando configuración...
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'var(--bg-secondary)',
              borderRadius: '10px',
              padding: '4px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: activeTab === t.id ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: activeTab === t.id ? 'var(--shadow)' : 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={card}>
              <h2 style={sectionTitle}>{TABS.find((t) => t.id === activeTab)?.label}</h2>

              {activeTab === 'categories' && (
                <CategoryOrderTab
                  config={config}
                  categories={categories}
                  onSave={handleSaveConfigWithConfirm}
                  saving={saving}
                />
              )}

              {activeTab === 'banner' && (
                <BannerTab
                  config={config}
                  onSave={handleSaveConfigWithConfirm}
                  saving={saving}
                />
              )}

              {activeTab === 'sections' && (
                <SectionsTab
                  config={config}
                  categories={categories}
                  onSave={handleSaveConfigWithConfirm}
                  saving={saving}
                />
              )}
            </div>

            {/* Quick link to featured products page */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a
                href="/admin/website/destacados"
                style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
              >
                ⭐ Gestionar Productos Destacados →
              </a>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmText="Guardar"
        cancelText="Cancelar"
        type="info"
      />
    </Layout>
  )
}

export default withAdminAuth(WebsitePage)
