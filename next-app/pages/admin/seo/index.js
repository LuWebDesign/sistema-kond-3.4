// next-app/pages/admin/seo/index.js
// SEO admin page — General tab with score, preview, robots, sitemap, and redirections.

import { useState, useEffect, useCallback } from 'react'
import Layout from '../../../components/Layout'
import withAdminAuth from '../../../components/withAdminAuth'
import { calculateSeoScore, DEFAULT_SCORES } from '../../../lib/seoScore'
import { DEFAULT_SEO_CONFIG } from '../../api/admin/seo-config'

// ─── Style constants ──────────────────────────────────────────────────────────

const card = { background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }
const sectionTitle = { fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }
const sectionSubtitle = { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }
const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }
const labelStyle = { fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }
const btnPrimary = { padding: '9px 20px', borderRadius: '8px', background: 'var(--accent-blue)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }
const btnSecondary = { padding: '9px 20px', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }
const btnDanger = { padding: '7px 14px', borderRadius: '6px', background: 'transparent', color: 'var(--accent-red, #ef4444)', border: '1px solid var(--accent-red, #ef4444)44', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }

// ─── Helper components ────────────────────────────────────────────────────────

function CircularScore({ score }) {
  const r = 48
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: 'block' }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border-color)" strokeWidth="8" />
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
      <text x="60" y="55" textAnchor="middle" fontSize="26" fontWeight="700" fill="var(--text-primary)">{score}</text>
      <text x="60" y="72" textAnchor="middle" fontSize="11" fill="var(--text-muted)">/100</text>
    </svg>
  )
}

