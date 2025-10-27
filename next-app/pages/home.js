import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [rememberSession, setRememberSession] = useState(false);

  // Verificar sesión activa al cargar la página
  useEffect(() => {
    const checkSession = () => {
      try {
        const sessionData = localStorage.getItem('adminSession');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const now = new Date().getTime();
          const sessionDuration = session.sessionDuration || (24 * 60 * 60 * 1000); // Usar duración guardada o 24 horas por defecto

          if (now - session.timestamp < sessionDuration) {
            // Sesión válida, redirigir automáticamente
            router.push('/dashboard');
            return;
          } else {
            // Sesión expirada, limpiar
            localStorage.removeItem('adminSession');
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkSession();
  }, [router]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { email, password } = loginData;

      // Validación de credenciales
      if (email === 'admin1' && password === 'kond') {
        // Crear sesión con duración basada en la opción "Recordar sesión"
        const sessionDuration = rememberSession ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 días o 24 horas
        const sessionData = {
          email: email,
          timestamp: new Date().getTime(),
          isLoggedIn: true,
          rememberSession: rememberSession,
          sessionDuration: sessionDuration
        };

        localStorage.setItem('adminSession', JSON.stringify(sessionData));

        showCustomAlert('✅ Acceso Concedido', 'Redirigiendo al panel administrativo...', 'success', () => {
          router.push('/dashboard');
        });
      } else {
        showCustomAlert('❌ Credenciales Incorrectas', 'Usuario o contraseña inválidos. Verifica e intenta de nuevo.', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showCustomAlert('❌ Error', 'Ocurrió un error durante el inicio de sesión.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showCustomAlert = (title, message, type = 'info', callback = null) => {
    // Crear modal de alerta personalizado
    const alertModal = document.createElement('div');
    alertModal.className = 'custom-alert-modal';
    alertModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;

    const alertContent = document.createElement('div');
    alertContent.style.cssText = `
      background: linear-gradient(145deg, #1e293b 0%, #334155 100%);
      padding: 32px;
      border-radius: 16px;
      max-width: 400px;
      width: 90%;
      border: 1px solid rgba(148, 163, 184, 0.3);
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
      text-align: center;
      position: relative;
      animation: slideIn 0.3s ease;
    `;

    const colorMap = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    alertContent.innerHTML = `
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${colorMap[type]}; border-radius: 16px 16px 0 0;"></div>
      <div style="font-size: 2rem; margin-bottom: 16px;">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</div>
      <h3 style="color: #f8fafc; margin: 0 0 12px 0; font-size: 1.4rem; font-weight: 700;">${title}</h3>
      <p style="color: #cbd5e1; margin: 0 0 24px 0; line-height: 1.5;">${message}</p>
      <button onclick="this.parentElement.parentElement.remove(); ${callback ? `(${callback.toString()})()` : ''}" style="
        background: ${colorMap[type]};
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        min-width: 100px;
        transition: all 0.2s ease;
      " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        Aceptar
      </button>
    `;

    alertModal.appendChild(alertContent);
    document.body.appendChild(alertModal);

    // Auto close for success messages
    if (type === 'success' && callback) {
      setTimeout(() => {
        if (alertModal.parentElement) {
          alertModal.remove();
          callback();
        }
      }, 2000);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <Head>
        <title>KOND - Sistema de Gestión de Producción</title>
        <meta name="description" content="Sistema integral para gestión de producción láser, pedidos, finanzas y catálogo público. Optimiza tu negocio con KOND." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx global>{`
        /* Página pública profesional */
        body {
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #e2e8f0;
          line-height: 1.6;
          margin: 0;
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }

        /* Header */
        .header {
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 0;
        }
        .logo {
          font-weight: 800;
          font-size: 1.5rem;
          color: #3b82f6;
        }
        .nav-links {
          display: flex;
          gap: 24px;
          align-items: center;
        }
        .nav-link {
          color: #cbd5e1;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #3b82f6; }
        .btn-admin {
          background: #3b82f6;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn-admin:hover { background: #2563eb; }

        /* Hero */
        .hero {
          padding: 80px 0;
          text-align: center;
        }
        .hero h1 {
          font-size: 3.5rem;
          font-weight: 800;
          background: linear-gradient(to right, #3b82f6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 24px;
        }
        .hero p {
          font-size: 1.25rem;
          color: #94a3b8;
          max-width: 600px;
          margin: 0 auto 32px;
        }
        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary:hover { background: #2563eb; }
        .btn-secondary {
          background: transparent;
          color: #cbd5e1;
          padding: 12px 24px;
          border: 1px solid #475569;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        /* Features */
        .features {
          padding: 80px 0;
          background: rgba(30, 41, 59, 0.3);
        }
        .features h2 {
          text-align: center;
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 48px;
          color: #f8fafc;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
        }
        .feature-card {
          background: rgba(51, 65, 85, 0.5);
          padding: 32px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          transition: transform 0.2s;
        }
        .feature-card:hover { transform: translateY(-4px); }
        .feature-icon {
          font-size: 2rem;
          margin-bottom: 16px;
        }
        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 12px;
          color: #f8fafc;
        }
        .feature-card p {
          color: #94a3b8;
        }

        /* About */
        .about {
          padding: 80px 0;
        }
        .about-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        .about h2 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 24px;
          color: #f8fafc;
        }
        .about p {
          color: #94a3b8;
          margin-bottom: 16px;
        }
        .about-image {
          background: linear-gradient(45deg, #3b82f6, #06b6d4);
          height: 300px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 3rem;
        }

        /* Contact */
        .contact {
          padding: 80px 0;
          background: rgba(30, 41, 59, 0.3);
        }
        .contact h2 {
          text-align: center;
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 48px;
          color: #f8fafc;
        }
        .contact-form {
          max-width: 600px;
          margin: 0 auto;
        }
        .form-group {
          margin-bottom: 24px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #cbd5e1;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #475569;
          border-radius: 6px;
          background: rgba(51, 65, 85, 0.5);
          color: #e2e8f0;
          font-size: 16px;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
        }

        /* Footer */
        .footer {
          background: rgba(15, 23, 42, 0.8);
          padding: 40px 0;
          text-align: center;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
        }
        .footer p {
          color: #64748b;
          margin-bottom: 8px;
        }

        /* Modal Mejorado */
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        .modal.show {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          background: linear-gradient(145deg, #1e293b 0%, #334155 100%);
          padding: 40px;
          border-radius: 16px;
          width: 90%;
          max-width: 420px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          position: relative;
          animation: slideIn 0.3s ease;
        }
        .modal-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
          border-radius: 16px 16px 0 0;
        }
        .modal h3 {
          color: #f8fafc;
          margin: 0 0 8px 0;
          text-align: center;
          font-size: 1.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .modal h3::before {
          content: '🔐';
          font-size: 1.5rem;
        }
        .modal-subtitle {
          text-align: center;
          color: #94a3b8;
          margin-bottom: 32px;
          font-size: 0.9rem;
        }
        .form-group-modal {
          margin-bottom: 24px;
          position: relative;
        }
        .form-group-modal label {
          display: block;
          margin-bottom: 8px;
          color: #cbd5e1;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .form-group-modal input {
          width: 100%;
          padding: 16px 20px;
          border: 2px solid #475569;
          border-radius: 10px;
          background: rgba(51, 65, 85, 0.8);
          color: #e2e8f0;
          font-size: 16px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }
        .form-group-modal input:focus {
          outline: none;
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
        .modal-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 32px;
        }

        .btn-cancel {
          background: linear-gradient(145deg, #374151 0%, #4b5563 100%);
          color: white;
          padding: 14px 28px;
          border: 1px solid rgba(156, 163, 175, 0.3);
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 120px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-cancel::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s;
        }

        .btn-cancel:hover::before {
          left: 100%;
        }

        .btn-cancel:hover {
          background: linear-gradient(145deg, #4b5563 0%, #6b7280 100%);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
          border-color: rgba(156, 163, 175, 0.5);
        }

        .btn-cancel:active {
          transform: translateY(0);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .modal-actions .btn-primary {
          background: linear-gradient(145deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 14px 28px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 120px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .modal-actions .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .modal-actions .btn-primary:hover::before {
          left: 100%;
        }

        .modal-actions .btn-primary:hover {
          background: linear-gradient(145deg, #2563eb 0%, #1e40af 100%);
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(59, 130, 246, 0.4);
          border-color: rgba(59, 130, 246, 0.6);
        }

        .modal-actions .btn-primary:active {
          transform: translateY(0);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero h1 { font-size: 2.5rem; }
          .hero p { font-size: 1.1rem; }
          .cta-buttons { flex-direction: column; align-items: center; }
          .about-content { grid-template-columns: 1fr; }
          .nav-links { gap: 16px; }
          .header-content { flex-direction: column; gap: 16px; }
        }
      `}</style>

      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">KOND</div>
            <nav className="nav-links">
              <a href="#inicio" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('inicio'); }}>Inicio</a>
              <a href="#sobre" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('sobre'); }}>Sobre el Proyecto</a>
              <a href="#contacto" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('contacto'); }}>Contacto</a>
              <a href="/catalog" className="nav-link">Catálogo</a>
              <button className="btn-admin" onClick={() => setShowLoginModal(true)}>Acceso Admin</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="hero">
        <div className="container">
          <h1>Sistema KOND</h1>
          <p>Plataforma integral para gestión de producción láser, control de pedidos, finanzas y catálogo público. Optimiza tu negocio con herramientas profesionales.</p>
          <div className="cta-buttons">
            <a href="/catalog"><button className="btn-primary">Ver Catálogo</button></a>
            <button className="btn-secondary" onClick={() => scrollToSection('sobre')}>Conocer Más</button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Características Principales</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🏭</div>
              <h3>Gestión de Producción</h3>
              <p>Control completo de productos, medidas, tiempos de fabricación y calendarios de producción.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📦</div>
              <h3>Pedidos Inteligentes</h3>
              <p>Sistema avanzado de pedidos con estados, seguimiento y notificaciones automáticas.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Control Financiero</h3>
              <p>Registro de movimientos, cálculo de señas, balance en tiempo real y reportes detallados.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛒</div>
              <h3>Catálogo Público</h3>
              <p>Tienda online para clientes con carrito, métodos de pago y selección de fechas.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Métricas y Análisis</h3>
              <p>Dashboard con estadísticas de producción, ventas y rendimiento del negocio.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔧</div>
              <h3>Fácil de Usar</h3>
              <p>Interfaz intuitiva, sin instalaciones complejas. Funciona directamente en el navegador.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="about">
        <div className="container">
          <div className="about-content">
            <div>
              <h2>Sobre el Proyecto</h2>
              <p>KOND es un sistema de gestión integral diseñado específicamente para negocios de corte láser y producción personalizada.</p>
              <p>Desarrollado con tecnologías web modernas, combina la simplicidad de uso con funcionalidades avanzadas para optimizar todos los aspectos de tu negocio.</p>
              <p>Desde el control de inventario hasta la gestión financiera, KOND centraliza todas las operaciones en una plataforma unificada y accesible.</p>
            </div>
            <div className="about-image">
              📈
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="contact">
        <div className="container">
          <h2>Contacto</h2>
          <form className="contact-form" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            alert(`Gracias ${name}! Tu mensaje ha sido enviado. Te contactaremos pronto.`);
            e.target.reset();
          }}>
            <div className="form-group">
              <label htmlFor="name">Nombre</label>
              <input type="text" id="name" name="name" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="message">Mensaje</label>
              <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit" className="btn-primary" style={{width: '100%'}}>Enviar Mensaje</button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 KOND - Sistema de Gestión de Producción</p>
          <p>Desarrollado con tecnologías web modernas</p>
        </div>
      </footer>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="modal show" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Acceso Administrativo</h3>
            <div className="modal-subtitle">Ingresa tus credenciales para acceder al panel de administración</div>
            <form onSubmit={handleAdminLogin}>
              <div className="form-group-modal">
                <label htmlFor="adminEmail">Usuario</label>
                <input
                  type="text"
                  id="adminEmail"
                  value={loginData.email}
                  onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group-modal">
                <label htmlFor="adminPassword">Contraseña</label>
                <input
                  type="password"
                  id="adminPassword"
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  required
                />
              </div>
              <div className="form-group-modal" style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px'}}>
                <input
                  type="checkbox"
                  id="rememberSession"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  style={{width: '16px', height: '16px'}}
                />
                <label htmlFor="rememberSession" style={{margin: 0, fontSize: '0.9rem', color: '#cbd5e1', cursor: 'pointer'}}>
                  Recordar sesión (7 días)
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowLoginModal(false)}>
                  <span>❌</span>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isLoading}>
                  <span>🔑</span>
                  {isLoading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
