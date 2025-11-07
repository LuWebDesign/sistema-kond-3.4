import { useState, useEffect } from 'react';
import { applyPromotionsToProduct } from '../utils/promoEngine'
import Layout from '../components/Layout';
import withAdminAuth from '../components/withAdminAuth';
import PromoCard from '../components/marketing/PromoCard';
import CouponCard from '../components/marketing/CouponCard';
import PromoModal from '../components/marketing/PromoModal';
import CouponModal from '../components/marketing/CouponModal';
import EmptyState from '../components/marketing/EmptyState';
import styles from '../styles/marketing.module.css';

function Marketing() {
  const [currentTab, setCurrentTab] = useState('promotions'); // 'promotions' | 'coupons'
  const [promotions, setPromotions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const checkTheme = () => {
      const currentTheme = document.body.getAttribute('data-theme');
      setIsLight(currentTheme === 'light');
    };

    checkTheme();

    // Escuchar cambios en el tema
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  const loadData = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const promos = JSON.parse(localStorage.getItem('marketing_promotions') || '[]');
      const cups = JSON.parse(localStorage.getItem('marketing_coupons') || '[]');
      const prods = JSON.parse(localStorage.getItem('productosBase') || '[]')
        .filter(p => p.allowPromotions !== false);
      
      setPromotions(promos);
      setCoupons(cups);
      setProducts(prods);
    } catch (e) {
      console.error('Error loading marketing data:', e);
    }
  };

  const savePromotions = (list) => {
    try {
      localStorage.setItem('marketing_promotions', JSON.stringify(list));
      setPromotions(list);
      // Actualizar productos en `productosBase` aplicando las promociones guardadas
      try {
        const prodsRaw = localStorage.getItem('productosBase') || '[]'
        const prods = JSON.parse(prodsRaw)
        const updated = prods.map(p => {
          // solo productos que permiten promos mantienen el campo
          if (p.allowPromotions === false) return p
          try {
            const promoResult = applyPromotionsToProduct(p)
            // persistir precioPromos y flag hasPromotion
            return {
              ...p,
              precioPromos: promoResult.discountedPrice,
              hasPromotion: promoResult.hasPromotion
            }
          } catch (e) {
            return p
          }
        })
        localStorage.setItem('productosBase', JSON.stringify(updated))
        // Notificar al resto de la app que productos cambiaron
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('productos:updated'))
      } catch (e) {
        console.error('Error updating products with promotions:', e)
      }
    } catch (e) {
      console.error('Error saving promotions:', e);
      alert('No se pudo guardar la promoción. El almacenamiento local puede estar lleno.');
    }
  };

  const saveCoupons = (list) => {
    try {
      localStorage.setItem('marketing_coupons', JSON.stringify(list));
      setCoupons(list);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('coupons:updated'));
      }
    } catch (e) {
      console.error('Error saving coupons:', e);
      alert('No se pudo guardar el cupón. El almacenamiento local puede estar lleno.');
    }
  };

  const openPromoModal = (promo = null) => {
    setEditingPromo(promo);
    setShowPromoModal(true);
  };

  const openCouponModal = (coupon = null) => {
    setEditingCoupon(coupon);
    setShowCouponModal(true);
  };

  const handlePromoSubmit = (promoData) => {
    const list = [...promotions];
    if (editingPromo) {
      const idx = list.findIndex(p => p.id === editingPromo.id);
      if (idx !== -1) {
        list[idx] = { ...promoData, id: editingPromo.id, createdAt: editingPromo.createdAt, updatedAt: new Date().toISOString() };
      }
    } else {
      list.unshift({ ...promoData, id: Date.now() + Math.floor(Math.random() * 100000), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    savePromotions(list);
    setShowPromoModal(false);
    setEditingPromo(null);
  };

  const handleCouponSubmit = (couponData) => {
    const list = [...coupons];
    if (editingCoupon) {
      const idx = list.findIndex(c => c.id === editingCoupon.id);
      if (idx !== -1) {
        list[idx] = { ...couponData, id: editingCoupon.id, createdAt: editingCoupon.createdAt, updatedAt: new Date().toISOString() };
      }
    } else {
      list.unshift({ ...couponData, id: Date.now() + Math.floor(Math.random() * 100000), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    saveCoupons(list);
    setShowCouponModal(false);
    setEditingCoupon(null);
  };

  const togglePromo = (id) => {
    const list = promotions.map(p => p.id === id ? { ...p, active: !p.active, updatedAt: new Date().toISOString() } : p);
    savePromotions(list);
  };

  const deletePromo = (id) => {
    const promo = promotions.find(p => p.id === id);
    if (confirm(`¿Eliminar la promoción "${promo?.title}" permanentemente?`)) {
      const list = promotions.filter(p => p.id !== id);
      savePromotions(list);
    }
  };

  const toggleCoupon = (id) => {
    const list = coupons.map(c => c.id === id ? { ...c, active: !c.active, updatedAt: new Date().toISOString() } : c);
    saveCoupons(list);
  };

  const deleteCoupon = (id) => {
    const coupon = coupons.find(c => c.id === id);
    if (confirm(`¿Eliminar el cupón "${coupon?.code}" permanentemente?`)) {
      const list = coupons.filter(c => c.id !== id);
      saveCoupons(list);
    }
  };

  const filteredPromotions = promotions.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.summary || '').toLowerCase().includes(q) ||
      (p.badge || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => (t || '').toLowerCase().includes(q))
    );
  });

  const filteredCoupons = coupons.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.code.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <Layout title="Marketing - Sistema KOND">
      <div className={styles.container}>
        <header className={`${styles.header} ${isLight ? styles.headerLight : ''}`}>
          <div>
            <h1 className={styles.title}>🎯 Marketing</h1>
            <nav className={styles.breadcrumbs}>
              <span>Inicio</span>
              <span className={styles.sep}>/</span>
              <span className={styles.current}>Marketing</span>
            </nav>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.sectionHead}>
            {/* Tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tabBtn} ${currentTab === 'promotions' ? styles.active : ''}`}
                onClick={() => setCurrentTab('promotions')}
              >
                🎯 Promociones
              </button>
              <button
                className={`${styles.tabBtn} ${currentTab === 'coupons' ? styles.active : ''}`}
                onClick={() => setCurrentTab('coupons')}
              >
                🎫 Cupones
              </button>
            </div>

            <div className={styles.toolbar}>
              <div className={styles.search}>
                <input
                  type="search"
                  className={styles.input}
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className={styles.actions}>
                {currentTab === 'promotions' ? (
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => openPromoModal()}>
                    + Nueva promoción
                  </button>
                ) : (
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => openCouponModal()}>
                    + Nuevo cupón
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {currentTab === 'promotions' ? (
            filteredPromotions.length > 0 ? (
              <div className={styles.grid}>
                {filteredPromotions.map(promo => (
                  <PromoCard
                    key={promo.id}
                    promo={promo}
                    products={products}
                    onEdit={() => openPromoModal(promo)}
                    onToggle={() => togglePromo(promo.id)}
                    onDelete={() => deletePromo(promo.id)}
                    isLight={isLight}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="🎯"
                title="Sin promociones aún"
                description="Crea tu primera campaña o descuento desde 'Nueva promoción'."
                action={{ label: 'Crear promoción', onClick: () => openPromoModal() }}
              />
            )
          ) : (
            filteredCoupons.length > 0 ? (
              <div className={styles.grid}>
                {filteredCoupons.map(coupon => (
                  <CouponCard
                    key={coupon.id}
                    coupon={coupon}
                    onEdit={() => openCouponModal(coupon)}
                    onToggle={() => toggleCoupon(coupon.id)}
                    onDelete={() => deleteCoupon(coupon.id)}
                    isLight={isLight}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="🎫"
                title="No hay cupones"
                description="Crea cupones de descuento para que tus clientes puedan aplicarlos en el carrito."
                action={{ label: 'Crear cupón', onClick: () => openCouponModal() }}
              />
            )
          )}
        </main>

        {/* Modals */}
        {showPromoModal && (
          <PromoModal
            promo={editingPromo}
            products={products}
            onSubmit={handlePromoSubmit}
            onClose={() => {
              setShowPromoModal(false);
              setEditingPromo(null);
            }}
            isLight={isLight}
          />
        )}

        {showCouponModal && (
          <CouponModal
            coupon={editingCoupon}
            onSubmit={handleCouponSubmit}
            onClose={() => {
              setShowCouponModal(false);
              setEditingCoupon(null);
            }}
            isLight={isLight}
          />
        )}
      </div>
    </Layout>
  );
}

export default withAdminAuth(Marketing);
