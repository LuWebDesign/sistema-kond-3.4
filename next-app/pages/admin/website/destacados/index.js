// next-app/pages/admin/website/destacados/index.js
// Manage featured products for the storefront home page.
// Products marked as featured appear in the Hero section of the home.

import { useState, useEffect, useCallback } from 'react'
import Layout from '../../../../components/Layout'
import withAdminAuth from '../../../../components/withAdminAuth'
import ConfirmDialog from '../../../../components/ConfirmDialog'

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchPublishedProducts() {
  // Use home-data API which uses supabaseAdmin + TENANT_ID
  const res = await fetch('/api/home-data')
  if (!res.ok) return []
  const json = await res.json()
  // Featured products already have the `featured` field
  const featured = json.featured || []
  const featuredIds = new Set(featured.map((p) => p.id))
  // Products from byCategory don't have `featured` — add it as false
  const byCategory = json.byCategory || {}
  const allFromCategories = Object.values(byCategory).flat()
  // Deduplicate and merge
  const seen = new Set()
  const all = []
  for (const p of [...featured, ...allFromCategories]) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    all.push({ ...p, featured: featuredIds.has(p.id) })
  }
  return all
}

async function toggleFeatured(productId, featured) {
  const res = await fetch(`/api/admin/productos/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ featured }),
  })
  if (!res.ok) throw new Error('Error al actualizar producto')
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

// ─── Featured Products List ──────────────────────────────────────────────────

function FeaturedProductsList({ products, onToggle, saving }) {
  const [search, setSearch] = useState('')
  const featured = products.filter((p) => p.featured)
  const filtered = products.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      p.id?.toString().includes(search)
  )

  return (
    <div>
      <p style={sectionSubtitle}>
        Los productos destacados aparecen en la sección Hero de la home. Marcá hasta 8.
      </p>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={badge(true)}>{featured.length} destacados</span>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        {filtered.map((p) => (
          <label
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: p.featured ? 'var(--accent-blue)11' : 'var(--bg-secondary)',
              border: `1px solid ${p.featured ? 'var(--accent-blue)44' : 'var(--border-color)'}`,
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="checkbox"
              checked={!!p.featured}
              disabled={saving}
              onChange={() => onToggle(p.id, !p.featured)}
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
            {p.featured && <span style={badge(true)}>Destacado</span>}
          </label>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sin resultados.</p>
        )}
      </div>
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

  const handleToggleFeatured = useCallback(async (id, featured) => {
    setSaving(true)
    try {
      await toggleFeatured(id, featured)
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, featured } : p))
      showToast(featured ? '⭐ Marcado como destacado' : 'Quitado de destacados')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }, [])

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
              onToggle={handleToggleFeatured}
              saving={saving}
            />
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
