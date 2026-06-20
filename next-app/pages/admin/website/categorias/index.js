// next-app/pages/admin/website/categorias/index.js
// Manage category order, visibility, and per-category product curation on the storefront home page.

import { useState, useEffect, useCallback, useRef } from 'react'
import Layout from '../../../../components/Layout'
import withAdminAuth from '../../../../components/withAdminAuth'
import ConfirmDialog from '../../../../components/ConfirmDialog'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_CONFIG = {
  bannerMessages: [],
  categoryOrder: [],
  hiddenCategories: [],
  sections: [],
  categoryProducts: {},
}

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

// ─── Product Curation Panel ───────────────────────────────────────────────────

function ProductCurationPanel({ catId, products, categoryProductsConfig, onSave, onCancel }) {
  const savedConfig = categoryProductsConfig?.[String(catId)] || {}
  const allProductIds = (products || []).map((p) => p.id)

  const getInitialOrder = () => {
    const savedOrder = savedConfig.productOrder || []
    return [
      ...savedOrder.filter((id) => allProductIds.includes(id)),
      ...allProductIds.filter((id) => !savedOrder.includes(id)),
    ]
  }

  const [order, setOrder] = useState(getInitialOrder)
  const [hidden, setHidden] = useState(() => new Set(savedConfig.hiddenProducts || []))
  const [dropTarget, setDropTarget] = useState(null)
  const dragIndex = useRef(null)

  const productById = Object.fromEntries((products || []).map((p) => [p.id, p]))

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

  const toggleHidden = (id) => {
    setHidden((prev) => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const handleSave = () => {
    onSave(catId, { hiddenProducts: [...hidden], productOrder: [...order] })
    onCancel() // collapse panel when save is initiated
  }

  const handleCancel = () => {
    setOrder(getInitialOrder())
    setHidden(new Set(savedConfig.hiddenProducts || []))
    onCancel()
  }

  const isDraggingId = dragIndex.current !== null ? order[dragIndex.current] : null

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--accent-blue)33',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '8px',
      marginLeft: '24px',
    }}>
      {order.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 12px' }}>
          No hay productos en esta categoría.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
        {order.map((id, i) => {
          const product = productById[id]
          if (!product) return null
          const isHidden = hidden.has(id)
          const isDragging = isDraggingId === id
          const isDropTarget = dropTarget === i && !isDragging
          const thumbUrl = product.imagenes_urls?.[0] || null

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
                  gap: '10px',
                  background: isDragging ? 'var(--accent-blue)11' : 'var(--bg-secondary)',
                  border: `1px solid ${isDragging ? 'var(--accent-blue)66' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  opacity: isDragging ? 0.5 : isHidden ? 0.55 : 1,
                  cursor: 'grab',
                  transition: 'opacity 0.15s, border 0.15s, background 0.15s',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', userSelect: 'none', flexShrink: 0 }}>⠿</span>
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={product.nombre}
                    style={{ width: 40, height: 40, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 40, height: 40, borderRadius: '6px',
                    background: 'var(--bg-secondary)', flexShrink: 0,
                    border: '1px solid var(--border-color)',
                  }} />
                )}
                <span style={{
                  flex: 1,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: isHidden ? 'var(--text-secondary)' : 'var(--text-primary)',
                }}>
                  {product.nombre}
                </span>
                <button
                  onClick={() => toggleHidden(id)}
                  title={isHidden ? 'Mostrar en home' : 'Ocultar de home'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    padding: '4px',
                    color: isHidden ? 'var(--text-muted)' : 'var(--accent-green)',
                    flexShrink: 0,
                  }}
                >
                  {isHidden ? '👁‍🗨' : '👁'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSave} style={{ ...btnPrimary, fontSize: '0.85rem', padding: '7px 14px' }}>
          💾 Guardar productos
        </button>
        <button onClick={handleCancel} style={{ ...btnSecondary, fontSize: '0.85rem', padding: '7px 14px' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Category Order Component ────────────────────────────────────────────────

function CategoryOrderList({ config, categories, onSave, saving, byCategoryData, categoryProductsConfig, onSaveCategoryProducts }) {
  const [order, setOrder] = useState([])
  const [hidden, setHidden] = useState(new Set())
  const [dropTarget, setDropTarget] = useState(null)
  const [pendingToggle, setPendingToggle] = useState(null)
  const [expandedCategoryId, setExpandedCategoryId] = useState(null)
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
        Cada categoría activada aparece como una sección independiente en la home, una debajo de la otra. Arrastrá o usá las flechas para definir el orden.
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
          const categoryProducts = byCategoryData?.[id] || []
          const isExpanded = expandedCategoryId === id

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
                  border: `1px solid ${isDragging ? 'var(--accent-blue)66' : (isExpanded ? 'var(--accent-blue)66' : 'var(--border-color)')}`,
                  opacity: isDragging ? 0.5 : isHidden ? 0.55 : 1,
                  transition: 'opacity 0.15s, border 0.15s, background 0.15s',
                  cursor: 'grab',
                  marginBottom: isExpanded ? '0' : '8px',
                  borderBottomLeftRadius: isExpanded ? '0' : '8px',
                  borderBottomRightRadius: isExpanded ? '0' : '8px',
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontSize: '1rem', userSelect: 'none' }}>⠿</span>
                <span style={{ minWidth: 24, fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {isHidden ? '—' : `#${order.filter((oid) => !hidden.has(oid)).indexOf(id) + 1}`}
                </span>
                <span style={{ flex: 1, fontWeight: 500 }}>{cat.nombre}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedCategoryId(isExpanded ? null : id) }}
                  title={isExpanded ? 'Cerrar productos' : 'Ver y ordenar productos'}
                  style={{
                    ...btnSecondary,
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    background: isExpanded ? 'var(--accent-blue)22' : 'var(--bg-secondary)',
                    borderColor: isExpanded ? 'var(--accent-blue)66' : 'var(--border-color)',
                    color: isExpanded ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isExpanded ? '▲' : '▼'}
                  <span>{categoryProducts.length} productos</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); requestToggleHidden(id) }}
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
                <button onClick={(e) => { e.stopPropagation(); move(i, -1) }} disabled={i === 0} style={{ ...btnSecondary, padding: '4px 10px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={(e) => { e.stopPropagation(); move(i, 1) }} disabled={i === order.length - 1} style={{ ...btnSecondary, padding: '4px 10px', opacity: i === order.length - 1 ? 0.3 : 1 }}>↓</button>
              </div>
              {isExpanded && (
                <div style={{ marginBottom: '8px' }}>
                  <ProductCurationPanel
                    catId={id}
                    products={categoryProducts}
                    categoryProductsConfig={categoryProductsConfig}
                    onSave={onSaveCategoryProducts}
                    onCancel={() => setExpandedCategoryId(null)}
                  />
                </div>
              )}
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
  const [byCategoryData, setByCategoryData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    Promise.all([
      fetchConfig(),
      fetchCategories(),
      fetch('/api/home-data').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([cfg, cats, homeData]) => {
        setConfig(cfg)
        setCategories(cats)
        setByCategoryData(homeData.byCategory || {})
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

  const handleSaveCategoryProducts = useCallback((catId, productConfig) => {
    if (!config) return
    handleSaveConfigWithConfirm({
      ...config,
      categoryProducts: {
        ...(config.categoryProducts || {}),
        [String(catId)]: productConfig,
      },
    })
  }, [config, handleSaveConfigWithConfirm])

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
              byCategoryData={byCategoryData}
              categoryProductsConfig={config?.categoryProducts || {}}
              onSaveCategoryProducts={handleSaveCategoryProducts}
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
