import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { loginAdmin, getCurrentSession } from '../../utils/supabaseAuthV2';
import ConfirmModal from '../../components/ConfirmModal';

export default function AdminLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();

  // Redirigir si ya está logueado como admin
  useEffect(() => {
    const checkIfLoggedIn = async () => {
      try {
        const session = await getCurrentSession();
        if (session && session.user && session.user.rol === 'admin') {
          router.push('/admin/dashboard');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkIfLoggedIn();
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
      setIsLoading(false);
      setCountdown(3); // Reset countdown
      setShowWelcomeModal(true);

    } catch (error) {
      console.error('Error en login admin:', error);
      setError('Error al iniciar sesión');
      setIsLoading(false);
    }
  };

  // Efecto para manejar la cuenta regresiva del modal
  useEffect(() => {
    if (showWelcomeModal && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showWelcomeModal && countdown === 0) {
      handleWelcomeModalClose();
    }
  }, [showWelcomeModal, countdown]);

  const handleWelcomeModalClose = () => {
    setShowWelcomeModal(false);
    setCountdown(3);
    router.push('/admin/dashboard');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="login-header">
          <h1>🔐 Panel de Administración</h1>
          <p>Acceso exclusivo para administradores</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="admin@ejemplo.com"
              disabled={isLoading}
              autoComplete="email"
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
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Iniciando sesión...' : 'Acceder'}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/" className="back-link">← Volver al catálogo</a>
        </div>
      </div>

      <style jsx>{`
        .admin-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary, #f5f5f5);
          padding: 20px;
        }

        .admin-login-card {
          background: var(--bg-card, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          width: 100%;
          max-width: 420px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-header h1 {
          color: var(--text-primary, #1f2937);
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .login-header p {
          color: var(--text-secondary, #6b7280);
          margin: 0;
          font-size: 0.9rem;
        }

        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          color: var(--text-primary, #1f2937);
          font-weight: 500;
          font-size: 0.9rem;
        }

        .form-group input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          font-size: 15px;
          background: var(--bg-input, #fff);
          color: var(--text-primary, #1f2937);
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .form-group input:disabled {
          background: var(--bg-tertiary, #f9fafb);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .form-group input::placeholder {
          color: var(--text-muted, #9ca3af);
        }

        .error-message {
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 0.9rem;
        }

        .admin-login-btn {
          width: 100%;
          padding: 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .admin-login-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .admin-login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .admin-login-footer {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border-color, #e5e7eb);
          text-align: center;
        }

        .back-link {
          color: var(--text-secondary, #6b7280);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: var(--text-primary, #1f2937);
        }

        @media (max-width: 480px) {
          .admin-login-card {
            padding: 32px 24px;
          }

          .login-header h1 {
            font-size: 1.3rem;
          }
        }
      `}</style>

      {/* Modal de bienvenida */}
      <ConfirmModal
        open={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        title="¡Bienvenido Administrador!"
        message={`Has iniciado sesión correctamente en el panel de administración de KOND. Serás redirigido automáticamente en ${countdown} segundos.`}
        autoCloseMs={0}
        type="welcome"
        countdown={countdown}
      />
    </div>
  );
}