// next-app/pages/admin/website/index.js
// Website landing page — links to sub-pages for managing storefront content.

import { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import withAdminAuth from '../../../components/withAdminAuth'

// ─── Styles ──────────────────────────────────────────────────────────────────

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  padding: '24px',
  cursor: 'pointer',
  transition: 'all 0.15s',
  textDecoration: 'none',
  color: 'inherit',
  display: 'block',
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
  marginBottom: '0',
}

const PAGES = [
  {
    href: '/admin/website/categorias',
    icon: '📂',
    title: 'Categorías',
    desc: 'Ordená y controlá la visibilidad de las categorías en la home.',
  },
  {
    href: '/admin/website/destacados',
    icon: '⭐',
    title: 'Destacados',
    desc: 'Elegí qué productos aparecen en la sección Hero de la home.',
  },
  {
    href: '/admin/website/banner',
    icon: '📢',
    title: 'Banner',
    desc: 'Configurá los mensajes del banner de anuncios superior.',
  },
  {
    href: '/admin/website/secciones',
    icon: '🧩',
    title: 'Secciones',
    desc: 'Activá, desactivá y reordená las secciones de la home.',
  },
]

function WebsiteLanding() {
  const [hovered, setHovered] = useState(null)

  return (
    <Layout title="Website — Sistema KOND">
      <div style={{ padding: '24px', maxWidth: '900px' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>🖥️ Website</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Controlá el contenido y la estructura de la página de inicio pública.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {PAGES.map((p) => (
            <a
              key={p.href}
              href={p.href}
              style={{
                ...card,
                background: hovered === p.href ? 'var(--accent-blue)11' : 'var(--bg-card)',
                borderColor: hovered === p.href ? 'var(--accent-blue)44' : 'var(--border-color)',
              }}
              onMouseEnter={() => setHovered(p.href)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ fontSize: '2rem', lineHeight: 1 }}>{p.icon}</span>
                <div>
                  <h2 style={sectionTitle}>{p.title}</h2>
                  <p style={sectionSubtitle}>{p.desc}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Quick link to public site */}
        <div style={{ marginTop: '32px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>Vista previa del sitio:</p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'var(--accent-blue)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
            Ver sitio público ↗
          </a>
        </div>
      </div>
    </Layout>
  )
}

export default withAdminAuth(WebsiteLanding)
