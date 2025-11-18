import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { usePermissions } from '../../utils/permissions';
import { logoutAdmin } from '../../utils/supabaseAuthV2';
import { createToast } from '../../utils/catalogUtils';
import { withAdminAuth } from '../../utils/adminAuth';

function AdminDashboard() {
  const router = useRouter();
  const { user, isSuperAdmin, isAdmin, permissions } = usePermissions();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0
  });

  // Verificar permisos de admin
  useEffect(() => {
    if (!isAdmin) {
      router.push('/admin/login');
      return;
    }

    // Cargar estadísticas (simuladas por ahora)
    loadStats();
  }, [isAdmin, router]);

  const loadStats = async () => {
    // Aquí cargarías estadísticas reales de Supabase
    // Por ahora usamos datos de ejemplo
    setStats({
      totalUsers: 150,
      totalOrders: 45,
      totalProducts: 89,
      totalRevenue: 12500
    });
  };

  const handleLogout = async () => {
    await logoutAdmin();
    createToast('Sesión de administrador cerrada correctamente', 'success');
    router.push('/admin/login');
  };

  if (!isAdmin) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-content">
          <h1>🏢 Panel de Administración</h1>
          <div className="user-info">
            <span>Bienvenido, {user?.nombre || user?.username}</span>
            <span className="user-role">
              {isSuperAdmin ? '👑 Super Admin' : '👨‍💼 Admin'}
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <nav className="admin-nav">
        <div className="nav-item active">
          <span>📊 Dashboard</span>
        </div>
        {permissions.includes('manage_users') && (
          <div className="nav-item" onClick={() => router.push('/admin/users')}>
            <span>👥 Usuarios</span>
          </div>
        )}
        {permissions.includes('manage_products') && (
          <div className="nav-item" onClick={() => router.push('/admin/products')}>
            <span>📦 Productos</span>
          </div>
        )}
        {permissions.includes('manage_orders') && (
          <div className="nav-item" onClick={() => router.push('/admin/orders')}>
            <span>📋 Pedidos</span>
          </div>
        )}
        {permissions.includes('manage_finances') && (
          <div className="nav-item" onClick={() => router.push('/admin/finances')}>
            <span>💰 Finanzas</span>
          </div>
        )}
        {isSuperAdmin && (
          <div className="nav-item" onClick={() => router.push('/admin/settings')}>
            <span>⚙️ Configuración</span>
          </div>
        )}
      </nav>

      <main className="admin-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>{stats.totalUsers}</h3>
              <p>Usuarios Totales</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-info">
              <h3>{stats.totalOrders}</h3>
              <p>Pedidos Activos</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-info">
              <h3>{stats.totalProducts}</h3>
              <p>Productos</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>${stats.totalRevenue.toLocaleString()}</h3>
              <p>Ingresos Totales</p>
            </div>
          </div>
        </div>

        <div className="recent-activity">
          <h2>Actividad Reciente</h2>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-time">Hace 5 min</span>
              <span className="activity-desc">Nuevo pedido recibido</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">Hace 12 min</span>
              <span className="activity-desc">Usuario registrado</span>
            </div>
            <div className="activity-item">
              <span className="activity-time">Hace 1 hora</span>
              <span className="activity-desc">Producto actualizado</span>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .admin-dashboard {
          min-height: 100vh;
          background: #f5f7fa;
        }

        .admin-header {
          background: white;
          border-bottom: 1px solid #e1e5e9;
          padding: 0;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-content h1 {
          color: #333;
          margin: 0;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .user-role {
          background: #667eea;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .logout-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .logout-btn:hover {
          background: #c82333;
        }

        .admin-nav {
          background: white;
          border-bottom: 1px solid #e1e5e9;
          padding: 0;
        }

        .nav-item {
          display: inline-block;
          padding: 15px 25px;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.3s;
        }

        .nav-item:hover {
          background: #f8f9fa;
        }

        .nav-item.active {
          border-bottom-color: #667eea;
          background: #f8f9fa;
        }

        .admin-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 30px 20px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: white;
          border-radius: 8px;
          padding: 25px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .stat-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f2f5;
          border-radius: 50%;
        }

        .stat-info h3 {
          margin: 0 0 5px 0;
          font-size: 2rem;
          color: #333;
        }

        .stat-info p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }

        .recent-activity {
          background: white;
          border-radius: 8px;
          padding: 25px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .recent-activity h2 {
          margin: 0 0 20px 0;
          color: #333;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .activity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f0f2f5;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-time {
          color: #666;
          font-size: 0.9rem;
        }

        .activity-desc {
          color: #333;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

export default withAdminAuth(AdminDashboard);