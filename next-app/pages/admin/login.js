import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { loginWithGoogle } from '../utils/supabaseAuthV2';
import { usePermissions } from '../utils/permissions';
import { createToast } from '../utils/catalogUtils';

export default function AdminLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { isAdmin } = usePermissions();

  // Redirigir si ya está logueado como admin
  useEffect(() => {
    if (isAdmin) {
      router.push('/admin/dashboard');
    }
  }, [isAdmin, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error, user } = await loginWithGoogle();

      if (error) {
        createToast('Error al iniciar sesión con Google', 'error');
        setIsLoading(false);
        return;
      }

      // Verificar que sea admin
      if (!user.rol || (user.rol !== 'admin' && user.rol !== 'super_admin')) {
        createToast('No tienes permisos de administrador', 'error');
        // Cerrar sesión
        localStorage.removeItem('currentUser');
        localStorage.removeItem('kond-user');
        setIsLoading(false);
        return;
      }

      createToast('Bienvenido al panel de administración', 'success');
      router.push('/admin/dashboard');

    } catch (error) {
      console.error('Error en login admin:', error);
      createToast('Error al iniciar sesión', 'error');
    }

    setIsLoading(false);
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <h1>🔐 Panel de Administración</h1>
        <p className="admin-subtitle">Acceso exclusivo para administradores autorizados</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <button
            type="submit"
            className="google-login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Iniciando sesión...' : '🔵 Iniciar sesión con Google'}
          </button>
        </form>

        <div className="admin-info">
          <p>⚠️ Solo usuarios con permisos de administrador pueden acceder</p>
        </div>
      </div>
    </div>
  );
}
            className="admin-login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Iniciando sesión...' : 'Acceder al Panel'}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>¿No eres administrador?</p>
          <a href="/" className="client-link">Ir al catálogo de productos</a>
        </div>
      </div>

      <style jsx>{`
        .admin-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .admin-login-card {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
          text-align: center;
        }

        .admin-login-card h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 2rem;
        }

        .admin-subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 0.9rem;
        }

        .admin-login-form {
          text-align: left;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #333;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.3s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .google-login-btn {
          width: 100%;
          padding: 14px;
          background: #4285f4;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .google-login-btn:hover:not(:disabled) {
          background: #3367d6;
        }

        .google-login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .admin-login-footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e1e5e9;
        }

        .admin-login-footer p {
          color: #666;
          margin-bottom: 10px;
          font-size: 0.9rem;
        }

        .client-link {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .admin-info {
          margin-top: 20px;
          padding: 15px;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
        }

        .admin-info p {
          color: #856404;
          margin: 0;
          font-size: 0.9rem;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}