import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { getCurrentSession } from '../../utils/supabaseAuthV2'

function AdminPanel() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(null)
  const [lastAccess, setLastAccess] = useState(null)

  useEffect(() => {
    const loadUser = async () => {
      const session = await getCurrentSession()
      if (session?.user) {
        setCurrentUser({
          email: session.user.email,
          username: session.user.username || session.user.nombre,
          rol: session.user.rol || 'admin'
        })
        setLastAccess(new Date())
      }
    }
    loadUser()
  }, [])

  const openMainSystem = () => {
    window.open('/', '_blank', 'noopener,noreferrer')
  }

  const openHomePage = () => {
    window.open('/home', '_blank', 'noopener,noreferrer')
  }

  const navigateTo = (path) => {
    router.push(path)
  }

  return (
    <Layout title="Panel Administrativo - Sistema KOND">
      <div className="admin-panel-container">
        {/* Header */}
        <div className="admin-header">
          <div>
            <h1 className="admin-title">
              👤 Panel Administrativo
            </h1>
            <p className="admin-subtitle">
              Gestión y configuración del sistema
            </p>
          </div>
          <div className="admin-header-buttons">
            <button onClick={openHomePage} className="btn btn-secondary">
              🏠 Home <span className="btn-icon">↗</span>
            </button>
            <button onClick={openMainSystem} className="btn btn-primary">
              🏭 Sistema Principal <span className="btn-icon">↗</span>
            </button>
          </div>
        </div>

        {/* Información del Usuario */}
        {currentUser && (
          <div className="admin-card user-card">
            <div className="user-header">
              <div className="user-avatar">
                {getInitials(currentUser.username || currentUser.email)}
              </div>
              <div className="user-info">
                <h3 className="user-name">{currentUser.username || 'Administrador'}</h3>
                <p className="user-email">{currentUser.email}</p>
                <span className="user-badge">{getRolBadge(currentUser.rol)}</span>
              </div>
            </div>
            <div className="user-details">
              <div className="detail-item">
                <span className="detail-label">Último acceso</span>
                <span className="detail-value">
                  {lastAccess ? formatLastAccess(lastAccess) : '—'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Rol</span>
                <span className="detail-value">{formatRol(currentUser.rol)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Personalizar Catálogo */}
        <div className="admin-card">
          <h3 className="card-title">🎨 Personalizar Catálogo</h3>
          <p className="card-description">
            Personalizá los colores, textos y estilos del catálogo público, incluyendo el header, footer y banner.
          </p>
          <div className="card-actions">
            <button onClick={() => router.push('/admin/catalog-styles')} className="btn btn-primary">
              🎨 Personalizar Estilos
            </button>
          </div>
        </div>

        {/* Métodos de Pago */}
        <div className="admin-card">
          <h3 className="card-title">🛒 Configuración de Carrito</h3>
          <p className="card-description">
            Configurá los métodos de pago, datos de retiro y contacto disponibles en el catálogo público.
          </p>
          <div className="card-actions">
            <button onClick={() => router.push('/admin/payment-config')} className="btn btn-primary">
              ⚙️ Ir a Configuración
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-panel-container {
          padding: 24px;
          max-width: 800px;
          margin: 0 auto;
        }

        /* Header */
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          gap: 16px;
        }

        .admin-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--person-color);
          margin: 0 0 6px 0;
        }

        .admin-subtitle {
          color: var(--text-secondary);
          font-size: 0.95rem;
          margin: 0;
        }

        .admin-header-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }

        .btn:hover {
          opacity: 0.85;
          transform: translateY(-1px);
        }

        .btn-primary {
          background: var(--accent-blue);
          color: white;
        }

        .btn-secondary {
          background: var(--accent-secondary);
          color: white;
        }

        .btn-icon {
          font-size: 0.7rem;
        }

        /* Cards */
        .admin-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
        }

        .card-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }

        .card-description {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .card-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* User Card */
        .user-card {
          padding: 28px;
        }

        .user-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .user-avatar {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, var(--person-color), var(--accent-blue));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: white;
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }

        .user-email {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin: 0 0 8px 0;
        }

        .user-badge {
          background: var(--accent-blue);
          color: white;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-block;
        }

        .user-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-label {
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .detail-value {
          color: var(--text-primary);
          font-size: 0.95rem;
          font-weight: 500;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-panel-container {
            padding: 16px;
          }

          .admin-header {
            flex-direction: column;
            align-items: stretch;
          }

          .admin-title {
            font-size: 1.5rem;
          }

          .admin-header-buttons {
            justify-content: stretch;
          }

          .admin-header-buttons .btn {
            flex: 1;
            justify-content: center;
          }

          .user-details {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .user-avatar {
            width: 56px;
            height: 56px;
            font-size: 1.25rem;
          }
        }
      `}</style>
    </Layout>
  )
}

// Helpers
function getInitials(text) {
  if (!text) return '?'
  const parts = text.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return text.slice(0, 2).toUpperCase()
}

function getRolBadge(rol) {
  const badges = {
    admin: 'Administrador',
    super_admin: 'Super Admin',
    cliente: 'Cliente'
  }
  return badges[rol] || rol
}

function formatRol(rol) {
  const roles = {
    admin: 'Administrador',
    super_admin: 'Super Administrador',
    cliente: 'Cliente'
  }
  return roles[rol] || rol
}

function formatLastAccess(date) {
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default withAdminAuth(AdminPanel)
