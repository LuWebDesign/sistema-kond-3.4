import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Marcar hidratación completa
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Evitar múltiples ejecuciones
    if (hasChecked) return;

    const checkSession = () => {
      // Solo ejecutar en el cliente (navegador) para evitar errores de SSR
      if (typeof window === 'undefined') return;

      try {
        const sessionData = localStorage.getItem('adminSession');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const now = new Date().getTime();
          const sessionDuration = session.sessionDuration || (24 * 60 * 60 * 1000);

          if (now - session.timestamp < sessionDuration) {
            // Usar replace en lugar de push para evitar problemas de navegación
            router.replace('/admin/dashboard');
            return;
          } else {
            localStorage.removeItem('adminSession');
          }
        }
        setIsLoading(false);
        setHasChecked(true);
      } catch (error) {
        console.error('Error checking session:', error);
        setIsLoading(false);
        setHasChecked(true);
      }
    };

    // Solo ejecutar en el cliente
    if (typeof window !== 'undefined') {
      checkSession();
    } else {
      setIsLoading(false);
      setHasChecked(true);
    }
  }, [hasChecked]);

  // Si no está hidratado, mostrar loading consistente
  if (!isHydrated) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#e2e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Si está cargando, mostrar loading
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#e2e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Scroll suavizado memoizado
  const scrollToSection = useCallback((sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Handler del formulario memoizado
  const handleContactSubmit = useCallback((e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    alert(`Gracias ${name}! Tu mensaje ha sido enviado. Te contactaremos pronto.`);
    e.target.reset();
  }, []);

  useEffect(() => {
    // Simplemente marcar como cargado
    setIsLoading(false);
  }, []);

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

        /* Pricing Section */
        .pricing {
          padding: 80px 0;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
        }
        .pricing h2 {
          text-align: center;
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 16px;
          color: #f8fafc;
        }
        .section-subtitle {
          text-align: center;
          font-size: 1.1rem;
          color: #94a3b8;
          margin-bottom: 48px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 32px;
          margin-bottom: 60px;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }
        .pricing-card {
          background: rgba(51, 65, 85, 0.5);
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.1);
          padding: 40px 32px;
          text-align: center;
          position: relative;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        .pricing-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          border-color: rgba(59, 130, 246, 0.3);
        }
        .pricing-card.featured {
          background: linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(51, 65, 85, 0.6) 100%);
          border: 2px solid #3b82f6;
          transform: scale(1.05);
        }
        .pricing-card.featured:hover {
          transform: translateY(-8px) scale(1.05);
        }
        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
          color: white;
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }
        .pricing-header {
          margin-bottom: 32px;
        }
        .pricing-header h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 16px;
        }
        .pricing-price {
          margin-bottom: 16px;
        }
        .price-amount {
          font-size: 3rem;
          font-weight: 800;
          color: #3b82f6;
          line-height: 1;
        }
        .price-period {
          font-size: 1rem;
          color: #94a3b8;
          font-weight: 500;
        }
        .pricing-description {
          color: #cbd5e1;
          font-size: 0.95rem;
          line-height: 1.5;
          margin: 0;
        }
        .pricing-features {
          text-align: left;
          margin-bottom: 32px;
        }
        .feature-item {
          color: #cbd5e1;
          margin-bottom: 12px;
          font-size: 0.9rem;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .feature-item:last-child {
          margin-bottom: 0;
        }
        .pricing-btn {
          width: 100%;
          padding: 14px 24px;
          background: transparent;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          color: #3b82f6;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 1rem;
        }
        .pricing-btn:hover {
          background: #3b82f6;
          color: white;
          transform: translateY(-2px);
        }
        .featured-btn {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }
        .featured-btn:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
        .pricing-footer {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
        }
        .pricing-footer p {
          color: #94a3b8;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .pricing-footer strong {
          color: #f8fafc;
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

        /* Admin modal removed: styles deleted to simplify the page */

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
          .pricing-grid { grid-template-columns: 1fr; gap: 24px; }
          .pricing-card { padding: 32px 24px; }
          .pricing-card.featured { transform: none; }
          .pricing-card.featured:hover { transform: translateY(-8px); }
          .price-amount { font-size: 2.5rem; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
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
              <a href="#precios" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('precios'); }}>Precios</a>
              <a href="#contacto" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection('contacto'); }}>Contacto</a>
              <Link href="/catalog" className="nav-link">Catálogo</Link>
              <button className="btn-admin" onClick={() => router.push('/admin/login')}>Acceso Admin</button>
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
            <Link href="/catalog" className="btn-primary">Ver Catálogo</Link>
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
          <form className="contact-form" onSubmit={handleContactSubmit}>
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

      {/* Pricing Section */}
      <section id="precios" className="pricing">
        <div className="container">
          <h2>Planes y Precios</h2>
          <p className="section-subtitle">Elige el plan perfecto para tu negocio</p>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Plan Básico</h3>
                <div className="pricing-price">
                  <span className="price-amount">$29</span>
                  <span className="price-period">/mes</span>
                </div>
                <p className="pricing-description">Perfecto para talleres pequeños que empiezan con la digitalización</p>
              </div>
              <div className="pricing-features">
                <div className="feature-item">✅ Gestión de hasta 100 pedidos/mes</div>
                <div className="feature-item">✅ Catálogo básico online</div>
                <div className="feature-item">✅ Control de inventario simple</div>
                <div className="feature-item">✅ Reportes básicos mensuales</div>
                <div className="feature-item">✅ Soporte por email</div>
                <div className="feature-item">✅ 1 usuario administrador</div>
              </div>
              <button className="pricing-btn" onClick={() => router.push('/admin/login')}>
                Comenzar Gratis
              </button>
            </div>

            <div className="pricing-card featured">
              <div className="pricing-badge">Más Popular</div>
              <div className="pricing-header">
                <h3>Plan Profesional</h3>
                <div className="pricing-price">
                  <span className="price-amount">$79</span>
                  <span className="price-period">/mes</span>
                </div>
                <p className="pricing-description">Ideal para negocios en crecimiento con operaciones medianas</p>
              </div>
              <div className="pricing-features">
                <div className="feature-item">✅ Pedidos ilimitados</div>
                <div className="feature-item">✅ Catálogo avanzado con personalización</div>
                <div className="feature-item">✅ Control de inventario avanzado</div>
                <div className="feature-item">✅ Reportes en tiempo real</div>
                <div className="feature-item">✅ Integración con WhatsApp</div>
                <div className="feature-item">✅ Hasta 5 usuarios</div>
                <div className="feature-item">✅ Soporte prioritario</div>
                <div className="feature-item">✅ API para integraciones</div>
              </div>
              <button className="pricing-btn featured-btn" onClick={() => router.push('/admin/login')}>
                Comenzar Ahora
              </button>
            </div>

            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Plan Empresarial</h3>
                <div className="pricing-price">
                  <span className="price-amount">$149</span>
                  <span className="price-period">/mes</span>
                </div>
                <p className="pricing-description">Para grandes operaciones que necesitan máxima eficiencia</p>
              </div>
              <div className="pricing-features">
                <div className="feature-item">✅ Todo del Plan Profesional</div>
                <div className="feature-item">✅ Usuarios ilimitados</div>
                <div className="feature-item">✅ Múltiples sucursales</div>
                <div className="feature-item">✅ Integración ERP completa</div>
                <div className="feature-item">✅ Analíticas avanzadas con IA</div>
                <div className="feature-item">✅ Soporte 24/7 telefónico</div>
                <div className="feature-item">✅ Consultoría personalizada</div>
                <div className="feature-item">✅ Backup y recuperación garantizada</div>
              </div>
              <button className="pricing-btn" onClick={() => router.push('/admin/login')}>
                Contactar Ventas
              </button>
            </div>
          </div>

          <div className="pricing-footer">
            <p>💡 <strong>Todos los planes incluyen:</strong> 14 días gratis, sin compromiso • Actualizaciones automáticas • Seguridad garantizada</p>
            <p>🔄 Cambia o cancela tu plan en cualquier momento</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2025 KOND - Sistema de Gestión de Producción</p>
          <p>Desarrollado con tecnologías web modernas</p>
        </div>
      </footer>

      {/* Admin login removed — se usa la ruta /admin-login */}
    </>
  );
}
