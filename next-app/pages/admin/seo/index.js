// next-app/pages/admin/seo/index.js
// SEO admin page — General, Home, Productos, Categorías, Páginas tabs implemented.
// Técnico and Auditoría are stubbed for next iteration.

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

// ─── InfoTooltip ─────────────────────────────────────────────────────────────

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px', verticalAlign: 'middle' }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="Más información"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', lineHeight: 1, color: 'var(--text-muted)', fontSize: '0.95rem' }}
      >
        ℹ️
      </button>
      {visible && (
        <span style={{
          position: 'absolute', bottom: '130%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px',
          padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)',
          width: '260px', zIndex: 100, boxShadow: '0 4px 16px #0003',
          lineHeight: 1.5, whiteSpace: 'normal', pointerEvents: 'none',
        }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ─── Shared helper components ─────────────────────────────────────────────────

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
  const [editing, setEditing] = useState(false)

  // Auto-unlock if user clears the value
  const isEditable = !isVerified || editing

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
          style={{ ...inputStyle, flex: 1, opacity: isEditable ? 1 : 0.6 }}
          value={value || ''}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={isEditable ? "Código de verificación" : "Verificado"}
          disabled={!isEditable}
        />
        {isVerified && !editing ? (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: '0 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
              display: 'flex', alignItems: 'center',
              background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
            title="Editar"
          >
            ✏️
          </button>
        ) : (
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
        )}
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

// ─── Template editor (Productos / Categorías) ─────────────────────────────────

function applyTemplate(template, sampleData) {
  if (!template) return ''
  return Object.entries(sampleData).reduce((str, [k, v]) => str.replaceAll(k, v), template)
}

function TemplateEditor({ label, value, onChange, placeholder, maxLen, hint, sampleData }) {
  const preview = applyTemplate(value, sampleData)
  const len = value?.length || 0
  const overLen = maxLen && len > maxLen
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {maxLen && (
        <div style={{ fontSize: '0.75rem', color: overLen ? 'var(--accent-red, #ef4444)' : 'var(--text-muted)', marginTop: '4px' }}>
          {len}/{maxLen} caracteres recomendados
        </div>
      )}
      {hint && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</div>}
      {preview && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>Preview:</span>{preview}
        </div>
      )}
    </div>
  )
}

