import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { applyPromotionsToProduct } from '../../utils/promoEngine'
import Layout from '../../components/Layout';
import withAdminAuth from '../../components/withAdminAuth';
import PromoCard from '../../components/marketing/PromoCard';
import CouponCard from '../../components/marketing/CouponCard';
import PromoModal from '../../components/marketing/PromoModal';
import CouponModal from '../../components/marketing/CouponModal';
import EmptyState from '../../components/marketing/EmptyState';
import styles from '../../styles/marketing.module.css';
import { getAllProductos } from '../../utils/supabaseProducts';
import { 
  getPromociones, 
  createPromocion, 
  updatePromocion, 
  deletePromocion,
  getCupones,
  createCupon,
  updateCupon,
  deleteCupon
} from '../../utils/supabaseMarketing';

function Marketing() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('promotions'); // 'promotions' | 'coupons'
  const [promotions, setPromotions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Sincronizar modal con query params de la URL
  useEffect(() => {
    const { modal, id } = router.query;
    
    // Lista de tipos válidos de promoción
    const tiposPromo = ['promo-descuento', 'promo-combo', 'promo-2x1', 'promo-porcentaje', 'promo-regalo'];
    
    if (tiposPromo.includes(modal)) {
      // Abrir modal de nueva promoción con tipo específico
      const tipo = modal.replace('promo-', '');
      setEditingPromo({ tipo });
      setShowPromoModal(true);
    } else if (modal === 'nueva-promocion') {
      setEditingPromo(null);
      setShowPromoModal(true);
    } else if (modal === 'editar-promocion' && id) {
      // Buscar la promoción por ID cuando estén cargadas
      if (promotions.length > 0) {
        const promo = promotions.find(p => p.id === parseInt(id));
        if (promo) {
          setEditingPromo(promo);
          setShowPromoModal(true);
        }
      }
    } else if (modal === 'nuevo-cupon') {
      setEditingCoupon(null);
      setShowCouponModal(true);
    } else if (modal === 'editar-cupon' && id) {
      if (coupons.length > 0) {
        const coupon = coupons.find(c => c.id === parseInt(id));
        if (coupon) {
          setEditingCoupon(coupon);
          setShowCouponModal(true);
        }
      }
    } else if (!modal) {
      // Si no hay modal en la URL, cerrar modales
      setShowPromoModal(false);
      setShowCouponModal(false);
      setEditingPromo(null);
      setEditingCoupon(null);
    }
  }, [router.query.modal, router.query.id, promotions, coupons]);



  const loadData = async () => {
    if (typeof window === 'undefined') return;
    
    setIsLoading(true);
    try {
      // Cargar promociones desde Supabase
      const { data: promos, error: promosError } = await getPromociones();
      if (promosError) {
        console.error('Error loading promociones:', promosError);
      } else {
        // Mapear campos de snake_case a camelCase
        const mappedPromos = (promos || []).map(p => ({
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          valor: p.valor,
          aplicaA: p.aplica_a,
          categoria: p.categoria,
          productoId: p.producto_id,
          fechaInicio: p.fecha_inicio,
          fechaFin: p.fecha_fin,
          activo: p.activo,
          prioridad: p.prioridad,
          badgeTexto: p.badge_texto,
          badgeColor: p.badge_color,
          badgeTextColor: p.badge_text_color,
          descuentoPorcentaje: p.descuento_porcentaje,
          descuentoMonto: p.descuento_monto,
          precioEspecial: p.precio_especial,
          config: p.config,
          createdAt: p.created_at
        }));
        setPromotions(mappedPromos);
      }

      // Cargar cupones desde Supabase
      const { data: cups, error: cupsError } = await getCupones();
      if (cupsError) {
        console.error('Error loading cupones:', cupsError);
      } else {
        // Mapear campos de snake_case a camelCase
        const mappedCups = (cups || []).map(c => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          tipo: c.tipo,
          valor: c.valor,
          montoMinimo: c.monto_minimo,
          usosMaximos: c.usos_maximos,
          usosActuales: c.usos_actuales,
          fechaInicio: c.fecha_inicio,
          fechaExpiracion: c.fecha_expiracion,
          activo: c.activo,
          createdAt: c.created_at
        }));
        setCoupons(mappedCups);
      }

      // Cargar productos desde Supabase
      const { data: prods, error: prodsError } = await getAllProductos();
      if (prodsError) {
        console.error('Error loading productos:', prodsError);
      } else {
        // Mapear y filtrar productos que permiten promociones
        const mappedProds = (prods || [])
          .filter(p => p.allow_promotions !== false)
          .map(p => ({
            id: p.id,
            nombre: p.nombre,
            categoria: p.categoria,
            tipo: p.tipo,
            precioUnitario: p.precio_unitario || 0,
            allowPromotions: p.allow_promotions !== false
          }));
        setProducts(mappedProds);
      }
    } catch (e) {
      console.error('Error loading marketing data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Ya no guardamos en localStorage, solo actualizamos el estado
  const savePromotions = (list) => {
    setPromotions(list);
  };

  const saveCoupons = (list) => {
    setCoupons(list);
  };

  const openPromoModal = (promo = null, tipoEspecifico = null) => {
    if (promo && typeof promo === 'object' && promo.id) {
      // Editar promoción existente
      router.push(`/admin/marketing?modal=editar-promocion&id=${promo.id}`);
    } else if (tipoEspecifico) {
      // Nueva promoción con tipo específico
      router.push(`/admin/marketing?modal=promo-${tipoEspecifico}`);
    } else {
      // Nueva promoción sin tipo predefinido
      router.push('/admin/marketing?modal=nueva-promocion');
    }
  };

  const openCouponModal = (coupon = null) => {
    if (coupon) {
      router.push(`/admin/marketing?modal=editar-cupon&id=${coupon.id}`);
    } else {
      router.push('/admin/marketing?modal=nuevo-cupon');
    }
  };

  const closePromoModal = () => {
    router.push('/admin/marketing');
  };

  const closeCouponModal = () => {
    router.push('/admin/marketing');
  };

  const handlePromoSubmit = async (promoData) => {
    console.log('🚀 handlePromoSubmit iniciado');
    console.log('📦 Datos recibidos:', promoData);
    console.log('✏️ Es edición?', !!editingPromo);
    
    try {
      if (editingPromo) {
        // Actualizar promoción existente
        console.log('🔄 Actualizando promoción ID:', editingPromo.id);
        const { data, error } = await updatePromocion(editingPromo.id, promoData);
        console.log('📊 Resultado update:', { data, error });
        if (error) {
          console.error('❌ Error updating promocion:', error);
          alert('Error al actualizar la promoción: ' + error);
          return;
        }
      } else {
        // Crear nueva promoción
        console.log('➕ Creando nueva promoción');
        const { data, error } = await createPromocion(promoData);
        console.log('📊 Resultado create:', { data, error });
        if (error) {
          console.error('❌ Error creating promocion:', error);
          alert('Error al crear la promoción: ' + error);
          return;
        }
      }
      
      console.log('✅ Promoción guardada, recargando datos...');
      // Recargar datos
      await loadData();
      console.log('✅ Datos recargados, cerrando modal');
      closePromoModal();
    } catch (e) {
      console.error('💥 Error in handlePromoSubmit:', e);
      alert('Error al guardar la promoción: ' + e.message);
    }
  };

  const handleCouponSubmit = async (couponData) => {
    try {
      if (editingCoupon) {
        // Actualizar cupón existente
        const { error } = await updateCupon(editingCoupon.id, couponData);
        if (error) {
          console.error('Error updating cupon:', error);
          alert('Error al actualizar el cupón');
          return;
        }
      } else {
        // Crear nuevo cupón
        const { error } = await createCupon(couponData);
        if (error) {
          console.error('Error creating cupon:', error);
          alert('Error al crear el cupón');
          return;
        }
      }
      
      // Recargar datos
      await loadData();
      closeCouponModal();
    } catch (e) {
      console.error('Error in handleCouponSubmit:', e);
      alert('Error al guardar el cupón');
    }
  };

  const togglePromo = async (id) => {
    const promo = promotions.find(p => p.id === id);
    if (!promo) return;
    
    const { error } = await updatePromocion(id, { activo: !promo.activo });
    if (error) {
      console.error('Error toggling promocion:', error);
      alert('Error al cambiar el estado de la promoción');
      return;
    }
    
    // Recargar datos
    await loadData();
  };

  const deletePromo = async (id) => {
    const promo = promotions.find(p => p.id === id);
    if (!confirm(`¿Eliminar la promoción "${promo?.nombre}" permanentemente?`)) return;
    
    const { error } = await deletePromocion(id);
    if (error) {
      console.error('Error deleting promocion:', error);
      alert('Error al eliminar la promoción');
      return;
    }
    
    // Recargar datos
    await loadData();
  };

  const toggleCoupon = async (id) => {
    const coupon = coupons.find(c => c.id === id);
    if (!coupon) return;
    
    const { error } = await updateCupon(id, { activo: !coupon.activo });
    if (error) {
      console.error('Error toggling cupon:', error);
      alert('Error al cambiar el estado del cupón');
      return;
    }
    
    // Recargar datos
    await loadData();
  };

  const deleteCoupon = async (id) => {
    const coupon = coupons.find(c => c.id === id);
    if (!confirm(`¿Eliminar el cupón "${coupon?.codigo}" permanentemente?`)) return;
    
    const { error } = await deleteCupon(id);
    if (error) {
      console.error('Error deleting cupon:', error);
      alert('Error al eliminar el cupón');
      return;
    }
    
    // Recargar datos
    await loadData();
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
        {/* Header simplificado */}
        <header className={styles.header}>
          <h1 className={styles.title}>🎯 Marketing</h1>
          <p className={styles.subtitle}>Gestiona promociones y cupones de descuento</p>
        </header>

        <main className={styles.main}>
          {/* Tabs modernos */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tabBtn} ${currentTab === 'promotions' ? styles.active : ''}`}
              onClick={() => setCurrentTab('promotions')}
            >
              <span className={styles.tabIcon}>🎯</span>
              <span className={styles.tabLabel}>Promociones</span>
              <span className={styles.tabCount}>{promotions.length}</span>
            </button>
            <button
              className={`${styles.tabBtn} ${currentTab === 'coupons' ? styles.active : ''}`}
              onClick={() => setCurrentTab('coupons')}
            >
              <span className={styles.tabIcon}>🎫</span>
              <span className={styles.tabLabel}>Cupones</span>
              <span className={styles.tabCount}>{coupons.length}</span>
            </button>
          </div>

          {/* Toolbar optimizado */}
          <div className={styles.toolbar}>
            <div className={styles.searchWrapper}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="search"
                className={styles.searchInput}
                placeholder={currentTab === 'promotions' ? 'Buscar promociones...' : 'Buscar cupones...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              className={styles.btnCreate} 
              onClick={() => currentTab === 'promotions' ? openPromoModal() : openCouponModal()}
            >
              <span className={styles.btnIcon}>+</span>
              <span className={styles.btnLabel}>
                {currentTab === 'promotions' ? 'Nueva Promoción' : 'Nuevo Cupón'}
              </span>
            </button>
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
            onClose={closePromoModal}
          />
        )}

        {showCouponModal && (
          <CouponModal
            coupon={editingCoupon}
            onSubmit={handleCouponSubmit}
            onClose={closeCouponModal}
          />
        )}
      </div>
    </Layout>
  );
}

export default withAdminAuth(Marketing);
