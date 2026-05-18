import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { NotificationsButton, NotificationsPanel } from './NotificationsSystem'
import ConfirmDialog from './ConfirmDialog'
import { getCurrentSession, logout as supabaseLogout } from '../utils/supabaseAuthV2'

// ── SVG icon helper ────────────────────────────────────────────────────────
function NavIcon({ d, size = 20 }) {
  const paths = Array.isArray(d) ? d : [d]
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {paths.map((path, i) => <path key={i} d={path} />)}
    </svg>
  )
}

// ── Nav link ──────────────────────────────────────────────────────────────
function NavLink({ href, icon, label, badge, external, router }) {
  const isActive = href === '/admin/dashboard'
    ? router.pathname === href
    : router.pathname.startsWith(href)

  const content = (
    <>
      {/* Icon always centered in the 64px collapsed strip */}
      <span className="nav-icon-wrap"><NavIcon d={icon} /></span>
      <span className="nav-label">{label}</span>
      {badge && <span className="nav-badge">{badge}</span>}
      {external && <span className="nav-ext">↗</span>}
    </>
  )

  const cls = `nav-link${isActive ? ' active' : ''}`

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    )
  }
  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  )
}

// ── Section divider ────────────────────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <div className="nav-section">
      <span className="nav-section-line" />
      <span className="nav-section-label">{label}</span>
    </div>
  )
}

// Get theme from body (already set by _document.js script) or localStorage
const getTheme = () => {
  if (typeof window === 'undefined') return 'dark'
  return document.body.getAttribute('data-theme') || localStorage.getItem('theme') || 'dark'
}

