// next-app/pages/admin/website/destacados/index.js
// Manage featured products for the storefront home page.
// Products marked as featured appear in the Hero section of the home.
// Uses batch edit: select/deselect locally, then save all at once.

import { useState, useEffect, useCallback, useMemo } from 'react'
import Layout from '../../../../components/Layout'
import withAdminAuth from '../../../../components/withAdminAuth'
import ConfirmDialog from '../../../../components/ConfirmDialog'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

async function fetchPublishedProducts() {
  const res = await fetch('/api/home-data')
  if (!res.ok) return []
  const json = await res.json()
  const featured = json.featured || []
  const featuredIds = new Set(featured.map((p) => p.id))
  const byCategory = json.byCategory || {}
  const allFromCategories = Object.values(byCategory).flat()
  const seen = new Set()
  const all = []
  for (const p of [...featured, ...allFromCategories]) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    all.push({ ...p, featured: featuredIds.has(p.id) })
  }
  return all
}

async function bulkUpdateFeatured(updates) {
  // updates: [{ id, featured }, ...]
  const results = await Promise.allSettled(
    updates.map(({ id, featured }) =>
      fetch(`/api/admin/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured }),
      }).then((r) => {
        if (!r.ok) throw new Error(`Error updating product ${id}`)
        return { id, featured }
      })
    )
  )
  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) throw new Error(`${failed.length} producto(s) no se pudieron actualizar`)
  return results.map((r) => r.value)
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

// ─── Pagination ──────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages, start + maxVisible - 1)
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '16px' }}>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        style={{ ...btnSecondary, padding: '6px 12px', opacity: page === 1 ? 0.3 : 1 }}
      >
        ←
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} style={{ ...btnSecondary, padding: '6px 12px' }}>1</button>
          {start > 2 && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: p === page ? 'var(--accent-blue)' : 'var(--bg-secondary)',
            color: p === page ? '#fff' : 'var(--text-primary)',
          }}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>}
          <button onClick={() => onPageChange(totalPages)} style={{ ...btnSecondary, padding: '6px 12px' }}>{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        style={{ ...btnSecondary, padding: '6px 12px', opacity: page === totalPages ? 0.3 : 1 }}
      >
        →
      </button>
    </div>
  )
}

// ─── Featured Products List ──────────────────────────────────────────────────

function FeaturedProductsList({ products, pending, onToggle, search, onSearchChange, page, onPageChange }) {
  const featuredCount = products.filter((p) => p.featured).length
  const filtered = products.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.id?.toString().includes(search)
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE
  const paged = filtered.slice(start, start + PAGE_SIZE)

  return (
    <div>
      <p style={sectionSubtitle}>
        Seleccioná los productos que querés destacar y guardá los cambios al final.
      </p>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={badge(true)}>{featuredCount} destacados</span>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => { onSearchChange(e.target.value); onPageChange(1) }}
          style={{
            flex: 1,
            minWidth: 200,
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {paged.map((p) => {
          const isPending = pending.has(p.id)
          const currentFeatured = p.featured
          return (
            <label
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: currentFeatured ? 'var(--accent-blue)11' : 'var(--bg-secondary)',
                border: `1px solid ${isPending ? 'var(--accent-blue)' : currentFeatured ? 'var(--accent-blue)44' : 'var(--border-color)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={!!currentFeatured}
                onChange={() => onToggle(p.id)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              {p.imagenes_urls?.[0] ? (
                <img
                  src={p.imagenes_urls[0]}
                  alt=""
                  style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '6px', background: 'var(--bg-card)', flexShrink: 0 }} />
              )}
              <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>{p.nombre}</span>
              {currentFeatured && <span style={badge(true)}>Destacado</span>}
              {isPending && <span style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 600 }}>pendiente</span>}
            </label>
          )
        })}
        {filtered.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sin resultados.</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function FeaturedProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  // pending: Set of product IDs whose featured state has been changed locally but not saved
  const [pending, setPending] = useState(new Set())

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchPublishedProducts()
      .then((prods) => setProducts(prods))
      .catch((e) => showToast(e.message || 'Error al cargar productos', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = useCallback((id) => {
    setProducts((prev) =>
      prev.map((p) => p.id === id ? { ...p, featured: !p.featured } : p)
    )
    setPending((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const changesCount = pending.size

  const handleSave = useCallback(() => {
    if (changesCount === 0) return
    setConfirm({
      title: 'Guardar cambios',
      message: `Se actualizarán ${changesCount} producto(s). ¿Confirmar?`,
      onConfirm: async () => {
        setConfirm(null)
        setSaving(true)
        try {
          // Build updates from current product state
          const updates = products
            .filter((p) => pending.has(p.id))
            .map((p) => ({ id: p.id, featured: p.featured }))
          await bulkUpdateFeatured(updates)
          setPending(new Set())
          showToast(`✅ ${changesCount} producto(s) actualizado(s)`)
        } catch (e) {
          showToast(e.message, 'error')
        } finally {
          setSaving(false)
        }
      },
    })
  }, [changesCount, products, pending])

  return (
    <Layout title="Destacados — Website | Sistema KOND">
      <div style={{ padding: '24px', maxWidth: '900px' }}>

        {/* Page header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🖥️ Website</h1>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px',
              borderRadius: '4px', background: 'var(--accent-blue)', color: '#fff',
            }}>Destacados</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Elegí qué productos aparecen en la sección Hero de la página de inicio.
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
            Cargando productos...
          </div>
        ) : (
          <div style={card}>
            <h2 style={sectionTitle}>⭐ Productos Destacados</h2>
            <FeaturedProductsList
              products={products}
              pending={pending}
              onToggle={handleToggle}
              search={search}
              onSearchChange={setSearch}
              page={page}
              onPageChange={setPage}
            />

            {/* Save bar */}
            {changesCount > 0 && (
              <div style={{
                marginTop: '20px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'var(--accent-blue)11',
                border: '1px solid var(--accent-blue)44',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {changesCount} cambio(s) pendiente(s)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => { setPending(new Set()); fetchPublishedProducts().then(setProducts) }}
                    style={{ ...btnSecondary, padding: '7px 16px', fontSize: '0.85rem' }}
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ ...btnPrimary, padding: '7px 16px', fontSize: '0.85rem' }}
                  >
                    {saving ? 'Guardando...' : '💾 Guardar cambios'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back link */}
        <div style={{ marginTop: '16px' }}>
          <a
            href="/admin/website"
            style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            ← Volver a Website
          </a>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmText="Confirmar"
        cancelText="Cancelar"
        type="info"
      />
    </Layout>
  )
}

export default withAdminAuth(FeaturedProductsPage)
