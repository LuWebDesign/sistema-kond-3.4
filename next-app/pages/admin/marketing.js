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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, STALE_TIMES } from '../../lib/queryKeys'

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
  // Local state for UI-managed lists — React Query is the source of truth for network data.

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
  }, [router.query.modal, router.query.id]);



  // React Query: fetch promociones, cupones y productos (client-only)
  const queryClient = useQueryClient()

  const COUPONS_KEY = QUERY_KEYS.cupones.list()

  const { data: promosData = [], isLoading: loadingPromos } = useQuery({
    queryKey: QUERY_KEYS.promociones.all,
    queryFn: async () => {
      const { data, error } = await getPromociones()
      if (error) throw new Error(error)
      return data || []
    },
    staleTime: STALE_TIMES.promociones,
    enabled: typeof window !== 'undefined',
  })

  const { data: cupsData = [], isLoading: loadingCoupons } = useQuery({
    queryKey: COUPONS_KEY,
    queryFn: async () => {
      const { data, error } = await getCupones()
      if (error) throw new Error(error)
      return data || []
    },
    staleTime: STALE_TIMES.cupones,
    enabled: typeof window !== 'undefined',
  })

  const { data: prodsData = [], isLoading: loadingProducts } = useQuery({
    queryKey: QUERY_KEYS.productos.list(),
    queryFn: async () => {
      const { data, error } = await getAllProductos()
      if (error) throw new Error(error)
      return data || []
    },
    staleTime: STALE_TIMES.productos_admin,
    enabled: typeof window !== 'undefined',
  })

  // Map query results into local UI state (keeps existing modal/edit flows intact)
  useEffect(() => {
    const mappedPromos = (Array.isArray(promosData) ? promosData : []).map(p => ({
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
    }))
    // Evitar setState si no hay cambios reales para prevenir loops
    const same = promotions.length === mappedPromos.length && promotions.every((old, i) => old.id === mappedPromos[i]?.id)
    if (!same) setPromotions(mappedPromos)
  }, [promosData])

  useEffect(() => {
    const mappedCups = (Array.isArray(cupsData) ? cupsData : []).map(c => ({
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
    }))
    const same = coupons.length === mappedCups.length && coupons.every((old, i) => old.id === mappedCups[i]?.id)
    if (!same) setCoupons(mappedCups)
  }, [cupsData])

  useEffect(() => {
    const mappedProds = (Array.isArray(prodsData) ? prodsData : [])
      .filter(p => p && p.allow_promotions !== false)
      .map(p => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        tipo: p.tipo,
        precioUnitario: p.precio_unitario || 0,
        allowPromotions: p.allow_promotions !== false
      }))
      const same = products.length === mappedProds.length && products.every((old, i) => old.id === mappedProds[i]?.id)
      if (!same) setProducts(mappedProds)
  }, [prodsData])

  const isLoading = loadingPromos || loadingCoupons || loadingProducts

  // Mutations: wrap utils and throw on error so useMutation considers failures
  const createPromoMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await createPromocion(payload)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.promociones.all })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productos.list() })
    }
  })

  const updatePromoMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await updatePromocion(id, payload)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.promociones.all })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productos.list() })
    }
  })

  const deletePromoMutation = useMutation({
    mutationFn: async (id) => {
      const res = await deletePromocion(id)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.promociones.all })
  })

  const createCouponMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await createCupon(payload)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COUPONS_KEY })
  })

  const updateCouponMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await updateCupon(id, payload)
      if (res.error) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COUPONS_KEY })
  })

  const deleteCouponMutation = useMutation({
    mutationFn: async (id) => {
      const res = await deleteCupon(id)
      if (res.error) throw new Error(res.error)
      return res
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COUPONS_KEY })
  })

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
    try {
      if (editingPromo) {
        await updatePromoMutation.mutateAsync({ id: editingPromo.id, payload: promoData })
      } else {
        await createPromoMutation.mutateAsync(promoData)
      }

      closePromoModal()
    } catch (e) {
      console.error('💥 Error in handlePromoSubmit:', e)
      alert('Error al guardar la promoción: ' + (e.message || e))
    }
  };

  const handleCouponSubmit = async (couponData) => {
    try {
      if (editingCoupon) {
        await updateCouponMutation.mutateAsync({ id: editingCoupon.id, payload: couponData })
      } else {
        await createCouponMutation.mutateAsync(couponData)
      }

      closeCouponModal()
    } catch (e) {
      console.error('Error in handleCouponSubmit:', e)
      alert('Error al guardar el cupón: ' + (e.message || e))
    }
  };

  const togglePromo = async (id) => {
    const promo = promotions.find(p => p.id === id);
    if (!promo) return;
    
    try {
      await updatePromoMutation.mutateAsync({ id, payload: { activo: !promo.activo } })
    } catch (e) {
      console.error('Error toggling promocion:', e)
      alert('Error al cambiar el estado de la promoción')
    }
  };

  const deletePromo = async (id) => {
    const promo = promotions.find(p => p.id === id);
    if (!confirm(`¿Eliminar la promoción "${promo?.nombre}" permanentemente?`)) return;
    
    try {
      await deletePromoMutation.mutateAsync(id)
    } catch (e) {
      console.error('Error deleting promocion:', e)
      alert('Error al eliminar la promoción')
    }
  };

  const toggleCoupon = async (id) => {
    const coupon = coupons.find(c => c.id === id);
    if (!coupon) return;
    
    try {
      await updateCouponMutation.mutateAsync({ id, payload: { activo: !coupon.activo } })
    } catch (e) {
      console.error('Error toggling cupon:', e)
      alert('Error al cambiar el estado del cupón')
    }
  };

  const deleteCoupon = async (id) => {
    const coupon = coupons.find(c => c.id === id);
    if (!confirm(`¿Eliminar el cupón "${coupon?.codigo}" permanentemente?`)) return;
    
    try {
      await deleteCouponMutation.mutateAsync(id)
    } catch (e) {
      console.error('Error deleting cupon:', e)
      alert('Error al eliminar el cupón')
    }
  };

  const filteredPromotions = promotions.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.nombre || '').toLowerCase().includes(q) ||
      (p.tipo || '').toLowerCase().includes(q) ||
      (p.badgeTexto || '').toLowerCase().includes(q) ||
      (p.categoria || '').toLowerCase().includes(q)
    );
  });

  const filteredCoupons = coupons.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.codigo || '').toLowerCase().includes(q) ||
      (c.nombre && c.nombre.toLowerCase().includes(q))
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
