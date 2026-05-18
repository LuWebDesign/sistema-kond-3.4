// next-app/pages/admin/website/categorias/index.js
// Manage category order and visibility on the storefront home page.

import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../../../../components/Layout'
import withAdminAuth from '../../../../components/withAdminAuth'
import ConfirmDialog from '../../../../components/ConfirmDialog'

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
    const list = json.data || json.categorias || (Array.isArray(json) ? json : [])
    return list.filter((c) => !c.parent_id)
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

// ─── Category Order Component ────────────────────────────────────────────────

function CategoryOrderList({ config, categories, onSave, saving }) {
  const [order, setOrder] = useState([])
  const [hidden, setHidden] = useState(new Set())
  const [dropTarget, setDropTarget] = useState(null)
  const [pendingToggle, setPendingToggle] = useState(null)
  const dragIndex = useRef(null)

  useEffect(() => {
    const savedOrder = config.categoryOrder || []
    const savedHidden = new Set(config.hiddenCategories || [])
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

  const handleDragStart = (i) => { dragIndex.current = i }
  const handleDragOver = (e, i) => { e.preventDefault(); if (dropTarget !== i) setDropTarget(i) }
  const handleDrop = (i) => {
    setDropTarget(null)
    if (dragIndex.current === null || dragIndex.current === i) { dragIndex.current = null; return }
    const next = [...order]
    const [removed] = next.splice(dragIndex.current, 1)
    next.splice(i, 0, removed)
    setOrder(next)
    dragIndex.current = null
  }
  const handleDragEnd = () => { dragIndex.current = null; setDropTarget(null) }

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
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', userSelect: 'none' }}>⠿</span>
                <span style={{ minWidth: 24, fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {isHidden ? '—' : `#${order.filter((oid) => !hidden.has(oid)).indexOf(id) + 1}`}
                </span>
                <span style={{ flex: 1, fontWeight: 500 }}>{cat.nombre}</span>
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
                <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...btnSecondary, padding: '4px 10px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => move(i, 1)} disabled={i === order.length - 1} style={{ ...btnSecondary, padding: '4px 10px', opacity: i === order.length - 1 ? 0.3 : 1 }}>↓</button>
              </div>
            </div>
          )
        })}
      </div>

      <button onClick={handleSave} disabled={saving} style={btnPrimary}>
        {saving ? 'Guardando...' : '💾 Guardar orden'}
      </button>

      <ConfirmDialog
        open={!!pendingToggle}
        onClose={() => setPendingToggle(null)}
        onConfirm={() => {
          if (pendingToggle) toggleHidden(pendingToggle)
          setPendingToggle(null)
        }}
        title={pendingToggle && hidden.has(pendingToggle) ? 'Mostrar categoría' : 'Ocultar categoría'}
        message={pendingToggle ? `¿Confirmar cambio de visibilidad para "${catById[pendingToggle]?.nombre}"?` : ''}
        confirmText="Confirmar"
        cancelText="Cancelar"
        type="info"
      />
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function CategoriasPage() {
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
      .catch((e) => showToast(e.message || 'Error al cargar datos', 'error'))
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

  const handleSaveConfigWithConfirm = useCallback((next) => {
    setConfirm({
      title: 'Guardar cambios',
      message: '¿Confirmar los cambios?',
      onConfirm: () => { setConfirm(null); handleSaveConfig(next) },
    })
  }, [handleSaveConfig])

  return (
    <Layout title="Categorías — Website | Sistema KOND">
      <div style={{ padding: '24px', maxWidth: '900px' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🖥️ Website</h1>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'var(--accent-green)', color: '#fff' }}>Categorías</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Ordená y controlá la visibilidad de las categorías en la página de inicio.
          </p>
        </div>

        {toast && (
          <div style={{
            marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
            background: toast.type === 'error' ? 'var(--accent-red)22' : 'var(--accent-green)22',
            color: toast.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)',
            border: `1px solid ${toast.type === 'error' ? 'var(--accent-red)44' : 'var(--accent-green)44'}`,
            fontSize: '0.9rem', fontWeight: 500,
          }}>{toast.msg}</div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : (
          <div style={card}>
            <h2 style={sectionTitle}>📂 Orden de Categorías</h2>
            <CategoryOrderList
              config={config}
              categories={categories}
              onSave={handleSaveConfigWithConfirm}
              saving={saving}
            />
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/admin/website" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>← Volver a Website</a>
        </div>
      </div>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={confirm?.onConfirm} title={confirm?.title} message={confirm?.message} confirmText="Guardar" cancelText="Cancelar" type="info" />
    </Layout>
  )
}

export default withAdminAuth(CategoriasPage)
