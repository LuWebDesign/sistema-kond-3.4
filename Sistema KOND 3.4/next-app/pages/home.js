
'use client';

import Head from 'next/head';
import styles from '../styles/home.module.css';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function HomePage() {
  const router = useRouter();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [currentDemoView, setCurrentDemoView] = useState('inicio');
  const [demoCart, setDemoCart] = useState([]);
  const [adminCredentials, setAdminCredentials] = useState({
    email: '',
    password: ''
  });

  // Products for demo (as found in the original home.html script)
  const demoProducts = [
    { id: 1, name: 'Caja Premium', price: 2500, image: '📦' },
    { id: 2, name: 'Porta Retratos', price: 1800, image: '🖼️' },
    { id: 3, name: 'Llavero Premium', price: 350, image: '🔑' },
    { id: 4, name: 'Etiquetas Set', price: 800, image: '🏷️' }
  ];

  // Refs to manage DOM elements that might need direct manipulation or event listening
  const adminModalRef = useRef(null);
  const adminFormRef = useRef(null);
  const contactFormRef = useRef(null);
  const avatarInputRef = useRef(null);

  // --- Helper Functions (Refactored from inline JS) ---

  // Smooth scrolling
  const smoothScrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Admin Modal Logic
  const openAdminModal = () => setShowAdminModal(true);
  const closeAdminModal = () => setShowAdminModal(false);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    // Mock login
    if (adminCredentials.email === 'admin1' && adminCredentials.password === 'kond') {
      showCustomAlert('✅ Acceso Concedido', 'Redirigiendo al panel administrativo...', 'success', () => {
        router.push('/admin');
      });
    } else {
      showCustomAlert('❌ Credenciales Incorrectas', 'Usuario o contraseña inválidos. Verifica e intenta de nuevo.', 'error');
    }
  };

  // Demo Cart Logic
  const updateDemoCartDisplay = () => {
    const cartCount = demoCart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = demoCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const demoCartBadge = document.getElementById('demo-cart-badge');
    if (demoCartBadge) {
      demoCartBadge.textContent = cartCount;
      demoCartBadge.style.display = cartCount > 0 ? 'inline-block' : 'none';
    }

    // Update cart summary if in cart view
    if (currentDemoView === 'carrito') {
      const subtotalSpan = document.getElementById('demo-subtotal');
      const totalSpan = document.getElementById('demo-total');
      if (subtotalSpan) subtotalSpan.textContent = `${cartTotal.toLocaleString()}`;
      if (totalSpan) totalSpan.textContent = `${cartTotal.toLocaleString()}`;
    }
  };

  const addToCartDemo = (name, price) => {
    setDemoCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.name === name);
      let newCart;
      if (existingItemIndex > -1) {
        newCart = [...prevCart];
        newCart[existingItemIndex].quantity += 1;
      } else {
        newCart = [...prevCart, { name, price, quantity: 1 }];
      }
      // Update UI after state change
      setTimeout(updateDemoCartDisplay, 0);
      showCustomAlert(`${name} agregado al carrito`, '', 'success');
      return newCart;
    });
  };

  const updateQuantityDemo = (name, change) => {
    setDemoCart(prevCart => {
      let newCart = prevCart.map(item => {
        if (item.name === name) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
        } else {
          return item;
        }
      }).filter(Boolean);

      setTimeout(updateDemoCartDisplay, 0);
      return newCart;
    });
  };

  const clearCartDemo = () => {
    if (confirm('¿Vaciar el carrito?')) {
      setDemoCart([]);
      setTimeout(updateDemoCartDisplay, 0);
      showCustomAlert('Carrito vaciado', '', 'info');
    }
  };

  const proceedToCheckout = () => {
    // Placeholder for checkout logic
    showCustomAlert('Funcionalidad no implementada', 'El proceso de checkout debe ser integrado con el backend.', 'warning');
  };

  // Contact Form Logic
  const handleContactForm = (e) => {
    e.preventDefault();
    showCustomAlert('¡Gracias por tu mensaje!', 'Te contactaremos pronto.', 'success', () => {
      e.target.reset(); // Reset form after alert is closed
    });
  };

  // Custom Alert Logic (as seen in original home.js)
  const showCustomAlert = (title, message, type = 'info', callback = null) => {
    // Clean up previous alerts if any
    const existingAlert = document.querySelector(`.${styles.customAlertModal}`);
    if (existingAlert) existingAlert.remove();

    const alertModal = document.createElement('div');
    alertModal.className = styles.customAlertModal;
    alertModal.style.cssText = `\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n      background: rgba(0, 0, 0, 0.85);\n      backdrop-filter: blur(4px);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      z-index: 10000;\n      animation: fadeIn 0.3s ease;\n    `;

    const alertContent = document.createElement('div');
    alertContent.style.cssText = `\n      background: linear-gradient(145deg, #1e293b 0%, #334155 100%);\n      padding: 32px;\n      border-radius: 16px;\n      max-width: 400px;\n      width: 90%;\n      border: 1px solid rgba(148, 163, 184, 0.3);\n      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);\n      text-align: center;\n      position: relative;\n      animation: slideIn 0.3s ease;\n    `;

    const colorMap = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    alertContent.innerHTML = `\n      <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${colorMap[type]}; border-radius: 16px 16px 0 0;"></div>\n      <div style="font-size: 2rem; margin-bottom: 16px;">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</div>\n      <h3 style="color: #f8fafc; margin: 0 0 12px 0; font-size: 1.4rem; font-weight: 700;">${title}</h3>\n      <p style="color: #cbd5e1; margin: 0 0 24px 0; line-height: 1.5;">${message}</p>\n      <button onclick="closeCustomAlert()" style="\n        background: ${colorMap[type]};\n        color: white;\n        padding: 12px 24px;\n        border: none;\n        border-radius: 8px;\n        cursor: pointer;\n        font-weight: 600;\n        min-width: 100px;\n        transition: all 0.2s ease;\n      ">\n        Aceptar\n      </button>\n    `;

    alertModal.appendChild(alertContent);
    document.body.appendChild(alertModal);

    window.closeCustomAlert = () => {
      alertModal.remove();
      if (callback) callback();
    };

    // Auto-close for success/info after a delay if callback is not critical
    if ((type === 'success' || type === 'info') && !callback) {
      setTimeout(() => {
        window.closeCustomAlert();
      }, 2000);
    }
  };

  // --- Effects and Event Listeners --- 
  useEffect(() => {
    // Set initial demo view
    setCurrentDemoView('inicio');
    updateDemoCartDisplay();

    // Add event listeners for elements managed by JS in static HTML
    // This part is tricky in React. Best practice is to use refs or manage state.
    // For demonstration, we'll simulate attaching listeners to hypothetical elements.

    // Attach click listeners to nav links for smooth scrolling
    const navLinks = document.querySelectorAll(`.${styles.navLink}`);
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href.startsWith('#')) {
          smoothScrollToSection(href.substring(1));
        } else if (href === '/catalog') {
          router.push('/catalog');
        }
      });
    });

    // Attach click listeners for demo view switching
    const demoNavItems = document.querySelectorAll(`.${styles.navDemoItem}`);
    demoNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewName = item.getAttribute('data-demo-view');
        if (viewName) {
          setCurrentDemoView(viewName);
          updateDemoCartDisplay(); // Ensure display is updated
        }
      });
    });

    // Attach event listeners for cart actions
    const cartButtons = document.querySelectorAll(`.${styles.productCard}`);
    cartButtons.forEach(card => {
      // Assuming addToCartDemo is called via onClick in JSX, this part might be redundant
      // but kept for illustration if direct event binding was needed.
    });

    // Attach event listener for contact form submission
    const contactFormElement = contactFormRef.current;
    if (contactFormElement) {
      contactFormElement.addEventListener('submit', handleContactForm);
    }

    // Cleanup event listeners on component unmount
    return () => {
      navLinks.forEach(link => link.removeEventListener('click', () => {}));
      demoNavItems.forEach(item => item.removeEventListener('click', () => {}));
      if (contactFormElement) {
        contactFormElement.removeEventListener('submit', handleContactForm);
      }
    };
  }, []); // Empty dependency array means this effect runs once after the initial render

  useEffect(() => {
    // This effect runs when currentDemoView changes to update UI elements
    const demoNavItems = document.querySelectorAll(`.${styles.navDemoItem}`);
    demoNavItems.forEach(item => {
      if (item.getAttribute('data-demo-view') === currentDemoView) {
        item.classList.add(styles.active);
      } else {
        item.classList.remove(styles.active);
      }
    });

    // Show/hide demo views based on state
    document.querySelectorAll(`.${styles.demoView}`).forEach(view => {
      view.style.display = view.id === `demo-${currentDemoView}` ? 'block' : 'none';
    });

    updateDemoCartDisplay();
  }, [currentDemoView]); // Re-run when currentDemoView changes

  return (
    <div className={styles.homePage}>
      <Head>
        <title>KOND - Sistema de Gestión de Producción</title>
        <meta name="description" content="Sistema integral para gestión de producción láser, pedidos, finanzas y catálogo público. Optimiza tu negocio con KOND." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.headerContent}>
            <div className={styles.logo}>KOND</div>
            <nav className={styles.navLinks}>
              <a href="#inicio" className={styles.navLink} onClick={(e) => { e.preventDefault(); smoothScrollToSection('inicio'); }}>Inicio</a>
              <a href="#caracteristicas" className={styles.navLink} onClick={(e) => { e.preventDefault(); smoothScrollToSection('caracteristicas'); }}>Características</a>
              <a href="#catalogo" className={styles.navLink} onClick={(e) => { e.preventDefault(); smoothScrollToSection('catalogo'); }}>Catálogo</a>
              <a href="#sobre" className={styles.navLink} onClick={(e) => { e.preventDefault(); smoothScrollToSection('sobre'); }}>Sobre</a>
              <a href="#contacto" className={styles.navLink} onClick={(e) => { e.preventDefault(); smoothScrollToSection('contacto'); }}>Contacto</a>
              <button className={styles.btnAdmin} onClick={openAdminModal}>Acceso Admin</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className={styles.hero}>
        <div className={styles.container}>
          <h1>Sistema KOND</h1>
          <p>Gestión integral para tu negocio de producción láser. Administra productos, pedidos, finanzas y ofrece un catálogo profesional a tus clientes.</p>
          <div className="cta-buttons">
            <button className={styles.btnPrimary} onClick={() => router.push('/catalog')}>Ver Catálogo</button>
            <button className={styles.btnSecondary} onClick={() => smoothScrollToSection('caracteristicas')}>Conocer Más</button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="caracteristicas" className={styles.features}>
        <div className={styles.container}>
          <h2>Características Principales</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📊</div>
              <h3>Gestión de Productos</h3>
              <p>Administra tu inventario con control de costos, tiempos de producción y medidas personalizadas.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📦</div>
              <h3>Control de Pedidos</h3>
              <p>Seguimiento completo desde la creación hasta la entrega con estados personalizables.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💰</div>
              <h3>Análisis Financiero</h3>
              <p>Reportes detallados de ventas, costos y ganancias con métricas de rendimiento.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🛒</div>
              <h3>Catálogo Público</h3>
              <p>Tienda online profesional para que tus clientes realicen pedidos directamente.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📱</div>
              <h3>Responsive Design</h3>
              <p>Interfaz optimizada para computadoras, tablets y dispositivos móviles.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔒</div>
              <h3>Datos Seguros</h3>
              <p>Información almacenada localmente sin dependencia de servidores externos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Preview */}
      <section id="catalogo" className={styles.catalogPreview}>
        <div className={styles.container}>
          <div className={styles.previewHeader}>
            <h2>Vista Previa del Catálogo</h2>
            <p>Experimenta cómo tus clientes interactúan con tu tienda online</p>
            <div className={styles.previewBadges}>
              <span className={styles.badge}>Carrito Inteligente</span>
              <span className={styles.badge}>Checkout Simplificado</span>
              <span className={styles.badge}>Responsive</span>
            </div>
          </div>

          <div className={styles.catalogDemo}>
            <div className={styles.deviceMockup}>
              <div className={styles.deviceFrame}>
                <div className={styles.deviceHeader}>
                  <div className={styles.deviceControls}>
                    <div className={`${styles.control} ${styles.controlRed}`}></div>
                    <div className={`${styles.control} ${styles.controlYellow}`}></div>
                    <div className={`${styles.control} ${styles.controlGreen}`}></div>
                  </div>
                  <div className={styles.deviceUrl}>kond-catalog.com</div>
                  <div className={styles.deviceMenu}>☰</div>
                </div>

                <div className={styles.demoScreen}>
                  <div className={styles.demoHeader}>
                    <div className={styles.demoBrand}>
                      <div className={styles.brandLogo}>K</div>
                      <span>KOND Store</span>
                    </div>
                    <div className={styles.demoNav}>
                      <div
                        className={`${styles.navDemoItem} ${currentDemoView === 'inicio' ? styles.active : ''}`}
                        onClick={() => setCurrentDemoView('inicio')}
                      >
                        Inicio
                      </div>
                      <div
                        className={`${styles.navDemoItem} ${currentDemoView === 'catalogo' ? styles.active : ''}`}
                        onClick={() => setCurrentDemoView('catalogo')}
                      >
                        Productos
                      </div>
                      <div
                        className={`${styles.navDemoItem} ${currentDemoView === 'carrito' ? styles.active : ''}`}
                        onClick={() => setCurrentDemoView('carrito')}
                      >
                        Carrito
                        {demoCart.length > 0 && (
                          <span className={styles.cartBadge}>{demoCart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.demoContent}>
                    {currentDemoView === 'inicio' && (
                      <div className={styles.demoView} id="demo-inicio">
                        <div className={styles.heroMini}>
                          <h3>Bienvenido a KOND Store</h3>
                          <p>Productos de alta calidad fabricados con tecnología láser</p>
                          <button className={`${styles.btnDemo} ${styles.primary}`} onClick={() => setCurrentDemoView('catalogo')}>
                            Explorar Productos
                          </button>
                        </div>
                      </div>
                    )}

                    {currentDemoView === 'catalogo' && (
                      <div className={styles.demoView} id="demo-catalogo">
                        <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Nuestros Productos</h3>
                        <div className={styles.productsGrid}>
                          {demoProducts.map(product => (
                            <div key={product.id} className={styles.productCard} onClick={() => addToCartDemo(product.name, product.price)}>
                              <div className={styles.productImage}>🍕</div>
                              <h4>{product.name}</h4>
                              <p className={styles.price}>${product.price.toLocaleString()}</p>
                              <button className={styles.addToCart}>Agregar al carrito</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentDemoView === 'carrito' && (
                      <div className={styles.demoView} id="demo-carrito">
                        <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Tu Carrito</h3>
                        {demoCart.length === 0 ? (
                          <p style={{ textAlign: 'center', color: '#64748b' }}>Tu carrito está vacío</p>
                        ) : (
                          <div className={styles.cartItems}>
                            {demoCart.map((item, index) => (
                              <div key={index} className={styles.cartItem}>
                                <span>{item.name}</span>
                                <div className={styles.quantityControls}>
                                  <button onClick={() => updateQuantityDemo(item.name, -1)}>-</button>
                                  <span>{item.quantity}</span>
                                  <button onClick={() => updateQuantityDemo(item.name, 1)}>+</button>
                                </div>
                                <span>${(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                            ))}
                            <div className={styles.cartTotal}>
                              <strong>Total: ${demoCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</strong>
                            </div>
                            <div className={styles.cartActions}>
                              <button className={`${styles.btnDemo} ${styles.secondary}`} onClick={clearCartDemo}>Vaciar</button>
                              <button className={`${styles.btnDemo} ${styles.primary}`} onClick={proceedToCheckout}>Finalizar Compra</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button onClick={() => router.push('/catalog')} className={`${styles.btnDemo} ${styles.secondary}`}>
                Ver Catálogo Real
              </button>
              <button onClick={openAdminModal} className={`${styles.btnDemo} ${styles.secondary}`}>
                Acceso Admin
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className={styles.about}>
        <div className={styles.container}>
          <div className={styles.aboutContent}>
            <div>
              <h2>Sobre KOND</h2>
              <p>KOND es una solución integral diseñada específicamente para empresas de producción láser que buscan optimizar sus procesos y ofrecer una experiencia profesional a sus clientes.</p>
              <p>Nuestro sistema combina la gestión interna avanzada con un catálogo público elegante, permitiendo que tu negocio crezca de manera organizada y eficiente.</p>
              <p>Con KOND, puedes concentrarte en lo que mejor haces: crear productos excepcionales, mientras nosotros nos encargamos de la gestión.</p>
            </div>
            <div className={styles.aboutImage}>
              🎯
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className={styles.contact}>
        <div className={styles.container}>
          <h2 style={{ textAlign: 'center', marginBottom: '40px', color: '#f8fafc' }}>Contacto</h2>
          <form ref={contactFormRef} onSubmit={handleContactForm} className={styles.contactForm}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Nombre</label>
              <input type="text" id="name" name="name" required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="message">Mensaje</label>
              <textarea id="message" name="message" rows="5" required></textarea>
            </div>
            <button type="submit" className={styles.btnPrimary} style={{ width: '100%' }}>Enviar Mensaje</button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        background: 'rgba(15, 23, 42, 0.95)', 
        padding: '40px 0',
        borderTop: '1px solid rgba(148, 163, 184, 0.1)' 
      }}>
        <div className={styles.container}>
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <p>&copy; 2024 KOND. Sistema de Gestión de Producción. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */} 
      {showAdminModal && (
        <div className={styles.modalOverlay} onClick={closeAdminModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} ref={adminModalRef}>
            <div className={styles.modalHeader}>
              <h3>Acceso Administrativo</h3>
              <button className={styles.closeBtn} onClick={closeAdminModal}>×</button>
            </div>
            <form ref={adminFormRef} onSubmit={handleAdminLogin}>
              <div className={styles.formGroup}>
                <label>Usuario:</label>
                <input
                  type="text"
                  value={adminCredentials.email}
                  onChange={(e) => setAdminCredentials({...adminCredentials, email: e.target.value})}
                  placeholder="admin1"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Contraseña:</label>
                <input
                  type="password"
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials({...adminCredentials, password: e.target.value})}
                  placeholder="kond"
                  required
                />
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={closeAdminModal} className={styles.btnSecondary}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Ingresar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
  };

  // Admin Modal Logic
  const openAdminModal = () => setShowAdminModal(true);
  const closeAdminModal = () => setShowAdminModal(false);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    // Mock login
    if (adminCredentials.email === 'admin1' && adminCredentials.password === 'kond') {
      showCustomAlert('✅ Acceso Concedido', 'Redirigiendo al panel administrativo...', 'success', () => {
        router.push('/admin');
      });
    } else {
      showCustomAlert('❌ Credenciales Incorrectas', 'Usuario o contraseña inválidos. Verifica e intenta de nuevo.', 'error');
    }
  };

  // Demo Cart Logic
  const updateDemoCartDisplay = () => {
    const cartCount = demoCart.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotal = demoCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const demoCartBadge = document.getElementById('demo-cart-badge');
    if (demoCartBadge) {
      demoCartBadge.textContent = cartCount;
      demoCartBadge.style.display = cartCount > 0 ? 'inline-block' : 'none';
    }

    // Update cart summary if in cart view
    if (currentDemoView === 'carrito') {
      const subtotalSpan = document.getElementById('demo-subtotal');
      const totalSpan = document.getElementById('demo-total');
      if (subtotalSpan) subtotalSpan.textContent = `$${cartTotal.toLocaleString()}`;
      if (totalSpan) totalSpan.textContent = `$${cartTotal.toLocaleString()}`;
    }
  };

  const addToCartDemo = (name, price) => {
    setDemoCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.name === name);
      let newCart;
      if (existingItemIndex > -1) {
        newCart = [...prevCart];
        newCart[existingItemIndex].quantity += 1;
      } else {
        newCart = [...prevCart, { name, price, quantity: 1 }];
      }
      // Update UI after state change
      setTimeout(updateDemoCartDisplay, 0);
      showCustomAlert(`${name} agregado al carrito`, '', 'success');
      return newCart;
    });
  };

  const updateQuantityDemo = (name, change) => {
    setDemoCart(prevCart => {
      let newCart = prevCart.map(item => {
        if (item.name === name) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
        } else {
          return item;
        }
      }).filter(Boolean);

      setTimeout(updateDemoCartDisplay, 0);
      return newCart;
    });
  };

  const clearCartDemo = () => {
    if (confirm('¿Vaciar el carrito?')) {
      setDemoCart([]);
      setTimeout(updateDemoCartDisplay, 0);
      showCustomAlert('Carrito vaciado', '', 'info');
    }
  };

  const proceedToCheckout = () => {
    // Placeholder for checkout logic
    showCustomAlert('Funcionalidad no implementada', 'El proceso de checkout debe ser integrado con el backend.', 'warning');
  };

  // Contact Form Logic
  const handleContactForm = (e) => {
    e.preventDefault();
    showCustomAlert('¡Gracias por tu mensaje!', 'Te contactaremos pronto.', 'success', () => {
      e.target.reset(); // Reset form after alert is closed
    });
  };

  // Custom Alert Logic (as seen in original home.js)
  const showCustomAlert = (title, message, type = 'info', callback = null) => {
    // Clean up previous alerts if any
    const existingAlert = document.querySelector(`.${styles.customAlertModal}`);
    if (existingAlert) existingAlert.remove();

    const alertModal = document.createElement('div');
    alertModal.className = styles.customAlertModal;
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

    window.closeCustomAlert = () => {
      alertModal.remove();
      if (callback) callback();
    };

    // Auto-close for success/info after a delay if callback is not critical
    if ((type === 'success' || type === 'info') && !callback) {
      setTimeout(() => {
        window.closeCustomAlert();
      }, 2000);
    }
  };

  // --- Effects and Event Listeners --- 
  useEffect(() => {
    // Set initial demo view
    setCurrentDemoView('inicio');
    updateDemoCartDisplay();

    // Add event listeners for elements managed by JS in static HTML
    // This part is tricky in React. Best practice is to use refs or manage state.
    // For demonstration, we'll simulate attaching listeners to hypothetical elements.

    // Attach click listeners to nav links for smooth scrolling
    const navLinks = document.querySelectorAll(`.${styles.navLink}`);
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href.startsWith('#')) {
          smoothScrollToSection(href.substring(1));
        } else if (href === '/catalog') {
          router.push('/catalog');
        }
      });
    });

    // Attach click listeners for demo view switching
    const demoNavItems = document.querySelectorAll(`.${styles.navDemoItem}`);
    demoNavItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewName = item.getAttribute('data-demo-view');
        if (viewName) {
          setCurrentDemoView(viewName);
          updateDemoCartDisplay(); // Ensure display is updated
        }
      });
    });

    // Attach event listeners for cart actions
    const cartButtons = document.querySelectorAll(`.${styles.productCard}`);
    cartButtons.forEach(card => {
      // Assuming addToCartDemo is called via onClick in JSX, this part might be redundant
      // but kept for illustration if direct event binding was needed.
    });

    // Attach event listener for contact form submission
    const contactFormElement = contactFormRef.current;
    if (contactFormElement) {
      contactFormElement.addEventListener('submit', handleContactForm);
    }

    // Cleanup event listeners on component unmount
    return () => {
      navLinks.forEach(link => link.removeEventListener('click', () => {}));
      demoNavItems.forEach(item => item.removeEventListener('click', () => {}));
      if (contactFormElement) {
        contactFormElement.removeEventListener('submit', handleContactForm);
      }
    };
  }, []); // Empty dependency array means this effect runs once after the initial render

  useEffect(() => {
    // This effect runs when currentDemoView changes to update UI elements
    const demoNavItems = document.querySelectorAll(`.${styles.navDemoItem}`);
    demoNavItems.forEach(item => {
      if (item.getAttribute('data-demo-view') === currentDemoView) {
        item.classList.add(styles.active);
      } else {
        item.classList.remove(styles.active);
      }
    });

    // Show/hide demo views based on state
    document.querySelectorAll(`.${styles.demoView}`).forEach(view => {
      view.style.display = view.id === `demo-${currentDemoView}` ? 'block' : 'none';
    });

    updateDemoCartDisplay();
  }, [currentDemoView]); // Re-run when currentDemoView changes

  return (
    <div className="home-page">
      <Head>
        <title>KOND - Sistema de Gestión de Producción</title>
        <meta name="description" content="Sistema integral para gestión de producción láser, pedidos, finanzas y catálogo público. Optimiza tu negocio con KOND." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="header-content">
            <div className="logo">KOND</div>
            <nav className="nav-links">
              <a href="#inicio" className="nav-link" onClick={(e) => { e.preventDefault(); smoothScrollToSection('inicio'); }}>Inicio</a>
              <a href="#caracteristicas" className="nav-link" onClick={(e) => { e.preventDefault(); smoothScrollToSection('caracteristicas'); }}>Características</a>
              <a href="#catalogo" className="nav-link" onClick={(e) => { e.preventDefault(); smoothScrollToSection('catalogo'); }}>Catálogo</a>
              <a href="#sobre" className="nav-link" onClick={(e) => { e.preventDefault(); smoothScrollToSection('sobre'); }}>Sobre</a>
              <a href="#contacto" className="nav-link" onClick={(e) => { e.preventDefault(); smoothScrollToSection('contacto'); }}>Contacto</a>
              <button className="btn-admin" onClick={openAdminModal}>Acceso Admin</button>
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
            <button className="btn-secondary" onClick={() => smoothScrollToSection('caracteristicas')}>Conocer Más</button>
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
                      <div className={styles.demoView} id="demo-inicio">
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
                      <div className={styles.demoView} id="demo-catalogo">
                        <h3 style={{ marginBottom: '20px', color: '#1e293b' }}>Nuestros Productos</h3>
                        <div className="products-grid">
                          {demoProducts.map(product => (
                            <div key={product.id} className={styles.productCard} onClick={() => addToCartDemo(product.name, product.price)}>
                              <div className="product-image">{product.image}</div>
                              <h4>{product.name}</h4>
                              <p className="price">${product.price.toLocaleString()}</p>
                              <button className="add-to-cart">Agregar al carrito</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentDemoView === 'carrito' && (
                      <div className={styles.demoView} id="demo-carrito">
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
                                <span>${(item.price * item.quantity).toLocaleString()}</span>
                              </div>
                            ))}
                            <div className="cart-total">
                              <strong>Total: ${demoCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</strong>
                            </div>
                            <div className="cart-actions">
                              <button className="btn-demo secondary" onClick={clearCartDemo}>Vaciar</button>
                              <button className="btn-demo primary" onClick={proceedToCheckout}>Finalizar Compra</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button onClick={() => router.push('/catalog')} className="btn-demo secondary">
                Ver Catálogo Real
              </button>
              <button onClick={openAdminModal} className="btn-demo secondary">
                Acceso Admin
              </button>
            </div>
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
          <form ref={contactFormRef} onSubmit={handleContactForm} className="contact-form">
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
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Enviar Mensaje</button>
          </form>
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

      {/* Admin Login Modal */} 
      {showAdminModal && (
        <div className="modal-overlay" onClick={closeAdminModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={adminModalRef}>
            <div className="modal-header">
              <h3>Acceso Administrativo</h3>
              <button className="close-btn" onClick={closeAdminModal}>×</button>
            </div>
            <form ref={adminFormRef} onSubmit={handleAdminLogin}>
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
                <button type="button" onClick={closeAdminModal} className="btn-secondary">
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

      {/* Custom Alert Styles (can be moved to global CSS or _app.js) */}
      <style jsx>{`
        .custom-alert-modal {
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

        .custom-alert-modal > div {
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
        }

        .custom-alert-modal h3 {
          color: #f8fafc;
          margin: 0 0 12px 0;
          font-size: 1.4rem;
          font-weight: 700;
        }

        .custom-alert-modal p {
          color: #cbd5e1;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        
        .custom-alert-modal button {
          background: #ef4444; /* Default color, will be overridden */
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          min-width: 100px;
          transition: all 0.2s ease;
        }

        .custom-alert-modal button:hover {
          filter: brightness(1.1);
        }
        
        .custom-alert-modal button[onclick*="closeCustomAlert"] {
          background: #ef4444;
        }

        .custom-alert-modal button[onclick*="closeCustomAlert"]:hover {
          filter: brightness(1.1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* Modal Overlay for Admin Login */
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
          z-index: 1000;
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
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .modal-header h3 {
          color: #f8fafc;
          margin: 0;
          font-size: 1.4rem;
          font-weight: 700;
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
        
        /* Responsive */
        @media (max-width: 768px) {
          .navLinks {
            flex-direction: column;
            gap: 12px;
          }
          .hero h1 { font-size: 2.5rem; }
          .featuresGrid { grid-template-columns: 1fr; }
          .aboutContent { grid-template-columns: 1fr; gap: 32px; }
          .ctaButtons { flex-direction: column; align-items: center; }
        }
      `}</style>
    </div>
  );
}