// ── Main component ─────────────────────────────────────────────────────────
export default function Layout({ children, title = 'Sistema KOND' }) {
  const [theme, setTheme] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setTheme(getTheme())
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      const session = await getCurrentSession()
      if (session?.user) {
        setUserInfo({
          email: session.user.email,
          username: session.user.username,
          rol: session.user.rol,
          loginTime: new Date().toLocaleString('es-AR')
        })
      } else {
        if (typeof window !== 'undefined') {
          const sessionData = localStorage.getItem('adminSession')
          if (sessionData) {
            const localSession = JSON.parse(sessionData)
            if (localSession.isLoggedIn || localSession.loggedIn) {
              setUserInfo({
                email: localSession.email || localSession.user?.email,
                username: localSession.user?.username,
                rol: localSession.user?.rol,
                loginTime: new Date(localSession.timestamp).toLocaleString('es-AR')
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user info:', error)
    }
  }

  const handleLogout = () => setShowLogoutConfirm(true)

  const confirmLogout = async () => {
    try {
      await supabaseLogout()
      if (typeof window !== 'undefined') localStorage.removeItem('adminSession')
      setUserInfo(null)
      setTimeout(() => router.push('/admin/login'), 500)
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      if (typeof window !== 'undefined') localStorage.removeItem('adminSession')
      setUserInfo(null)
      setTimeout(() => router.push('/admin/login'), 500)
    }
  }

  const toggleTheme = () => {
    if (!theme) return
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.body.setAttribute('data-theme', newTheme)
    if (typeof window !== 'undefined') localStorage.setItem('theme', newTheme)
  }

  const currentTheme = theme || 'dark'

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="nav-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">Sistema KOND</div>
            <div className="sidebar-logo-sub">Panel de Administración</div>
          </div>
        </div>

        {/* Nav */}
        <nav onClick={() => setSidebarOpen(false)}>
          <NavLink
            href="/admin/dashboard"
            icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            label="Dashboard"
            router={router}
          />

          {/* ── Gestión Interna ── */}
          <SectionDivider label="Gestión Interna" />
          <NavLink href="/admin/products" icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" label="Productos" router={router} />
          <NavLink href="/admin/cotizaciones" icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" label="Cotizaciones Corte" router={router} />
          <NavLink href="/admin/calendar" icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" label="Calendario" router={router} />
          <NavLink href="/admin/database" icon="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" label="Base de Datos" router={router} />

          {/* ── Tienda Online ── */}
          <SectionDivider label="Tienda Online" />
          <NavLink href="/admin/website" icon="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" label="Website" badge="Nuevo" router={router} />
          <NavLink href="/catalog" icon="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" label="Catálogo Público" external router={router} />
          <NavLink href="/admin/orders" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" label="Pedidos" router={router} />
          <NavLink href="/admin/clientes" icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" label="Clientes" router={router} />
          <NavLink href="/admin/marketing" icon="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" label="Marketing" router={router} />
          <NavLink href="/admin/metricas" icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" label="Analytics" router={router} />

          {/* ── Operaciones ── */}
          <SectionDivider label="Operaciones" />
          <NavLink href="/admin/pedidos" icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" label="Pedidos Internos" router={router} />
          <NavLink href="/admin/finanzas" icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" label="Finanzas" router={router} />
          <NavLink href="/admin/materiales" icon="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" label="Materiales" router={router} />
          <NavLink href="/admin/logistica" icon="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" label="Logística" router={router} />

          {/* ── Crecimiento ── */}
          <SectionDivider label="Crecimiento" />
          <NavLink href="/admin/seo" icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" label="SEO" router={router} />

          {/* ── Sistema ── */}
          <SectionDivider label="Sistema" />
          <NavLink href="/admin/panel" icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" label="Usuarios" router={router} />
          <NavLink href="/admin/roles" icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" label="Roles y Permisos" router={router} />
          <NavLink href="/admin/pagos" icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" label="Pagos" router={router} />
          <NavLink href="/admin/mi-cuenta" icon="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" label="Mi Cuenta" router={router} />
        </nav>

        {/* Bottom buttons */}
        <div className="sidebar-bottom">
          {userInfo && (
            <button className="sidebar-btn sidebar-btn-danger" onClick={handleLogout}>
              <span className="nav-icon-wrap">
                <NavIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </span>
              <span className="nav-label">Cerrar Sesión</span>
            </button>
          )}
          <button className="sidebar-btn" onClick={toggleTheme}>
            <span className="nav-icon-wrap">
              <NavIcon d={currentTheme === 'dark'
                ? 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
                : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
              } />
            </span>
            <span className="nav-label">{currentTheme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <div className="admin-header">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hamburger-btn"
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <div className="user-info">
            {userInfo ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-green)' }}>🟢</span>
                  <span>Logueado como:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {userInfo.email || 'admin1'}
                  </strong>
                </div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                  Desde: {userInfo.loginTime}
                  {userInfo.rememberSession && (
                    <span style={{ color: 'var(--accent-blue)', marginLeft: '8px' }}>(7 días)</span>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No logueado</div>
            )}
          </div>

          <NotificationsButton target="admin" />
        </div>

        {children}
        <NotificationsPanel target="admin" />

        <ConfirmDialog
          open={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={confirmLogout}
          title="Cerrar sesión"
          message="¿Estás seguro de que quieres cerrar sesión?"
          confirmText="Cerrar sesión"
          cancelText="Cancelar"
          type="warning"
        />
      </main>

      <style jsx global>{`
        /* ── CSS Variables ─────────────────────────── */
        :root {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-card: #334155;
          --bg-tertiary: #475569;
          --bg-hover: #475569;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-tertiary: #64748b;
          --text-muted: #64748b;
          --border-color: #334155;
          --accent-blue: #3b82f6;
          --accent-green: #10b981;
          --accent-orange: #f59e0b;
          --accent-red: #ef4444;
          --person-color: #60a5fa;
          --shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          --sidebar-w: 64px;
          --sidebar-expanded-w: 260px;
        }

        [data-theme="light"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-card: #f1f5f9;
          --bg-tertiary: #e2e8f0;
          --bg-hover: #e2e8f0;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-tertiary: #64748b;
          --text-muted: #94a3b8;
          --border-color: #e2e8f0;
          --accent-blue: #3b82f6;
          --accent-green: #10b981;
          --accent-orange: #f59e0b;
          --accent-red: #ef4444;
          --person-color: #2563eb;
          --shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        /* ── Base ──────────────────────────────────── */
        * { box-sizing: border-box; }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          margin: 0;
          padding: 0;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        a, button { transition: all 0.2s ease; }

        /* ── Scrollbar ─────────────────────────────── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--bg-secondary); }
        ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

        /* ── Sidebar base ──────────────────────────── */
        .sidebar {
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          overflow-y: auto;
          z-index: 999;
        }

        /* Desktop: fixed, collapsed → expand on hover */
        @media (min-width: 601px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: var(--sidebar-w);
            transition: width 0.25s ease;
          }
          .sidebar:hover {
            width: var(--sidebar-expanded-w);
          }

          /* Collapsed: ocultar todos los textos */
          .sidebar .nav-label,
          .sidebar .nav-badge,
          .sidebar .nav-ext,
          .sidebar .nav-section-label,
          .sidebar .sidebar-logo-text {
            max-width: 0;
            overflow: hidden;
            opacity: 0;
            transition: max-width 0.25s ease, opacity 0.15s ease;
          }
          /* Expanded: revelar textos */
          .sidebar:hover .nav-label,
          .sidebar:hover .nav-badge,
          .sidebar:hover .nav-ext,
          .sidebar:hover .nav-section-label,
          .sidebar:hover .sidebar-logo-text {
            max-width: 200px;
            opacity: 1;
          }
        }

        /* ── Icon wrapper — always centered in 64px ── */
        .nav-icon-wrap {
          width: var(--sidebar-w);       /* 64px — same as collapsed sidebar */
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Logo area ─────────────────────────────── */
        .sidebar-logo {
          display: flex;
          align-items: center;
          min-width: var(--sidebar-expanded-w);
          border-bottom: 1px solid var(--border-color);
          padding: 4px 0;
          margin-bottom: 8px;
        }
        .sidebar-logo-text {
          white-space: nowrap;
          padding-right: 12px;
        }
        .sidebar-logo-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--person-color);
          line-height: 1.2;
        }
        .sidebar-logo-sub {
          font-size: 0.62rem;
          font-weight: 400;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* ── Nav ───────────────────────────────────── */
        .sidebar nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1px;
          padding: 0 0 8px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 3px 0;
          border-radius: 0;
          text-decoration: none;
          color: var(--text-secondary);
          min-width: var(--sidebar-expanded-w);
          white-space: nowrap;
          font-size: 0.9rem;
          font-weight: 500;
          position: relative;
        }

        /* Highlight pill — only on the icon+label area */
        .nav-link::before {
          content: '';
          position: absolute;
          top: 2px;
          bottom: 2px;
          left: 8px;
          right: 8px;
          border-radius: 8px;
          background: transparent;
          transition: background 0.15s;
        }
        .nav-link:hover::before {
          background: var(--bg-hover);
        }
        .nav-link.active::before {
          background: rgba(59, 130, 246, 0.15);
        }
        .nav-link:hover,
        .nav-link.active {
          color: var(--text-primary);
        }
        .nav-link.active {
          color: var(--accent-blue);
        }

        /* Make icon and label sit above the ::before pill */
        .nav-link .nav-icon-wrap,
        .nav-link .nav-label,
        .nav-link .nav-badge,
        .nav-link .nav-ext {
          position: relative;
          z-index: 1;
        }

        .nav-label {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 12px;
        }

        .nav-ext {
          font-size: 0.7rem;
          opacity: 0.6;
          padding-right: 12px;
        }

        .nav-badge {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 4px;
          background: var(--accent-green);
          color: #fff;
          letter-spacing: 0.03em;
          white-space: nowrap;
          margin-right: 12px;
        }

        /* ── Section dividers ──────────────────────── */
        .nav-section {
          display: flex;
          align-items: center;
          min-width: var(--sidebar-expanded-w);
          padding: 16px 0 2px;
          overflow: hidden;
        }

        /* The short horizontal tick visible when collapsed */
        .nav-section-line {
          width: var(--sidebar-w);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .nav-section-line::after {
          content: '';
          display: block;
          width: 24px;
          height: 1px;
          background: var(--border-color);
        }

        .nav-section-label {
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.07em;
          white-space: nowrap;
          padding-right: 12px;
        }

        /* ── Bottom buttons ────────────────────────── */
        .sidebar-bottom {
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: var(--sidebar-expanded-w);
          padding: 8px 0;
        }

        .sidebar-btn {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 3px 0;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          width: 100%;
          white-space: nowrap;
          text-align: left;
          position: relative;
        }
        .sidebar-btn::before {
          content: '';
          position: absolute;
          top: 2px;
          bottom: 2px;
          left: 8px;
          right: 8px;
          border-radius: 8px;
          background: transparent;
          transition: background 0.15s;
        }
        .sidebar-btn:hover::before {
          background: var(--bg-hover);
        }
        .sidebar-btn:hover { color: var(--text-primary); }
        .sidebar-btn-danger { color: var(--accent-red); }
        .sidebar-btn-danger:hover { color: var(--accent-red); }
        .sidebar-btn-danger:hover::before {
          background: rgba(239, 68, 68, 0.1);
        }
        .sidebar-btn .nav-icon-wrap,
        .sidebar-btn .nav-label {
          position: relative;
          z-index: 1;
        }

        /* ── Main content ──────────────────────────── */
        .main-content {
          background: var(--bg-primary);
          overflow: auto;
          min-height: 100vh;
          position: relative;
        }
        @media (min-width: 601px) {
          .main-content { margin-left: var(--sidebar-w); }
        }

        /* ── Header ────────────────────────────────── */
        .admin-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: var(--bg-primary);
          border-bottom: 1px solid var(--border-color);
          gap: 12px;
          flex-wrap: wrap;
        }

        .hamburger-btn {
          display: none;
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 8px;
          color: var(--text-primary);
          margin-right: auto;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.9rem;
        }

        /* ── Mobile overlay ────────────────────────── */
        .mobile-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 998;
        }

        /* ── Responsive ────────────────────────────── */
        @media (max-width: 768px) {
          .admin-header { padding: 10px 12px; gap: 8px; }
          .user-info div:last-child { display: none; }
        }

        @media (max-width: 600px) {
          .hamburger-btn { display: block; }
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            width: 280px;
            height: 100vh;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
          }
          .sidebar.open { transform: translateX(0); }
          .admin-header { padding: 8px; }
          .user-info { font-size: 0.75rem; }
          .user-info > div:first-child > span:not(:first-child):not(:last-child) { display: none; }
        }

        @media (max-width: 400px) {
          .user-info { display: none; }
        }

        /* ── Link visited state ────────────────────── */
        .sidebar a,
        .sidebar a:visited {
          color: var(--text-secondary);
          text-decoration: none;
        }
      `}</style>
    </>
  )
}
