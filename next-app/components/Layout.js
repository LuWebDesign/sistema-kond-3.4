import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { NotificationsButton, NotificationsPanel } from './NotificationsSystem'
import ConfirmDialog from './ConfirmDialog'
import { getCurrentSession, logout as supabaseLogout } from '../utils/supabaseAuthV2'

export default function Layout({ children, title = 'Sistema KOND' }) {
  const [theme, setTheme] = useState('dark')
  const [userInfo, setUserInfo] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.body.setAttribute('data-theme', savedTheme)

    // Cargar información del usuario logueado desde Supabase
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
        // Fallback: intentar cargar de localStorage (compatibilidad)
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
    } catch (error) {
      console.error('Error loading user info:', error)
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    try {
      // Cerrar sesión en Supabase
      await supabaseLogout()
      // Limpiar localStorage
      localStorage.removeItem('adminSession')
      setUserInfo(null)
      // Redirigir al login admin
      router.push('/admin/login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      // Limpiar de todas formas
      localStorage.removeItem('adminSession')
      setUserInfo(null)
      router.push('/admin/login')
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.body.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Overlay para cerrar sidebar en mobile */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 998,
              display: 'none'
            }}
            className="mobile-overlay"
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{
            width: 260,
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            transition: 'transform 0.3s ease',
            zIndex: 999
          }}
        >
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--person-color)',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            🏭 Sistema KOND
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }} onClick={() => setSidebarOpen(false)}>
            {/* Dashboard - Panel administrativo principal */}
            <Link href="/admin/dashboard" style={linkStyle}>
              🏠 Dashboard
            </Link>
            
            {/* Sección: Gestión Interna */}
            <div style={sectionDividerStyle}>
              Gestión Interna
            </div>
            
            <Link href="/admin/products" style={linkStyle}>
              🏷️ Productos
            </Link>
            
            <Link href="/admin/calendar" style={linkStyle}>
              📅 Calendario
            </Link>
            
            <Link href="/admin/database" style={linkStyle}>
              🗄️ Base de Datos
            </Link>
            
            {/* Sección: Catálogo y Ventas */}
            <div style={sectionDividerStyle}>
              Catálogo y Ventas
            </div>
            
            <a 
              href="/catalog" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{...linkStyle, display: 'flex', alignItems: 'center', gap: '8px'}}
            >
              🛍️ Catálogo Público
              <span style={{fontSize: '0.7rem', opacity: 0.7}}>↗</span>
            </a>
            
            <Link href="/admin/pedidos" style={linkStyle}>
              📦 Pedidos Internos
            </Link>
            
            <Link href="/admin/orders" style={linkStyle}>
              🛒 Pedidos Catálogo
            </Link>
            
            <Link href="/admin/metricas" style={linkStyle}>
              📊 Métricas
            </Link>
            
            <Link href="/admin/marketing" style={linkStyle}>
              🎯 Marketing
            </Link>

            {/* 'Finalizar Compra' moved to admin pages; removed from sidebar per request */}
            
            <Link href="/admin/finanzas" style={linkStyle}>
              💰 Finanzas
            </Link>
            
            {/* Sección: Administración */}
            <div style={sectionDividerStyle}>
              Administración
            </div>
            
            <Link href="/admin" style={linkStyle}>
              � Panel Admin
            </Link>
            
            <Link href="/admin/mi-cuenta" style={linkStyle}>
              👤 Mi Cuenta
            </Link>
            <div style={{ marginTop: 8 }}>
              {userInfo && (
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    color: 'var(--accent-red)',
                    border: '1.5px solid var(--accent-red)',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-red)11' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  🚪 Cerrar Sesión
                </button>
              )}
            </div>
          </nav>

          {/* Theme Toggle */}
          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
            <button
              onClick={toggleTheme}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'var(--bg-card)'
              }}
            >
              {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{
          flex: 1,
          background: 'var(--bg-primary)',
          overflow: 'auto',
          minHeight: '100vh',
          position: 'relative'
        }}>
          {/* Header con notificaciones y usuario */}
          <div 
            className="admin-header"
            style={{
              position: 'sticky',
              top: 0,
              right: 0,
              zIndex: 100,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              background: 'var(--bg-primary)',
              borderBottom: '1px solid var(--border-color)',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
            {/* Botón hamburguesa para mobile */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                display: 'none',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '8px',
                color: 'var(--text-primary)'
              }}
              className="hamburger-btn"
              aria-label="Toggle menu"
            >
              ☰
            </button>

            {/* Información del usuario */}
            <div 
              className="user-info"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.9rem'
              }}
            >
              {userInfo ? (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-secondary)'
                  }}>
                    <span style={{ color: 'var(--accent-green)' }}>🟢</span>
                    <span>Logueado como:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {userInfo.email || 'admin1'}
                    </strong>
                  </div>
                  <div style={{
                    color: 'var(--text-tertiary)',
                    fontSize: '0.8rem'
                  }}>
                    Desde: {userInfo.loginTime}
                    {userInfo.rememberSession && (
                      <span style={{ color: 'var(--accent-blue)', marginLeft: '8px' }}>
                        (7 días)
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div style={{
                  color: 'var(--text-tertiary)',
                  fontSize: '0.9rem'
                }}>
                  No logueado
                </div>
              )}
            </div>

            {/* Notificaciones */}
            <NotificationsButton target="admin" />
          </div>
          
          {children}
          <NotificationsPanel target="admin" />

          {/* Modal de confirmación para logout */}
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
      </div>
      
      {/* Variables CSS */}
      <style jsx global>{`
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

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          margin: 0;
          padding: 0;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        * {
          box-sizing: border-box;
        }

        /* Scrollbar personalizada */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: var(--bg-secondary);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }

        /* Animaciones suaves */
        a, button {
          transition: all 0.2s ease;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .sidebar {
            width: 240px !important;
            padding: 16px !important;
          }

          .admin-header {
            padding: 10px 12px !important;
            gap: 8px !important;
          }

          .user-info div:last-child {
            display: none !important;
          }
        }

        @media (max-width: 600px) {
          /* Mostrar botón hamburguesa en mobile */
          .hamburger-btn {
            display: block !important;
            margin-right: auto;
          }

          /* Sidebar como overlay deslizable */
          .sidebar {
            position: fixed !important;
            top: 0;
            left: 0;
            width: 280px !important;
            height: 100vh;
            z-index: 999;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
          }

          /* Sidebar abierto */
          .sidebar.open {
            transform: translateX(0);
          }

          /* Overlay visible en mobile */
          .mobile-overlay {
            display: block !important;
          }

          /* Ajustar main content en mobile */
          main {
            width: 100%;
          }

          /* Header más compacto */
          .admin-header {
            padding: 8px !important;
          }

          /* Ocultar información de usuario en mobile */
          .user-info {
            font-size: 0.75rem !important;
          }

          .user-info > div:first-child > span:not(:first-child):not(:last-child) {
            display: none !important;
          }
        }

        @media (max-width: 400px) {
          .user-info {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

// Estilos para enlaces del sidebar
const linkStyle = {
  padding: '10px 16px',
  borderRadius: '8px',
  color: 'var(--text-primary)',
  background: 'transparent',
  textDecoration: 'none',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '0.95rem',
  fontWeight: '500'
}

// Estilo para divisores de sección
const sectionDividerStyle = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginTop: '20px',
  marginBottom: '8px',
  paddingLeft: '16px',
  paddingBottom: '4px',
  borderBottom: '1px solid var(--border-color)'
}