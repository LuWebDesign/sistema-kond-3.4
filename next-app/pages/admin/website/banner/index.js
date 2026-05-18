// next-app/pages/admin/website/banner/index.js
// Manage the announcement bar (scrolling banner) on the storefront home page.

import { useState, useEffect, useCallback } from 'react'
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

// ─── Banner Messages Component ───────────────────────────────────────────────

function BannerMessages({ config, onSave, saving }) {
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

// ─── Main Page ───────────────────────────────────────────────────────────────

function BannerPage() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchConfig()
      .then((cfg) => setConfig(cfg))
      .catch((e) => showToast(e.message || 'Error al cargar', 'error'))
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
    <Layout title="Banner — Website | Sistema KOND">
      <div style={{ padding: '24px', maxWidth: '900px' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🖥️ Website</h1>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'var(--accent-blue)', color: '#fff' }}>Banner</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Configurá los mensajes del banner de anuncios en la parte superior del sitio.
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
            <h2 style={sectionTitle}>📢 Banner de Anuncios</h2>
            <BannerMessages
              config={config}
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

export default withAdminAuth(BannerPage)
