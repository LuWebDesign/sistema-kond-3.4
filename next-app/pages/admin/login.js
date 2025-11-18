import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { loginAdmin } from '../utils/supabaseAuthV2';

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Redirigir si ya está logueado como admin
  useEffect(() => {
    const adminUser = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('kond-admin') || 'null')
      : null;

    if (adminUser && (adminUser.rol === 'admin' || adminUser.rol === 'super_admin')) {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error, user } = await loginAdmin(formData.email, formData.password);

      if (error) {
        setError(error);
        setIsLoading(false);
        return;
      }

      // Usuario ya verificado en loginAdmin
      alert('¡Bienvenido al panel de administración!');
      router.push('/admin/dashboard');

    } catch (error) {
      console.error('Error en login admin:', error);
      setError('Error al iniciar sesión');
    }

    setIsLoading(false);
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <h1>🔐 Panel de Administración</h1>
        <p className="admin-subtitle">Acceso exclusivo para administradores</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="email">Email Administrador</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="admin@ejemplo.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Ingresa tu contraseña"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="error-message" style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
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

        .admin-login-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .admin-login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .admin-login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
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

        .client-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}