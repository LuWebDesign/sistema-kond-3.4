import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/router'
import { NotificationsButton, NotificationsPanel } from './NotificationsSystem'
import { createToast } from '../utils/catalogUtils'
import { getCatalogStyles, DEFAULT_STYLES } from '../utils/supabaseCatalogStyles'
import dynamic from 'next/dynamic'

  // Render the SectionSelector client-side only and only for /catalog routes.
const SectionSelector = dynamic(() => import('./SectionSelector'), { ssr: false, loading: () => null })

export default function PublicLayout({ children, title = 'Catálogo - KOND' }) {
  const [theme, setTheme] = useState('dark')
  const [currentUser, setCurrentUser] = useState(null)
  const [catalogStyles, setCatalogStyles] = useState(DEFAULT_STYLES)
  const router = useRouter()

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    // set both data-theme attribute and className to be compatible with different CSS selectors
    try {
      document.body.setAttribute('data-theme', savedTheme)
      document.body.className = savedTheme
    } catch (e) {
      // ignore if document.body is not available yet
    }
    // Cargar estado de usuario público (si existe)
    try {
      const u = localStorage.getItem('currentUser')
      if (u) setCurrentUser(JSON.parse(u))
    } catch (e) {
      // ignore
    }
    // Cargar estilos personalizados del catálogo
    getCatalogStyles().then(s => { if (s) setCatalogStyles(s) }).catch(() => {})
    // Escuchar actualizaciones en tiempo real desde el admin
    const onStylesUpdate = (e) => { if (e.detail) setCatalogStyles(prev => ({ ...prev, ...e.detail })) }
    window.addEventListener('catalogStyles:updated', onStylesUpdate)
    return () => window.removeEventListener('catalogStyles:updated', onStylesUpdate)
  }, [])

  const handleLogout = () => {
    try {
      localStorage.removeItem('currentUser')
      setCurrentUser(null)
      createToast('Sesión cerrada correctamente', 'success')
      // llevar al catálogo público
      router.push('/catalog')
    } catch (e) {
      console.error('Logout error', e)
      createToast('No se pudo cerrar sesión', 'error')
    }
  }

  // Sincronizar currentUser cuando cambia en la misma pestaña (ej: login/logout)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'currentUser') {
        try {
          setCurrentUser(e.newValue ? JSON.parse(e.newValue) : null)
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    // keep both attribute and class in sync for CSS compatibility
    try {
      document.body.setAttribute('data-theme', newTheme)
      document.body.className = newTheme
    } catch (e) {
      // ignore
    }
  }

  return (
    <>
      <title>{title}</title>

      {/* Banner superior personalizable */}
      {catalogStyles.bannerEnabled && catalogStyles.bannerText && (
        <div style={{
          padding: '8px 16px',
          background: catalogStyles.bannerBg || '#3b82f6',
          color: catalogStyles.bannerTextColor || '#ffffff',
          textAlign: 'center',
          fontWeight: 500,
          fontSize: '0.9rem',
          zIndex: 200,
          position: 'relative'
        }}>
          {catalogStyles.bannerText}
        </div>
      )}
      
      <div style={{
        minHeight: '100vh',
        background: catalogStyles.catalogBg || 'var(--bg-primary)',
        color: catalogStyles.catalogTextColor || 'var(--text-primary)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Header público */}
        <header style={{
          background: catalogStyles.headerBg || 'var(--bg-card)',
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <Link href="/catalog" style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: catalogStyles.headerTextColor || 'var(--accent-blue)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {catalogStyles.logoUrl && (
                <img src={catalogStyles.logoUrl} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
              )}
              {catalogStyles.logoText || 'KOND'}
            </Link>
            
            <nav style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'center'
            }}>
              <Link href="/catalog" style={{
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s',
                ':hover': {
                  background: 'var(--bg-hover)'
                }
              }}>
                🛍️ Catálogo
              </Link>
              
              {/* Mi Cuenta / Iniciar sesión handled by SectionSelector — do not render in header to avoid duplication */}

              {/* Section selector removed from global header — rendered in catalog/product pages */}
            </nav>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            {/* Account links removed from header — SectionSelector provides account / login actions for catalog pages */}
            
            {/* Botón de tema */}
            <button
              onClick={toggleTheme}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'var(--bg-section)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Campanita de notificaciones (solo si el comprador está logueado) */}
            {currentUser && <NotificationsButton />}

          </div>
        </header>

        {/* Panel de notificaciones para el comprador */}
        {currentUser && <NotificationsPanel target="user" isPublic={true} />}

        {/* Section selector — render wrapper always to keep DOM stable between SSR and client. */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: catalogStyles.headerBg || 'transparent' }}>
          <div style={{ width: '100%', maxWidth: '960px' }}>
            {typeof window !== 'undefined' && router && router.asPath && router.asPath.startsWith('/catalog') ? <SectionSelector /> : null}
          </div>
        </div>

        {/* Contenedor con ancho fijo en móvil */}
        <div className="kond-viewport">
          {/* Main Content */}
          <main style={{
            minHeight: 'calc(100vh - 80px)',
            background: 'var(--bg-primary)'
          }}>
            {children}
          </main>

          {/* Footer público */}
          <footer style={{
            background: catalogStyles.footerBg || 'var(--bg-card)',
            borderTop: '1px solid var(--border-color)',
            padding: '32px 20px',
            textAlign: 'center',
            color: catalogStyles.footerTextColor || 'var(--text-secondary)'
          }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '32px',
              marginBottom: '24px'
            }}>
              <div>
                <h3 style={{
                  color: catalogStyles.footerTextColor || 'var(--text-primary)',
                  marginBottom: '16px',
                  fontSize: '1.1rem',
                  fontWeight: 600
                }}>
                  {catalogStyles.logoText || 'KOND'}
                </h3>
                <p style={{
                  fontSize: '0.9rem',
                  lineHeight: 1.6
                }}>
                  {catalogStyles.footerDescription || 'Tu tienda de confianza para productos de calidad. Comprá fácil y seguro desde la comodidad de tu hogar.'}
                </p>
              </div>
              
              <div>
                <h4 style={{
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  fontSize: '1rem',
                  fontWeight: 600
                }}>
                  Enlaces útiles
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <Link href="/catalog" style={{
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    transition: 'color 0.2s'
                  }}>
                    Catálogo de productos
                  </Link>
                  
                  {/* Solo mostrar Mi cuenta en menú móvil si no estamos en esa página */}
                  {title !== 'Mi Cuenta - KOND' && (
                    <Link href="/catalog/user" style={{
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.color = 'var(--accent-blue)'}
                    onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>
                      {currentUser ? 'Mi cuenta' : 'Iniciar sesión'}
                    </Link>
                  )}
                </div>
              </div>
              
              <div>
                <h4 style={{
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  fontSize: '1rem',
                  fontWeight: 600
                }}>
                  Contacto
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.9rem'
                }}>
                  <div>📱 {catalogStyles.footerPhone || '+54 11 1234-5678'}</div>
                  <div>📧 {catalogStyles.footerEmail || 'info@kond.com'}</div>
                  <div>📍 {catalogStyles.footerAddress || 'Buenos Aires, Argentina'}</div>
                </div>
              </div>
            </div>
            
            <div style={{
              paddingTop: '24px',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.8rem'
            }}>
              <p>© 2025 KOND. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
      </div>
      
      {/* Variables CSS */}
      <style jsx global>{`
        :root {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-card: #334155;
          --bg-section: #475569;
          --bg-input: #1e293b;
          --bg-hover: #475569;
          --text-primary: #f1f5f9;
          --text-secondary: #cbd5e1;
          --text-muted: #94a3b8;
          --border-color: #475569;
          --accent-blue: #3b82f6;
          --accent-secondary: #10b981;
          --person-color: #8b5cf6;
          --orders-color: #f59e0b;
          --products-color: #06b6d4;
          --calendar-color: #84cc16;
          --database-color: #f97316;
          --finances-color: #eab308;
          --account-color: #6366f1;
        }

        body.light {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-card: #f1f5f9;
          --bg-section: #e2e8f0;
          --bg-input: #ffffff;
          --bg-hover: #f1f5f9;
          --text-primary: #1e293b;
          --text-secondary: #475569;
          --text-muted: #64748b;
          --border-color: #e2e8f0;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.3s ease;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        a:hover {
          color: var(--accent-blue);
        }

        /* Responsive */
        @media (max-width: 768px) {
          header nav {
            display: none !important;
          }
          
          header > div:first-child {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
          /* Make the SectionSelector and main content respect a centered max-width on mobile */
          .kond-viewport main > div, .kond-viewport main > section, .kond-viewport main > article, .kond-viewport main > .user-orders-grid {
            max-width: 960px;
            margin: 0 auto;
            padding: 0 12px;
          }
          /* Ensure user order cards don't overflow the selector width */
          .user-orders-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
      `}</style>

      {/* Botón flotante de WhatsApp */}
      {catalogStyles.whatsappEnabled && catalogStyles.whatsappNumber && (
        <a
          href={`https://wa.me/${catalogStyles.whatsappNumber}?text=${encodeURIComponent(catalogStyles.whatsappMessage || '')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#25d366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(37,211,102,0.45)',
            zIndex: 1000,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            textDecoration: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,211,102,0.6)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,211,102,0.45)'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.121 1.524 5.855L.057 23.214a.75.75 0 0 0 .92.92l5.356-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.519-5.215-1.423l-.374-.224-3.878 1.061 1.06-3.88-.224-.374A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
        </a>
      )}

      {/* Override dinámico de variables CSS según estilos del admin */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          ${catalogStyles.accentColor ? `--accent-blue: ${catalogStyles.accentColor};` : ''}
          ${catalogStyles.accentColor ? `--accent-color: ${catalogStyles.accentColor};` : ''}
          ${catalogStyles.buttonBg ? `--kond-btn-bg: ${catalogStyles.buttonBg};` : ''}
          ${catalogStyles.buttonTextColor ? `--kond-btn-color: ${catalogStyles.buttonTextColor};` : ''}
          ${catalogStyles.buttonRadius ? `--kond-btn-radius: ${catalogStyles.buttonRadius}px;` : ''}
          ${catalogStyles.cardBg ? `--kond-card-bg: ${catalogStyles.cardBg};` : ''}
          ${catalogStyles.cardBorderColor ? `--kond-card-border: ${catalogStyles.cardBorderColor};` : ''}
          ${catalogStyles.cardRadius ? `--kond-card-radius: ${catalogStyles.cardRadius}px;` : ''}
          ${catalogStyles.badgeBg ? `--kond-badge-bg: ${catalogStyles.badgeBg};` : ''}
          ${catalogStyles.badgeTextColor ? `--kond-badge-color: ${catalogStyles.badgeTextColor};` : ''}
        }
        ${catalogStyles.cardBg ? `.product-card { background: ${catalogStyles.cardBg} !important; }` : ''}
        ${catalogStyles.cardBorderColor ? `.product-card { border-color: ${catalogStyles.cardBorderColor} !important; }` : ''}
        ${catalogStyles.cardRadius ? `.product-card { border-radius: ${catalogStyles.cardRadius}px !important; }` : ''}
        ${catalogStyles.badgeBg ? `.category-badge { background: ${catalogStyles.badgeBg} !important; border: none !important; }` : ''}
        ${catalogStyles.badgeTextColor ? `.category-badge, .category-badge span { color: ${catalogStyles.badgeTextColor} !important; }` : ''}
      ` }} />
    </>
  )
}
