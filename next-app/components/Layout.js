import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { NotificationsButton, NotificationsPanel } from './NotificationsSystem'
import NotificationsProvider from './NotificationsProvider'
import ConfirmDialog from './ConfirmDialog'
import { getCurrentSession, logout as supabaseLogout } from '../utils/supabaseAuthV2'

export default function Layout({ children, title = 'Sistema KOND' }) {
  const [theme, setTheme] = useState('dark')
  const [userInfo, setUserInfo] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
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
      router.push('/admin-login')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      // Limpiar de todas formas
      localStorage.removeItem('adminSession')
      setUserInfo(null)
      router.push('/admin-login')
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.body.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  return (
    <NotificationsProvider>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta charSet="utf-8" />
      </Head>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside style={{
          width: 260,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--person-color)',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            🏭 Sistema KOND
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Home - Redirige a la sección inicio de la página pública */}
            <Link href="/home#inicio" style={linkStyle}>
              🏠 Home
            </Link>
            
            {/* Sección: Gestión Interna */}
            <div style={sectionDividerStyle}>
              Gestión Interna
            </div>
            
            <Link href="/products" style={linkStyle}>
              🏷️ Productos
            </Link>
            
            <Link href="/calendar" style={linkStyle}>
              📅 Calendario
            </Link>
            
            <Link href="/database" style={linkStyle}>
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
            
            <Link href="/pedidos" style={linkStyle}>
              📦 Pedidos Internos
            </Link>
            
            <Link href="/pedidos-catalogo" style={linkStyle}>
              🛒 Pedidos Catálogo
            </Link>
            
            <Link href="/marketing" style={linkStyle}>
              🎯 Marketing
            </Link>
            
            {/* FINANZAS TEMPORALMENTE DESHABILITADO - EN RECONSTRUCCIÓN */}
            {/* <Link href="/finanzas" style={linkStyle}>
              💰 Finanzas
            </Link> */}
            
            {/* Sección: Administración */}
            <div style={sectionDividerStyle}>
              Administración
            </div>
            
            <Link href="/admin" style={linkStyle}>
              � Panel Admin
            </Link>
            
            <Link href="/mi-cuenta" style={linkStyle}>
              👤 Mi Cuenta
            </Link>
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
          <div style={{
            position: 'sticky',
            top: 0,
            right: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-color)'
          }}>
            {/* Información del usuario */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '0.9rem'
            }}>
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

            {/* Botón de cerrar sesión */}
            {userInfo && (
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#dc2626'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ef4444'
                }}
              >
                🚪 Cerrar Sesión
              </button>
            )}

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
          aside {
            width: 200px !important;
          }
        }

        @media (max-width: 600px) {
          aside {
            position: fixed !important;
            top: 0;
            left: -260px;
            width: 260px !important;
            height: 100vh;
            z-index: 1000;
            transition: left 0.3s ease;
          }
        }
      `}</style>
    </NotificationsProvider>
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