import Head from 'next/head'
import Script from 'next/script'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { NotificationsButton, NotificationsPanel } from './NotificationsSystem'
import NotificationsProvider from './NotificationsProvider'

export default function Layout({ children, title = 'Sistema KOND', currentPage = '' }) {
  const [theme, setTheme] = useState('dark')
  const [showNotifications, setShowNotifications] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.body.setAttribute('data-theme', savedTheme)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.body.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const openPublicCatalog = () => {
    window.open('/catalog', '_blank', 'noopener,noreferrer')
  }

  const navigationItems = [
    { id: 'productos', icon: '', label: 'Productos', href: '/products' },
    { id: 'metricas', icon: '', label: 'Métricas', href: '/dashboard' },
    { id: 'calendario', icon: '', label: 'Calendario', href: '/calendar' },
    { id: 'finanzas', icon: '', label: 'Finanzas', href: '/finanzas' },
    { id: 'base-datos', icon: '', label: 'Base de datos', href: '/database' },
    { id: 'pedidos', icon: '', label: 'Pedidos', href: '/pedidos-catalogo' },
    { id: 'marketing', icon: '', label: 'Marketing', href: '/marketing' },
    { id: 'mi-cuenta', icon: '', label: 'Mi cuenta', href: '/user' }
  ]

  return (
    <NotificationsProvider>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>

      <Script 
        src="https://cdn.jsdelivr.net/npm/chart.js"
        strategy="afterInteractive"
      />

      <div style={{ minHeight: '100vh' }}>
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <div className="logo">KOND</div>
            <nav className="nav" role="navigation" aria-label="Navegación principal">
              <a href="#" onClick={openPublicCatalog} className="nav-item" aria-label="Abrir Catálogo Público en nueva página">
                Catálogo Público
              </a>
              <Link href="/home" className="nav-item" target="_blank" rel="noopener noreferrer" aria-label="Abrir Home en nueva página">
                Home
              </Link>
            </nav>
          </div>
          <div className="topbar-right">
            <NotificationsButton />
            <NotificationsPanel />
            <button className="icon-btn-vertical" id="btnMiCuenta" title="Mi Cuenta" data-section="mi-cuenta">
              <span className="icon"></span>
              <span className="label">Mi Cuenta</span>
            </button>
            <button className="icon-btn theme-toggle" onClick={toggleTheme} title="Cambiar tema">
              {theme === 'dark' ? '' : ''}
            </button>
            <button className="icon-btn-vertical" id="btnCerrarSesionTopbar" title="Cerrar Sesión">
              <span className="icon"></span>
              <span className="label">Cerrar</span>
            </button>
          </div>
        </header>

        <div style={{ display: 'flex' }}>
          {/* SIDEBAR */}
          <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} aria-label="Barra lateral de navegación">
            <div className="side-brand"></div>
            <nav className="side-nav">
              {navigationItems.map((item) => (
                <Link key={item.id} href={item.href} className={`side-link ${currentPage === item.id ? 'active' : ''}`}>
                  <span className="icon">{item.icon}</span>
                  <span className="label">{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>

          {/* CONTENIDO PRINCIPAL */}
          <main className="container main-with-sidebar" role="main">
            {children}
          </main>
        </div>
      </div>
    </NotificationsProvider>
  )
}