function PlaceholderChips({ placeholders }) {
  return (
    <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Variables disponibles</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {placeholders.map(p => (
          <span key={p.key} title={p.desc}
            style={{ fontSize: '0.78rem', padding: '3px 8px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', fontFamily: 'monospace', color: 'var(--accent-blue)', cursor: 'default' }}>
            {p.key}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Home ────────────────────────────────────────────────────────────────

function HomeTab({ config, setField, saving, onSave }) {
  const previewTitle = config.homeSeoTitle?.trim() || config.siteTitle || 'Título de la tienda'
  const previewDesc = config.homeSeoDescription?.trim() || config.siteDescription || 'Descripción de la tienda...'

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      {/* Left — form */}
      <div style={{ flex: 3, minWidth: '280px' }}>
        <div style={card}>
          <h2 style={sectionTitle}>
            SEO de la página principal
            <InfoTooltip text="Estos valores se aplican en la página /home. Anulan los valores generales solo para la portada de la tienda. Si dejás vacío, se usa el título/descripción del tab General." />
          </h2>
          <p style={sectionSubtitle}>
            Configuración específica para la home. Dejá los campos vacíos para heredar los valores del tab General.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Título (vacío = hereda de General)</label>
            <input
              style={inputStyle}
              value={config.homeSeoTitle || ''}
              onChange={e => setField('homeSeoTitle', e.target.value)}
              placeholder={config.siteTitle || 'Heredado del General'}
            />
            <div style={{ fontSize: '0.75rem', color: (config.homeSeoTitle?.length || 0) > 60 ? 'var(--accent-red, #ef4444)' : 'var(--text-muted)', marginTop: '4px' }}>
              {config.homeSeoTitle?.length || 0}/60 caracteres recomendados
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Descripción (vacío = hereda de General)</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical' }}
              rows={4}
              value={config.homeSeoDescription || ''}
              onChange={e => setField('homeSeoDescription', e.target.value)}
              placeholder={config.siteDescription || 'Heredado del General'}
            />
            <div style={{ fontSize: '0.75rem', color: (config.homeSeoDescription?.length || 0) > 160 ? 'var(--accent-red, #ef4444)' : 'var(--text-muted)', marginTop: '4px' }}>
              {config.homeSeoDescription?.length || 0}/160 caracteres recomendados
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>URL de imagen Open Graph</label>
            <input
              style={inputStyle}
              value={config.homeOgImage || ''}
              onChange={e => setField('homeOgImage', e.target.value)}
              placeholder="https://tu-sitio.com/og-home.jpg"
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Recomendado: 1200×630 px. Se muestra al compartir en redes sociales.
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Alt text de la imagen OG</label>
            <input
              style={inputStyle}
              value={config.homeOgImageAlt || ''}
              onChange={e => setField('homeOgImageAlt', e.target.value)}
              placeholder="Descripción de la imagen para accesibilidad"
            />
          </div>

          <Toggle
            checked={config.homeSchemaEnabled !== false}
            onChange={v => setField('homeSchemaEnabled', v)}
            label="Datos estructurados WebSite"
            description="Habilita JSON-LD schema.org/WebSite para mejorar resultados de búsqueda"
          />

          <button onClick={onSave} disabled={saving} style={btnPrimary}>
            {saving ? 'Guardando...' : '💾 Guardar configuración Home'}
          </button>
        </div>
      </div>

      {/* Right — previews */}
      <div style={{ flex: 2, minWidth: '280px' }}>
        <div style={card}>
          <h2 style={sectionTitle}>Vista previa en Google</h2>
          <p style={sectionSubtitle}>Cómo aparecerá la home en resultados de búsqueda</p>
          <GooglePreview title={previewTitle} description={previewDesc} url={config.siteUrl} />
        </div>

        {config.homeOgImage ? (
          <div style={card}>
            <h2 style={sectionTitle}>Vista previa Open Graph</h2>
            <p style={sectionSubtitle}>Cómo se ve al compartir en redes sociales</p>
            <img
              src={config.homeOgImage}
              alt={config.homeOgImageAlt || 'OG preview'}
              style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', objectFit: 'cover', maxHeight: '200px' }}
              onError={e => { e.target.style.display = 'none' }}
            />
            {config.homeOgImageAlt && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>Alt: {config.homeOgImageAlt}</div>
            )}
          </div>
        ) : (
          <div style={{ ...card, textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🖼️</div>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>
              Agregá una URL de imagen OG para ver la vista previa al compartir en redes sociales.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Productos ───────────────────────────────────────────────────────────

const PRODUCT_PLACEHOLDERS = [
  { key: '{{nombre}}',      desc: 'Nombre del producto' },
  { key: '{{categoria}}',   desc: 'Categoría del producto' },
  { key: '{{precio}}',      desc: 'Precio del producto' },
  { key: '{{sitio}}',       desc: 'Nombre del sitio' },
  { key: '{{descripcion}}', desc: 'Descripción del producto' },
]

function ProductosTab({ config, setField, saving, onSave }) {
  const sampleData = {
    '{{nombre}}':      'Remera Basic Fit',
    '{{categoria}}':   'Remeras',
    '{{precio}}':      '$15.990',
    '{{sitio}}':       config.siteTitle || 'Mi Tienda',
    '{{descripcion}}': 'Remera de algodón premium, talle regular.',
  }

  const previewTitle = applyTemplate(config.productTitleTemplate, sampleData) || 'Remera Basic Fit | Mi Tienda'
  const previewDesc  = applyTemplate(config.productDescriptionTemplate, sampleData) || 'Comprá Remera Basic Fit al mejor precio. Envíos disponibles.'
  const previewUrl   = config.siteUrl ? `${config.siteUrl}/catalogo/remeras` : 'https://tu-sitio.com/catalogo/remeras'

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      {/* Left — form */}
      <div style={{ flex: 3, minWidth: '280px' }}>
        <div style={card}>
          <h2 style={sectionTitle}>
            SEO de páginas de producto
            <InfoTooltip text="Estas plantillas se aplican automáticamente a cada producto del catálogo. Usá {{nombre}}, {{categoria}}, {{precio}}, {{sitio}} y {{descripcion}} para personalizar el resultado en Google." />
          </h2>
          <p style={sectionSubtitle}>
            Plantillas aplicadas automáticamente a todas las páginas de producto. Usá las variables de abajo para personalizar cada resultado.
          </p>

          <PlaceholderChips placeholders={PRODUCT_PLACEHOLDERS} />

          <TemplateEditor
            label="Plantilla de título"
            value={config.productTitleTemplate}
            onChange={v => setField('productTitleTemplate', v)}
            placeholder="{{nombre}} | {{sitio}}"
            maxLen={60}
            sampleData={sampleData}
          />

          <TemplateEditor
            label="Plantilla de descripción"
            value={config.productDescriptionTemplate}
            onChange={v => setField('productDescriptionTemplate', v)}
            placeholder="Comprá {{nombre}} al mejor precio. Envíos disponibles."
            maxLen={160}
            sampleData={sampleData}
          />

          <Toggle
            checked={config.productSchemaEnabled !== false}
            onChange={v => setField('productSchemaEnabled', v)}
            label="Datos estructurados de producto (JSON-LD)"
            description="Habilita schema.org/Product con precio, disponibilidad y organización vendedora"
          />

          <button onClick={onSave} disabled={saving} style={btnPrimary}>
            {saving ? 'Guardando...' : '💾 Guardar configuración Productos'}
          </button>
        </div>
      </div>

      {/* Right — preview */}
      <div style={{ flex: 2, minWidth: '280px' }}>
        <div style={card}>
          <h2 style={sectionTitle}>Vista previa de producto</h2>
          <p style={sectionSubtitle}>Ejemplo con datos de muestra</p>
          <GooglePreview title={previewTitle} description={previewDesc} url={previewUrl} />
        </div>

        <div style={{ ...card, background: 'var(--bg-secondary)' }}>
          <h2 style={sectionTitle}>Datos de muestra</h2>
          <p style={{ ...sectionSubtitle, marginBottom: '12px' }}>El preview usa estos valores de ejemplo</p>
          <div style={{ display: 'grid', gap: '6px' }}>
            {Object.entries(sampleData).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '0.82rem' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', minWidth: '120px' }}>{k}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Categorías ──────────────────────────────────────────────────────────

const CATEGORY_PLACEHOLDERS = [
  { key: '{{categoria}}',      desc: 'Nombre de la categoría' },
  { key: '{{subcategoria}}',   desc: 'Nombre de la subcategoría (si aplica)' },
  { key: '{{cantidad}}',       desc: 'Cantidad de productos en la categoría' },
  { key: '{{sitio}}',          desc: 'Nombre del sitio' },
]

function CategoriasTab({ config, setField, saving, onSave }) {
  const sampleData = {
    '{{categoria}}':    'Remeras',
    '{{subcategoria}}': 'Básicas',
    '{{cantidad}}':     '48',
    '{{sitio}}':        config.siteTitle || 'Mi Tienda',
  }

  const previewTitle = applyTemplate(config.categoryTitleTemplate, sampleData) || 'Remeras — Mi Tienda'
  const previewDesc  = applyTemplate(config.categoryDescriptionTemplate, sampleData) || 'Explorá todos los productos de Remeras en Mi Tienda.'
  const previewUrl   = config.siteUrl ? `${config.siteUrl}/catalogo/remeras` : 'https://tu-sitio.com/catalogo/remeras'

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      {/* Left — form */}
      <div style={{ flex: 3, minWidth: '280px' }}>
        <div style={card}>
          <h2 style={sectionTitle}>
            SEO de páginas de categoría
            <InfoTooltip text="Estas plantillas se aplican a cada página de categoría y subcategoría del catálogo (/catalog/[categoria]). Usá {{categoria}}, {{subcategoria}}, {{cantidad}} y {{sitio}} para personalizar." />
          </h2>
          <p style={sectionSubtitle}>
            Plantillas aplicadas a todas las páginas de categoría y subcategoría del catálogo.
          </p>

          <PlaceholderChips placeholders={CATEGORY_PLACEHOLDERS} />

          <TemplateEditor
            label="Plantilla de título"
            value={config.categoryTitleTemplate}
            onChange={v => setField('categoryTitleTemplate', v)}
            placeholder="{{categoria}} — {{sitio}}"
            maxLen={60}
            sampleData={sampleData}
          />

          <TemplateEditor
            label="Plantilla de descripción"
            value={config.categoryDescriptionTemplate}
            onChange={v => setField('categoryDescriptionTemplate', v)}
            placeholder="Explorá todos los productos de {{categoria}} en {{sitio}}."
            maxLen={160}
            sampleData={sampleData}
          />

          <Toggle
            checked={config.categorySchemaEnabled !== false}
            onChange={v => setField('categorySchemaEnabled', v)}
            label="Datos estructurados de breadcrumb (JSON-LD)"
            description="Habilita schema.org/BreadcrumbList para mostrar la ruta de navegación en Google"
          />

          <button onClick={onSave} disabled={saving} style={btnPrimary}>
            {saving ? 'Guardando...' : '💾 Guardar configuración Categorías'}
          </button>
        </div>
      </div>

      {/* Right — preview */}
      <div style={{ flex: 2, minWidth: '280px' }}>
        <div style={card}>
          <h2 style={sectionTitle}>Vista previa de categoría</h2>
          <p style={sectionSubtitle}>Ejemplo con datos de muestra</p>
          <GooglePreview title={previewTitle} description={previewDesc} url={previewUrl} />
        </div>

        <div style={{ ...card, background: 'var(--bg-secondary)' }}>
          <h2 style={sectionTitle}>Datos de muestra</h2>
          <p style={{ ...sectionSubtitle, marginBottom: '12px' }}>El preview usa estos valores de ejemplo</p>
          <div style={{ display: 'grid', gap: '6px' }}>
            {Object.entries(sampleData).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '0.82rem' }}>
                <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', minWidth: '140px' }}>{k}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Páginas estáticas ───────────────────────────────────────────────────

const STATIC_PAGES = [
  { key: 'carrito',   label: 'Carrito',       icon: '🛒', path: '/mi-carrito' },
  { key: 'catalogo',  label: 'Catálogo',      icon: '🛍️', path: '/catalogo' },
  { key: 'pedidos',   label: 'Mis pedidos',   icon: '📦', path: '/mis-pedidos' },
  { key: 'contacto',  label: 'Contacto',      icon: '✉️',  path: '/contacto' },
  { key: 'nosotros',  label: 'Nosotros',      icon: 'ℹ️',  path: '/nosotros' },
  { key: 'login',     label: 'Iniciar sesión', icon: '🔐', path: '/login' },
]

function PaginasTab({ config, setField, saving, onSave }) {
  const pages = config.pagesSeo || {}
  const [activePreview, setActivePreview] = useState('carrito')

  const updatePage = (pageKey, field, value) => {
    setField('pagesSeo', {
      ...pages,
      [pageKey]: { ...(pages[pageKey] || {}), [field]: value },
    })
  }

  const activePage = STATIC_PAGES.find(p => p.key === activePreview)
  const previewTitle = pages[activePreview]?.title?.trim() || `${activePage?.label} | ${config.siteTitle || 'Mi Tienda'}`
  const previewDesc  = pages[activePreview]?.description?.trim() || 'Descripción de la página...'
  const previewUrl   = config.siteUrl ? `${config.siteUrl}${activePage?.path || ''}` : `https://tu-sitio.com${activePage?.path || ''}`

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      {/* Left — form */}
      <div style={{ flex: 3, minWidth: '280px' }}>
        <div style={card}>
          <h2 style={sectionTitle}>
            SEO de páginas estáticas
            <InfoTooltip text="Configurá título y descripción para páginas fijas como Carrito, Catálogo, Mis pedidos, etc. Si dejás vacío, cada página usa los valores generales del sitio." />
          </h2>
          <p style={sectionSubtitle}>
            Configurá título y descripción para páginas específicas del sitio. Dejá vacío para que hereden los valores generales del sitio.
          </p>

          <div style={{ display: 'grid', gap: '16px' }}>
            {STATIC_PAGES.map(page => {
              const titleVal = pages[page.key]?.title || ''
              const descVal  = pages[page.key]?.description || ''
              const hasOverride = titleVal || descVal
              return (
                <div
                  key={page.key}
                  style={{
                    padding: '16px',
                    border: `1px solid ${hasOverride ? 'var(--accent-blue)44' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    background: hasOverride ? 'var(--accent-blue)08' : 'transparent',
                  }}
                >
                  {/* Page header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1.1rem' }}>{page.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{page.label}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px' }}>
                      {page.path}
                    </span>
                    {hasOverride && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-blue)', background: 'var(--accent-blue)18', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--accent-blue)44' }}>
                        Personalizado
                      </span>
                    )}
                  </div>

                  {/* Fields */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <label style={labelStyle}>Título</label>
                      <input
                        style={inputStyle}
                        value={titleVal}
                        onChange={e => {
                          updatePage(page.key, 'title', e.target.value)
                          setActivePreview(page.key)
                        }}
                        onFocus={() => setActivePreview(page.key)}
                        placeholder={`${page.label} | ${config.siteTitle || 'Mi Tienda'}`}
                      />
                    </div>
                    <div style={{ flex: 2, minWidth: '220px' }}>
                      <label style={labelStyle}>Descripción</label>
                      <input
                        style={inputStyle}
                        value={descVal}
                        onChange={e => {
                          updatePage(page.key, 'description', e.target.value)
                          setActivePreview(page.key)
                        }}
                        onFocus={() => setActivePreview(page.key)}
                        placeholder="Descripción para esta página..."
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '24px' }}>
            <button onClick={onSave} disabled={saving} style={btnPrimary}>
              {saving ? 'Guardando...' : '💾 Guardar páginas'}
            </button>
          </div>
        </div>
      </div>

      {/* Right — live preview */}
      <div style={{ flex: 2, minWidth: '280px' }}>
        <div style={{ position: 'sticky', top: '24px' }}>
          <div style={card}>
            <h2 style={sectionTitle}>Vista previa</h2>
            <p style={sectionSubtitle}>
              Hacé click en cualquier campo para previsualizar esa página
            </p>

            {/* Page selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {STATIC_PAGES.map(p => (
                <button
                  key={p.key}
                  onClick={() => setActivePreview(p.key)}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none',
                    background: activePreview === p.key ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                    color: activePreview === p.key ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            <GooglePreview title={previewTitle} description={previewDesc} url={previewUrl} />

            {/* Status */}
            <div style={{ marginTop: '16px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {pages[activePreview]?.title || pages[activePreview]?.description
                ? <span style={{ color: 'var(--accent-green)' }}>✓ Esta página tiene SEO personalizado</span>
                : <span style={{ color: 'var(--text-muted)' }}>Usando valores generales del sitio</span>
              }
            </div>
          </div>
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
            {/* ── General ── */}
            {activeTab === 'general' && config && (
              <>
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

                {/* Verificaciones */}
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

                {/* Robots + Sitemap */}
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
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
                        <button onClick={() => setField('robotsTxt', DEFAULT_SEO_CONFIG.robotsTxt)} style={btnSecondary}>
                          Restaurar por defecto
                        </button>
                        <button onClick={handleSaveRobots} disabled={savingRobots} style={btnPrimary}>
                          {savingRobots ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={card}>
                      <h2 style={sectionTitle}>Sitemap.xml</h2>
                      <p style={sectionSubtitle}>Generá y configurá el mapa de tu sitio para los buscadores</p>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-green)', background: 'var(--accent-green)22', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--accent-green)44' }}>✅ Correcto</span>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600 }}>Última generación: </span>
                          {config.sitemapLastGenerated ? new Date(config.sitemapLastGenerated).toLocaleString('es-AR') : 'Nunca'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 600 }}>URLs: </span>{config.sitemapUrlCount ?? '—'}
                        </div>
                      </div>

                      {config.siteUrl && (
                        <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>URL del sitemap</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <code style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '6px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {config.siteUrl}/sitemap.xml
                            </code>
                            <button
                              onClick={() => { navigator.clipboard.writeText(`${config.siteUrl}/sitemap.xml`).then(() => showToast('URL copiada al portapapeles')) }}
                              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                              title="Copiar URL"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      )}

                      <label style={{ ...labelStyle, marginBottom: '12px' }}>Opciones de generación</label>
                      {[
                        { key: 'sitemapIncludeProducts',   label: 'Incluir productos' },
                        { key: 'sitemapIncludeCategories', label: 'Incluir categorías' },
                        { key: 'sitemapIncludePages',      label: 'Incluir páginas' },
                        { key: 'sitemapIncludeImages',     label: 'Incluir imágenes' },
                        { key: 'sitemapIncludeBlogs',      label: 'Incluir blogs' },
                      ].map(({ key, label }) => (
                        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          <input type="checkbox" checked={!!config[key]} onChange={e => setField(key, e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                          {label}
                        </label>
                      ))}

                      <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                        <a href={config.siteUrl ? `${config.siteUrl}/sitemap.xml` : '/sitemap.xml'} target="_blank" rel="noopener noreferrer" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
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

                {/* Redirections */}
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ ...sectionTitle, marginBottom: '2px' }}>Redirecciones recientes</h2>
                      <p style={{ ...sectionSubtitle, marginBottom: 0 }}>Gestioná redirecciones 301/302 para URLs antiguas o movidas</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                            {['', 'URL origen', 'URL destino', 'Tipo', 'Creada', 'Acciones'].map(h => (
                              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {redirections.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '10px 12px' }}><span style={{ fontSize: '1rem' }}>↗</span></td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.from_path}</td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{r.to_path}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                                  background: r.type === '301' ? 'var(--accent-green)22' : '#f59e0b22',
                                  color: r.type === '301' ? 'var(--accent-green)' : '#f59e0b',
                                  border: `1px solid ${r.type === '301' ? 'var(--accent-green)44' : '#f59e0b44'}` }}>
                                  {r.type}
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                {r.created_at ? new Date(r.created_at).toLocaleDateString('es-AR') : '—'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <button onClick={() => handleDeleteRedirection(r.id)} style={btnDanger} title="Eliminar">🗑️</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Home ── */}
            {activeTab === 'home' && config && (
              <HomeTab config={config} setField={setField} saving={saving} onSave={handleSaveConfig} />
            )}

            {/* ── Productos ── */}
            {activeTab === 'productos' && config && (
              <ProductosTab config={config} setField={setField} saving={saving} onSave={handleSaveConfig} />
            )}

            {/* ── Categorías ── */}
            {activeTab === 'categorias' && config && (
              <CategoriasTab config={config} setField={setField} saving={saving} onSave={handleSaveConfig} />
            )}

            {/* ── Páginas ── */}
            {activeTab === 'paginas' && config && (
              <PaginasTab config={config} setField={setField} saving={saving} onSave={handleSaveConfig} />
            )}

            {/* ── Técnico / Auditoría — proximamente ── */}
            {activeTab === 'tecnico' && (
              <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚡</div>
                <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>Técnico</h3>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 16px' }}>Análisis de rendimiento y Core Web Vitals</p>
                <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>LCP</span>
                  <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>FID</span>
                  <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>CLS</span>
                  <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>TTFB</span>
                </div>
              </div>
            )}
            {activeTab === 'auditoria' && (
              <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔎</div>
                <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>Auditoría SEO</h3>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 16px' }}>Auditoría automática de SEO on-page</p>
                <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>Meta tags</span>
                  <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>Headings</span>
                  <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>Imágenes</span>
                  <span style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>Links</span>
                </div>
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
