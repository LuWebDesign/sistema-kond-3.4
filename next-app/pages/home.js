import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [currentDemoView, setCurrentDemoView] = useState('inicio');
  const [demoCart, setDemoCart] = useState([]);
  const [adminCredentials, setAdminCredentials] = useState({
    email: '',
    password: ''
  });

  // Products for demo
  const demoProducts = [
    { id: 1, name: 'Caja Premium', price: 2500, image: '📦' },
    { id: 2, name: 'Porta Retratos', price: 1800, image: '🖼️' },
    { id: 3, name: 'Llavero Premium', price: 350, image: '🔑' },
    { id: 4, name: 'Etiquetas Set', price: 800, image: '🏷️' }
  ];

  const handleAdminLogin = (e) => {
    e.preventDefault();
    
    if (adminCredentials.email === 'admin1' && adminCredentials.password === 'kond') {
      // Establecer sesión de admin
      localStorage.setItem('adminSession', JSON.stringify({
        loggedIn: true,
        timestamp: Date.now(),
        email: adminCredentials.email
      }))
      
      showCustomAlert('✅ Acceso Concedido', 'Redirigiendo al panel administrativo...', 'success', () => {
        router.push('/admin');
      });
    } else {
      showCustomAlert('❌ Credenciales Incorrectas', 'Usuario o contraseña inválidos. Verifica e intenta de nuevo.', 'error');
    }
  };

  const showCustomAlert = (title, message, type = 'info', callback = null) => {
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
      <button onclick="closeCustomAlert()" style="
        background: ${colorMap[type]};
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        min-width: 100px;
        transition: all 0.2s ease;
      ">
        Aceptar
      </button>
    `;
    
    alertModal.appendChild(alertContent);
    document.body.appendChild(alertModal);
    
    window.closeCustomAlert = function() {
      alertModal.remove();
      if (callback) callback();
    };
    
    if (type === 'success' && callback) {
      setTimeout(() => {
        window.closeCustomAlert();
      }, 2000);
    }
  };

  const addToCartDemo = (name, price) => {
    const existingItem = demoCart.find(item => item.name === name);
    if (existingItem) {
      setDemoCart(prev => prev.map(item => 
        item.name === name ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setDemoCart(prev => [...prev, { name, price, quantity: 1 }]);
    }
  };

  const updateQuantityDemo = (name, change) => {
    setDemoCart(prev => prev.map(item => {
      if (item.name === name) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const clearCartDemo = () => {
    setDemoCart([]);
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

      <div className="home-page">
        {/* Header */}
        <header className="header">
          <div className="container">
            <div className="header-content">
              <div className="logo">KOND</div>
              <nav className="nav-links">
                <a href="#inicio" className="nav-link" onClick={() => scrollToSection('inicio')}>Inicio</a>
                <a href="#caracteristicas" className="nav-link" onClick={() => scrollToSection('caracteristicas')}>Características</a>
                <a href="#catalogo" className="nav-link" onClick={() => scrollToSection('catalogo')}>Catálogo</a>
                <a href="#sobre" className="nav-link" onClick={() => scrollToSection('sobre')}>Sobre</a>
                <a href="#contacto" className="nav-link" onClick={() => scrollToSection('contacto')}>Contacto</a>
                <button className="btn-admin" onClick={() => setShowAdminModal(true)}>Acceso Admin</button>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section id="inicio" className="hero">
          <div className="container">
            <h1>Sistema KOND</h1>
            <p>Gestión integral para tu negocio de producción láser. Administra productos, pedidos, finanzas y ofrece un catálogo profesional a tus clientes.</p>
            <div className="cta-buttons">
              <button className="btn-primary" onClick={() => router.push('/catalog')}>Ver Catálogo</button>
              <button className="btn-secondary" onClick={() => scrollToSection('sobre')}>Conocer Más</button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="caracteristicas" className="features">
          <div className="container">
            <h2>Características Principales</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Gestión de Productos</h3>
                <p>Administra tu inventario con control de costos, tiempos de producción y medidas personalizadas.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📦</div>
                <h3>Control de Pedidos</h3>
                <p>Seguimiento completo desde la creación hasta la entrega con estados personalizables.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💰</div>
                <h3>Análisis Financiero</h3>
                <p>Reportes detallados de ventas, costos y ganancias con métricas de rendimiento.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🛒</div>
                <h3>Catálogo Público</h3>
                <p>Tienda online profesional para que tus clientes realicen pedidos directamente.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>Responsive Design</h3>
                <p>Interfaz optimizada para computadoras, tablets y dispositivos móviles.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>Datos Seguros</h3>
                <p>Información almacenada localmente sin dependencia de servidores externos.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog Preview */}
        <section id="catalogo" className="catalog-preview">
          <div className="container">
            <div className="preview-header">
              <h2>Vista Previa del Catálogo</h2>
              <p>Experimenta cómo tus clientes interactúan con tu tienda online</p>
              <div className="preview-badges">
                <span className="badge">Carrito Inteligente</span>
                <span className="badge">Checkout Simplificado</span>
                <span className="badge">Responsive</span>
              </div>
            </div>

            <div className="catalog-demo">
              <div className="device-mockup">
                <div className="device-frame">
                  <div className="device-header">
                    <div className="device-controls">
                      <div className="control red"></div>
                      <div className="control yellow"></div>
                      <div className="control green"></div>
                    </div>
                    <div className="device-url">kond-catalog.com</div>
                    <div className="device-menu">☰</div>
                  </div>

                  <div className="demo-screen">
                    <div className="demo-header">
                      <div className="demo-brand">
                        <div className="brand-logo">K</div>
                        <span>KOND Store</span>
                      </div>
                      <div className="demo-nav">
                        <div 
                          className={`nav-demo-item ${currentDemoView === 'inicio' ? 'active' : ''}`}
                          onClick={() => setCurrentDemoView('inicio')}
                        >
                          Inicio
                        </div>
                        <div 
                          className={`nav-demo-item ${currentDemoView === 'catalogo' ? 'active' : ''}`}
                          onClick={() => setCurrentDemoView('catalogo')}
                        >
                          Productos
                        </div>
                        <div 
                          className={`nav-demo-item ${currentDemoView === 'carrito' ? 'active' : ''}`}
                          onClick={() => setCurrentDemoView('carrito')}
                        >
                          Carrito
                          {demoCart.length > 0 && (
                            <span className="cart-badge">{demoCart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="demo-content">
                      {currentDemoView === 'inicio' && (
                        <div className="demo-view">
                          <div className="hero-mini">
                            <h3>Bienvenido a KOND Store</h3>
                            <p>Productos de alta calidad fabricados con tecnología láser</p>
                            <button className="btn-demo primary" onClick={() => setCurrentDemoView('catalogo')}>
                              Explorar Productos
                            </button>
                          </div>
                        </div>
                      )}

                      {currentDemoView === 'catalogo' && (
                        <div className="demo-view">
                          <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Nuestros Productos</h3>
                          <div className="products-grid">
                            {demoProducts.map(product => (
                              <div key={product.id} className="product-card" onClick={() => addToCartDemo(product.name, product.price)}>
                                <div className="product-image">{product.image}</div>
                                <h4>{product.name}</h4>
                                <p className="price">${product.price}</p>
                                <button className="add-to-cart">Agregar al carrito</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {currentDemoView === 'carrito' && (
                        <div className="demo-view">
                          <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Tu Carrito</h3>
                          {demoCart.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#64748b' }}>Tu carrito está vacío</p>
                          ) : (
                            <div className="cart-items">
                              {demoCart.map((item, index) => (
                                <div key={index} className="cart-item">
                                  <span>{item.name}</span>
                                  <div className="quantity-controls">
                                    <button onClick={() => updateQuantityDemo(item.name, -1)}>-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantityDemo(item.name, 1)}>+</button>
                                  </div>
                                  <span>${item.price * item.quantity}</span>
                                </div>
                              ))}
                              <div className="cart-total">
                                <strong>Total: ${demoCart.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</strong>
                              </div>
                              <div className="cart-actions">
                                <button className="btn-demo secondary" onClick={clearCartDemo}>Vaciar</button>
                                <button className="btn-demo primary">Finalizar Compra</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button onClick={() => router.push('/catalog')} className="btn-demo secondary">
                Ver Catálogo Real
              </button>
              <button onClick={() => setShowAdminModal(true)} className="btn-demo secondary">
                Acceso Admin
              </button>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="sobre" className="about">
          <div className="container">
            <div className="about-content">
              <div>
                <h2>Sobre KOND</h2>
                <p>KOND es una solución integral diseñada específicamente para empresas de producción láser que buscan optimizar sus procesos y ofrecer una experiencia profesional a sus clientes.</p>
                <p>Nuestro sistema combina la gestión interna avanzada con un catálogo público elegante, permitiendo que tu negocio crezca de manera organizada y eficiente.</p>
                <p>Con KOND, puedes concentrarte en lo que mejor haces: crear productos excepcionales, mientras nosotros nos encargamos de la gestión.</p>
              </div>
              <div className="about-image">
                🎯
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contacto" className="contact">
          <div className="container">
            <h2 style={{ textAlign: 'center', marginBottom: '40px', color: '#f8fafc' }}>Contacto</h2>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <form onSubmit={(e) => {
                e.preventDefault();
                alert('Gracias por tu mensaje! Te contactaremos pronto.');
                e.target.reset();
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="text"
                    placeholder="Nombre"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #475569',
                      background: 'rgba(51, 65, 85, 0.5)',
                      color: '#f8fafc'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #475569',
                      background: 'rgba(51, 65, 85, 0.5)',
                      color: '#f8fafc'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <textarea
                    placeholder="Mensaje"
                    rows="5"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #475569',
                      background: 'rgba(51, 65, 85, 0.5)',
                      color: '#f8fafc',
                      resize: 'vertical'
                    }}
                  ></textarea>
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                  Enviar Mensaje
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ 
          background: 'rgba(15, 23, 42, 0.95)', 
          padding: '40px 0', 
          borderTop: '1px solid rgba(148, 163, 184, 0.1)' 
        }}>
          <div className="container">
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <p>&copy; 2024 KOND. Sistema de Gestión de Producción. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>

        {/* Admin Modal */}
        {showAdminModal && (
          <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Acceso Administrativo</h3>
                <button className="close-btn" onClick={() => setShowAdminModal(false)}>×</button>
              </div>
              <form onSubmit={handleAdminLogin}>
                <div className="form-group">
                  <label>Usuario:</label>
                  <input
                    type="text"
                    value={adminCredentials.email}
                    onChange={(e) => setAdminCredentials({...adminCredentials, email: e.target.value})}
                    placeholder="admin1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña:</label>
                  <input
                    type="password"
                    value={adminCredentials.password}
                    onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                    placeholder="kond"
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowAdminModal(false)} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Ingresar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .home-page {
          font-family: 'Inter', system-ui, sans-serif;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #e2e8f0;
          line-height: 1.6;
          margin: 0;
          min-height: 100vh;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

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
          cursor: pointer;
        }

        .nav-link:hover {
          color: #3b82f6;
        }

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

        .btn-admin:hover {
          background: #2563eb;
        }

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

        .btn-primary:hover {
          background: #2563eb;
        }

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

        .feature-card:hover {
          transform: translateY(-4px);
        }

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

        .catalog-preview {
          padding: 80px 0;
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        }

        .preview-header {
          text-align: center;
          margin-bottom: 60px;
        }

        .preview-header h2 {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .preview-header p {
          font-size: 1.2rem;
          color: #64748b;
          margin-bottom: 24px;
        }

        .preview-badges {
          display: flex;
          justify-content: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .badge {
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
          color: #475569;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid #cbd5e1;
        }

        .catalog-demo {
          max-width: 900px;
          margin: 0 auto;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
          border: 1px solid #e2e8f0;
        }

        .device-mockup {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .device-frame {
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
        }

        .device-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .device-controls {
          display: flex;
          gap: 8px;
        }

        .control {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .control.red { background: #ef4444; }
        .control.yellow { background: #f59e0b; }
        .control.green { background: #10b981; }

        .device-url {
          background: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .demo-screen {
          background: white;
          min-height: 500px;
        }

        .demo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: #3b82f6;
          color: white;
        }

        .demo-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          font-size: 18px;
        }

        .brand-logo {
          background: white;
          color: #3b82f6;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .demo-nav {
          display: flex;
          gap: 16px;
        }

        .nav-demo-item {
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-demo-item:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .nav-demo-item.active {
          background: white;
          color: #3b82f6;
        }

        .cart-badge {
          background: #ef4444;
          color: white;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 4px;
        }

        .demo-content {
          padding: 24px;
        }

        .demo-view {
          animation: fadeInDemo 0.3s ease;
        }

        @keyframes fadeInDemo {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hero-mini {
          text-align: center;
          padding: 40px 20px;
        }

        .hero-mini h3 {
          font-size: 24px;
          color: #1e293b;
          margin-bottom: 12px;
        }

        .hero-mini p {
          color: #64748b;
          font-size: 16px;
          margin-bottom: 20px;
        }

        .btn-demo {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-demo.primary {
          background: #3b82f6;
          color: white;
        }

        .btn-demo.secondary {
          background: #f1f5f9;
          color: #475569;
          border: 1px solid #d1d5db;
          margin: 0 8px;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }

        .product-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .product-image {
          font-size: 2.5rem;
          margin-bottom: 12px;
        }

        .product-card h4 {
          color: #1e293b;
          margin-bottom: 8px;
        }

        .price {
          color: #3b82f6;
          font-weight: 700;
          font-size: 1.2rem;
          margin-bottom: 12px;
        }

        .add-to-cart {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }

        .add-to-cart:hover {
          background: #2563eb;
        }

        .cart-items {
          space-y: 16px;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quantity-controls button {
          background: #e2e8f0;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }

        .cart-total {
          text-align: right;
          padding: 16px 12px;
          border-top: 2px solid #e2e8f0;
          margin-top: 16px;
          color: #1e293b;
        }

        .cart-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
        }

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

        .contact {
          padding: 80px 0;
          background: rgba(30, 41, 59, 0.3);
        }

        .modal-overlay {
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
        }

        .modal-content {
          background: linear-gradient(145deg, #1e293b 0%, #334155 100%);
          padding: 32px;
          border-radius: 16px;
          max-width: 400px;
          width: 90%;
          border: 1px solid rgba(148, 163, 184, 0.3);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .modal-header h3 {
          color: #f8fafc;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #cbd5e1;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #475569;
          border-radius: 8px;
          background: rgba(51, 65, 85, 0.5);
          color: #f8fafc;
          font-size: 16px;
        }

        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 768px) {
          .nav-links {
            flex-direction: column;
            gap: 12px;
          }

          .hero h1 {
            font-size: 2.5rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .about-content {
            grid-template-columns: 1fr;
            gap: 32px;
          }

          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}