function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{value}/100</span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'var(--border-color)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function GooglePreview({ title, description, url }) {
  const displayUrl = url?.trim() || 'https://tu-sitio.com'
  const displayTitle = (title?.trim() || 'Título del sitio').slice(0, 60)
  const displayDesc = (description?.trim() || 'Descripción del sitio...').slice(0, 160)
  const domain = (() => { try { return new URL(displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`).hostname } catch { return displayUrl } })()
  return (
    <div style={{ background: '#fff', border: '1px solid #dadce0', borderRadius: '8px', padding: '16px', fontFamily: 'Arial, sans-serif', maxWidth: '600px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#4285f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#fff', fontWeight: 700, flexShrink: 0 }}>K</div>
        <div>
          <div style={{ fontSize: '14px', color: '#202124', fontWeight: 500 }}>{domain}</div>
          <div style={{ fontSize: '12px', color: '#5f6368' }}>{displayUrl}</div>
        </div>
      </div>
      <div style={{ fontSize: '20px', color: '#1a0dab', marginBottom: '4px', lineHeight: 1.3 }}>{displayTitle}</div>
      <div style={{ fontSize: '14px', color: '#4d5156', lineHeight: 1.5 }}>{displayDesc}</div>
    </div>
  )
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
      <button
        role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', flexShrink: 0, marginTop: '2px',
          background: checked ? 'var(--accent-blue)' : 'var(--border-color)',
          position: 'relative', transition: 'background 0.2s' }}
      >
        <span style={{ position: 'absolute', top: '3px', left: checked ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
      <div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{description}</div>}
      </div>
    </div>
  )
}

function VerificationTool({ icon, title, description, value, onChange, fieldKey }) {
  const isVerified = value?.trim().length > 0
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={value || ''}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder="Código de verificación"
        />
        <span style={{
          padding: '0 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700,
          display: 'flex', alignItems: 'center',
          background: isVerified ? 'var(--accent-green)22' : 'var(--bg-secondary)',
          color: isVerified ? 'var(--accent-green)' : 'var(--text-muted)',
          border: `1px solid ${isVerified ? 'var(--accent-green)44' : 'var(--border-color)'}`,
          whiteSpace: 'nowrap',
        }}>
          {isVerified ? (fieldKey === 'googleAnalytics' ? 'Conectado' : 'Verificado') : 'Verificar'}
        </span>
      </div>
    </div>
  )
}

function RedirectionModal({ onSave, onClose, saving }) {
  const [fromPath, setFromPath] = useState('')
  const [toPath, setToPath] = useState('')
  const [type, setType] = useState('301')
  const handleSubmit = () => {
    if (!fromPath.trim() || !toPath.trim()) return
    onSave({ from_path: fromPath.trim(), to_path: toPath.trim(), type })
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0008', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px', margin: '16px' }}>
        <h3 style={{ margin: '0 0 16px', color: 'var(--text-primary)' }}>Nueva redirección</h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>URL origen</label>
          <input style={inputStyle} value={fromPath} onChange={e => setFromPath(e.target.value)} placeholder="/url-antigua" />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>URL destino</label>
          <input style={inputStyle} value={toPath} onChange={e => setToPath(e.target.value)} placeholder="/url-nueva" />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Tipo</label>
          <select style={inputStyle} value={type} onChange={e => setType(e.target.value)}>
            <option value="301">301 Permanente</option>
            <option value="302">302 Temporal</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnSecondary}>Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} style={btnPrimary}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'general',    label: '⚙️ General' },
  { id: 'home',       label: '🏠 Home' },
  { id: 'productos',  label: '🛍️ Productos' },
  { id: 'categorias', label: '📂 Categorías' },
  { id: 'paginas',    label: '📄 Páginas' },
  { id: 'tecnico',    label: '🔧 Técnico' },
  { id: 'auditoria',  label: '🔍 Auditoría' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

function SeoPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [config, setConfig] = useState(null)
  const [redirections, setRedirections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingRobots, setSavingRobots] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [savingRedirect, setSavingRedirect] = useState(false)
  const [showRedirectModal, setShowRedirectModal] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/seo-config').then(r => r.json()),
      fetch('/api/admin/redirections?limit=5').then(r => r.json()),
    ]).then(([seoRes, redirRes]) => {
      setConfig(seoRes.config || DEFAULT_SEO_CONFIG)
      setRedirections(redirRes.redirections || [])
    }).catch(() => setConfig(DEFAULT_SEO_CONFIG))
    .finally(() => setLoading(false))
  }, [])

  const setField = (key, value) => setConfig(prev => ({ ...prev, [key]: value }))

  const handleSaveConfig = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/seo-config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      showToast('Configuración guardada')
    } catch (e) {
      showToast(e.message, 'error')
    } finally { setSaving(false) }
  }, [config])

  const handleSaveRobots = useCallback(async () => {
    setSavingRobots(true)
    try {
      const res = await fetch('/api/admin/seo-config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      showToast('Robots.txt guardado')
    } catch (e) { showToast(e.message, 'error') }
    finally { setSavingRobots(false) }
  }, [config])

  const handleRegenerateSitemap = async () => {
    setRegenerating(true)
    try {
      const res = await fetch('/api/admin/seo/regenerate-sitemap', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error')
      setConfig(prev => ({ ...prev, sitemapLastGenerated: json.generatedAt, sitemapUrlCount: json.urlCount }))
      showToast(`Sitemap regenerado — ${json.urlCount} URLs`)
    } catch (e) { showToast(e.message, 'error') }
    finally { setRegenerating(false) }
  }

  const handleSaveRedirection = async (data) => {
    setSavingRedirect(true)
    try {
      const res = await fetch('/api/admin/redirections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error al guardar')
      const redirRes = await fetch('/api/admin/redirections?limit=5').then(r => r.json())
      setRedirections(redirRes.redirections || [])
      setShowRedirectModal(false)
      showToast('Redirección creada')
    } catch (e) { showToast(e.message, 'error') }
    finally { setSavingRedirect(false) }
  }

  const handleDeleteRedirection = async (id) => {
    try {
      await fetch(`/api/admin/redirections?id=${id}`, { method: 'DELETE' })
      setRedirections(prev => prev.filter(r => r.id !== id))
      showToast('Redirección eliminada')
    } catch { showToast('Error al eliminar', 'error') }
  }

  const scores = config ? calculateSeoScore(config) : DEFAULT_SCORES

  return (
    <Layout title="SEO">
      <div style={{ padding: '24px', maxWidth: '1100px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>SEO</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Administrá y optimizá el posicionamiento de tu tienda online</p>
          </div>
          {config?.siteUrl && (
            <a href={config.siteUrl} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              Ver sitio web ↗
            </a>
          )}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-color)', marginBottom: '28px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '10px 16px', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                background: 'transparent', color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 700 : 400, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Cargando configuración...
          </div>
        ) : (
          <>
            {activeTab === 'general' && config && (
              <>
                {/* Section 1 — two-column: config form + preview/score */}
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '0' }}>
                  {/* Left column */}
                  <div style={{ flex: 3, minWidth: '280px' }}>
                    <div style={card}>
                      <h2 style={sectionTitle}>Configuración SEO General</h2>
                      <p style={sectionSubtitle}>Definí los metadatos principales del sitio</p>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Título del sitio</label>
                        <input style={inputStyle} value={config.siteTitle} onChange={e => setField('siteTitle', e.target.value)} placeholder="Ej: Mi Tienda Online — Productos de calidad" />
                        <div style={{ fontSize: '0.75rem', color: config.siteTitle.length > 60 ? 'var(--accent-red, #ef4444)' : 'var(--text-muted)', marginTop: '4px' }}>
                          {config.siteTitle.length}/60 caracteres recomendados
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Descripción del sitio</label>
                        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={4} value={config.siteDescription} onChange={e => setField('siteDescription', e.target.value)} placeholder="Descripción breve del sitio para motores de búsqueda..." />
                        <div style={{ fontSize: '0.75rem', color: config.siteDescription.length > 160 ? 'var(--accent-red, #ef4444)' : 'var(--text-muted)', marginTop: '4px' }}>
                          {config.siteDescription.length}/160 caracteres recomendados
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Palabras clave</label>
                        <input style={inputStyle} value={config.keywords} onChange={e => setField('keywords', e.target.value)} placeholder="ropa, indumentaria, moda, tienda online..." />
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        <div style={{ flex: 2, minWidth: '180px' }}>
                          <label style={labelStyle}>URL del sitio</label>
                          <input style={inputStyle} value={config.siteUrl} onChange={e => setField('siteUrl', e.target.value)} placeholder="https://mi-tienda.com" />
                        </div>
                        <div style={{ flex: 1, minWidth: '120px' }}>
                          <label style={labelStyle}>Idioma</label>
                          <select style={inputStyle} value={config.language} onChange={e => setField('language', e.target.value)}>
                            <option value="es">Español (ES)</option>
                            <option value="en">English</option>
                            <option value="pt">Português</option>
                          </select>
                        </div>
                      </div>

                      <Toggle
                        checked={config.indexSite !== false}
                        onChange={v => setField('indexSite', v)}
                        label="Indexar sitio"
                        description="Permitir que los motores de búsqueda indexen el sitio"
                      />

                      <Toggle
                        checked={config.followLinks !== false}
                        onChange={v => setField('followLinks', v)}
                        label="Seguir enlaces"
                        description="Permitir que los motores sigan los enlaces del sitio"
                      />

                      <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>URL Canónica</label>
                        <input style={inputStyle} value={config.canonicalUrl} onChange={e => setField('canonicalUrl', e.target.value)} placeholder="https://mi-tienda.com" />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Usá esta URL para evitar contenido duplicado. Generalmente es igual a la URL del sitio.
                        </div>
                      </div>

                      <button onClick={handleSaveConfig} disabled={saving} style={btnPrimary}>
                        {saving ? 'Guardando...' : '💾 Guardar configuración SEO'}
                      </button>
                    </div>
                  </div>

                  {/* Right column */}
                  <div style={{ flex: 2, minWidth: '280px' }}>
                    <div style={card}>
                      <h2 style={sectionTitle}>Vista previa en Google</h2>
                      <p style={sectionSubtitle}>Así aparece tu sitio en los resultados de búsqueda</p>
                      <GooglePreview title={config.siteTitle} description={config.siteDescription} url={config.siteUrl} />
                    </div>

                    <div style={card}>
                      <h2 style={sectionTitle}>Puntaje SEO del sitio</h2>
                      <p style={sectionSubtitle}>Evaluación basada en la configuración actual</p>
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                        <CircularScore score={scores.total} />
                      </div>
                      <ScoreBar label="Contenido" value={scores.contenido} color="#22c55e" />
                      <ScoreBar label="Técnico" value={scores.tecnico} color="#f59e0b" />
                      <ScoreBar label="Usabilidad" value={scores.usabilidad} color="#3b82f6" />
                      <ScoreBar label="Popularidad" value={scores.popularidad} color="#8b5cf6" />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        * Popularidad requiere integración externa (GSC, etc.)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2 — Verificaciones */}
                <div style={card}>
                  <h2 style={sectionTitle}>Verificaciones para herramientas</h2>
                  <p style={sectionSubtitle}>Conectá y verificá tu sitio con las principales herramientas de webmasters</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <VerificationTool icon="🔍" title="Google Search Console" description="Verificá tu sitio en Google Search Console" value={config.googleSearchConsole} onChange={setField} fieldKey="googleSearchConsole" />
                    <VerificationTool icon="📊" title="Google Analytics" description="ID de medición" value={config.googleAnalytics} onChange={setField} fieldKey="googleAnalytics" />
                    <VerificationTool icon="🔷" title="Bing Webmaster Tools" description="Verificá tu sitio en Bing Webmaster Tools" value={config.bingWebmaster} onChange={setField} fieldKey="bingWebmaster" />
                    <VerificationTool icon="🟡" title="Yandex Webmaster" description="Verificá tu sitio en Yandex Webmaster" value={config.yandexWebmaster} onChange={setField} fieldKey="yandexWebmaster" />
                    <VerificationTool icon="📌" title="Pinterest Verification" description="Verificá tu sitio en Pinterest" value={config.pinterestVerification} onChange={setField} fieldKey="pinterestVerification" />
                    <VerificationTool icon="🔵" title="Facebook Domain Verification" description="Verificá tu dominio en Facebook" value={config.facebookDomainVerification} onChange={setField} fieldKey="facebookDomainVerification" />
                  </div>
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={handleSaveConfig} disabled={saving} style={btnPrimary}>{saving ? 'Guardando...' : '💾 Guardar verificaciones'}</button>
                  </div>
                </div>

                {/* Section 3 — two-column: Robots.txt + Sitemap */}
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {/* Robots.txt */}
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={card}>
                      <h2 style={sectionTitle}>Robots.txt</h2>
                      <p style={sectionSubtitle}>Controlá qué páginas indexan los motores de búsqueda</p>
                      <textarea
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical' }}
                        rows={10}
                        value={config.robotsTxt}
                        onChange={e => setField('robotsTxt', e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setField('robotsTxt', DEFAULT_SEO_CONFIG.robotsTxt)}
                          style={btnSecondary}
                        >
                          Restaurar por defecto
                        </button>
                        <button onClick={handleSaveRobots} disabled={savingRobots} style={btnPrimary}>
                          {savingRobots ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sitemap.xml */}
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={card}>
                      <h2 style={sectionTitle}>Sitemap.xml</h2>
                      <p style={sectionSubtitle}>Generá y configurá el mapa de tu sitio para los buscadores</p>

                      {/* Status row */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-green)', background: 'var(--accent-green)22', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--accent-green)44' }}>✅ Correcto</span>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600 }}>Última generación: </span>
                          {config.sitemapLastGenerated
                            ? new Date(config.sitemapLastGenerated).toLocaleString('es-AR')
                            : 'Nunca'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600 }}>URLs: </span>{config.sitemapUrlCount ?? '—'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600 }}>Tipo: </span>Índice de sitemap
                        </div>
                      </div>

                      <label style={{ ...labelStyle, marginBottom: '12px' }}>Opciones de generación</label>
                      {[
                        { key: 'sitemapIncludeProducts',   label: 'Incluir productos' },
                        { key: 'sitemapIncludeCategories', label: 'Incluir categorías' },
                        { key: 'sitemapIncludePages',      label: 'Incluir páginas' },
                        { key: 'sitemapIncludeImages',     label: 'Incluir imágenes' },
                        { key: 'sitemapIncludeBlogs',      label: 'Incluir blogs' },
                      ].map(({ key, label }) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          <input
                            type="checkbox"
                            checked={!!config[key]}
                            onChange={e => setField(key, e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          {label}
                        </label>
                      ))}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                        <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                          Ver sitemap ↗
                        </a>
                        <button onClick={handleRegenerateSitemap} disabled={regenerating} style={btnPrimary}>
                          {regenerating ? '⟳ Regenerando...' : '🔄 Regenerar sitemap'}
                        </button>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <button onClick={handleSaveConfig} disabled={saving} style={{ ...btnSecondary, fontSize: '0.85rem', padding: '7px 16px' }}>
                          {saving ? 'Guardando...' : '💾 Guardar opciones'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4 — Redirections */}
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ ...sectionTitle, marginBottom: '2px' }}>Redirecciones recientes</h2>
                      <p style={{ ...sectionSubtitle, marginBottom: 0 }}>Gestioná redirecciones 301/302 para URLs antiguas o movidas</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <a href="#" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', textDecoration: 'none' }}>Ver todas</a>
                      <button onClick={() => setShowRedirectModal(true)} style={{ ...btnPrimary, padding: '7px 16px', fontSize: '0.85rem' }}>
                        + Nueva redirección
                      </button>
                    </div>
                  </div>

                  {redirections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      No hay redirecciones configuradas
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            {['Tipo', 'URL origen', 'URL destino', 'Tipo de redirección', 'Creada', 'Acciones'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {redirections.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ fontSize: '1rem' }}>↗</span>
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.from_path}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.to_path}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                                  background: r.type === '301' ? 'var(--accent-green)22' : '#f59e0b22',
                                  color: r.type === '301' ? 'var(--accent-green)' : '#f59e0b',
                                  border: `1px solid ${r.type === '301' ? 'var(--accent-green)44' : '#f59e0b44'}`,
                                }}>
                                  {r.type}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                {r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR') : '—'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <button onClick={() => handleDeleteRedirection(r.id)} style={btnDanger} title="Eliminar redirección">
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ marginTop: '16px' }}>
                    <a href="#" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', textDecoration: 'none' }}>
                      Ver todas las redirecciones →
                    </a>
                  </div>
                </div>
              </>
            )}

            {activeTab !== 'general' && (
              <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🚧</div>
                <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>Próximamente</h3>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Esta sección está en desarrollo.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', zIndex: 2000,
          background: toast.type === 'error' ? 'var(--accent-red, #ef4444)' : '#22c55e', color: '#fff',
          boxShadow: '0 4px 20px #0004' }}>
          {toast.msg}
        </div>
      )}

      {/* Redirection modal */}
      {showRedirectModal && (
        <RedirectionModal onSave={handleSaveRedirection} onClose={() => setShowRedirectModal(false)} saving={savingRedirect} />
      )}
    </Layout>
  )
}

export default withAdminAuth(SeoPage)
