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
        <div className="login-icon">
          <span>🔐</span>
        </div>
        <h1>Panel de Administración</h1>
        <p className="admin-subtitle">Acceso exclusivo para administradores</p>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="email">
              <span className="label-icon">📧</span>
              Email
            </label>
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
            <label htmlFor="password">
              <span className="label-icon">🔑</span>
              Contraseña
            </label>
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
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="admin-login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              <>
                <span className="btn-icon">→</span>
                Acceder al Panel
              </>
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <p>¿No eres administrador?</p>
          <a href="/" className="client-link">
            <span>🏠</span>
            Ir al catálogo de productos
          </a>
        </div>
      </div>

      <style jsx>{`
        .admin-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .admin-login-container::before {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          border-radius: 50%;
          top: -200px;
          right: -200px;
          animation: float 8s ease-in-out infinite;
        }

        .admin-login-container::after {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
          border-radius: 50%;
          bottom: -150px;
          left: -150px;
          animation: float 10s ease-in-out infinite reverse;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-20px) scale(1.05);
          }
        }

        .admin-login-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 48px 40px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
          width: 100%;
          max-width: 440px;
          text-align: center;
          position: relative;
          z-index: 1;
          animation: slideIn 0.5s ease-out;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
        }

        .admin-login-card h1 {
          color: #1f2937;
          margin-bottom: 8px;
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .admin-subtitle {
          color: #6b7280;
          margin-bottom: 36px;
          font-size: 0.95rem;
          font-weight: 400;
        }

        .admin-login-form {
          text-align: left;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-group label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: #374151;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .label-icon {
          font-size: 1rem;
          line-height: 1;
        }

        .form-group input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          transition: all 0.3s ease;
          background: #f9fafb;
          color: #1f2937;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }

        .form-group input:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .form-group input::placeholder {
          color: #9ca3af;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: #dc2626;
          margin-bottom: 20px;
          font-size: 0.9rem;
          animation: shake 0.4s ease;
        }

        .error-icon {
          font-size: 1.1rem;
          line-height: 1;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }

        .admin-login-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          overflow: hidden;
        }

        .admin-login-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .admin-login-btn:hover:not(:disabled)::before {
          left: 100%;
        }

        .admin-login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
        }

        .admin-login-btn:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 10px rgba(59, 130, 246, 0.4);
        }

        .admin-login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .btn-icon {
          font-size: 1.2rem;
          line-height: 1;
          font-weight: bold;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .admin-login-footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .admin-login-footer p {
          color: #6b7280;
          margin-bottom: 12px;
          font-size: 0.9rem;
        }

        .client-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .client-link:hover {
          background: rgba(59, 130, 246, 0.08);
          transform: translateX(2px);
        }

        @media (max-width: 480px) {
          .admin-login-card {
            padding: 36px 28px;
          }

          .admin-login-card h1 {
            font-size: 1.5rem;
          }

          .login-icon {
            width: 70px;
            height: 70px;
            font-size: 2rem;
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