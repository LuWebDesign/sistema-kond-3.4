import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import withAdminAuth from '../components/withAdminAuth';
import styles from '../styles/finanzas.module.css';
import { 
  getCategorias, 
  createCategoria, 
  deleteCategoria,
  getMovimientos,
  createMovimiento,
  updateMovimiento,
  deleteMovimiento,
  getRegistrosCierre,
  upsertRegistroCierre
} from '../utils/supabaseFinanzas';
import { getAllPedidosCatalogo } from '../utils/supabasePedidos';

function Finanzas() {
  const [darkMode, setDarkMode] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [pedidosCatalogo, setPedidosCatalogo] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showMontoModal, setShowMontoModal] = useState(false);
  const [tempMonto, setTempMonto] = useState('');
  
  // Función para formatear número con separadores de miles
  const formatNumberWithThousands = (value) => {
    if (!value) return '';
    const num = value.toString().replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Form fields
  const [formData, setFormData] = useState({
    tipo: 'ingreso',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    hora: '',
    categoria: '',
    descripcion: '',
    metodoPago: 'efectivo'
  });

  // Registros
  const [registroFecha, setRegistroFecha] = useState(new Date().toISOString().slice(0, 10));
  const [registrosDelDia, setRegistrosDelDia] = useState([]);
  const [expandedRegistro, setExpandedRegistro] = useState(null);

  useEffect(() => {
    loadData();
    // load theme
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('finanzas_dark'));
        if (typeof saved === 'boolean') setDarkMode(saved);
      } catch (e) {}
    }
  }, []);

  // Escuchar cambios externos (otra pestaña o módulos que registren movimientos)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (e) => {
      if (!e.key) return;
      if (e.key === 'finanzas' || e.key === 'pedidosCatalogo' || e.key === 'pedidosCatalogo_updated') {
        loadData();
      }
    };

    const handleFinanzasUpdated = () => {
      // Un movimiento nuevo fue registrado desde otro módulo
      loadData();
    };

    const handlePedidosCatalogoUpdated = () => {
      // Cuando un pedido cambia, el porCobrar puede variar
      loadData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('finanzasUpdated', handleFinanzasUpdated);
    window.addEventListener('pedidosCatalogo:updated', handlePedidosCatalogoUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('finanzasUpdated', handleFinanzasUpdated);
      window.removeEventListener('pedidosCatalogo:updated', handlePedidosCatalogoUpdated);
    };
  }, []);

  const loadData = async () => {
    if (typeof window === 'undefined') return;
    
    setIsLoading(true);
    try {
      // Cargar movimientos desde Supabase
      const { data: movs, error: movError } = await getMovimientos();
      if (movError) {
        console.error('Error loading movimientos:', movError);
      } else {
        // Mapear campos de snake_case a camelCase
        const mappedMovs = (movs || []).map(m => ({
          id: m.id,
          tipo: m.tipo,
          monto: m.monto,
          fecha: m.fecha,
          hora: m.hora,
          categoria: m.categoria,
          descripcion: m.descripcion,
          metodoPago: m.metodo_pago || 'efectivo',
          createdAt: m.created_at
        }));
        setMovimientos(mappedMovs);
      }

      // Cargar registros de cierre desde Supabase
      const { data: regs, error: regError } = await getRegistrosCierre();
      if (regError) {
        console.error('Error loading registros:', regError);
      } else {
        const mappedRegs = (regs || []).map(r => ({
          id: r.id,
          fecha: r.fecha,
          efectivo: r.efectivo,
          transferencia: r.transferencia,
          tarjeta: r.tarjeta,
          total: r.total,
          observaciones: r.observaciones,
          createdAt: r.created_at
        }));
        setRegistros(mappedRegs);
      }

      // Cargar categorías desde Supabase
      const { data: cats, error: catError } = await getCategorias();
      if (catError) {
        console.error('Error loading categorias:', catError);
      } else {
        // Convertir array de objetos a array de strings para compatibilidad
        const categoryNames = (cats || []).map(c => c.nombre);
        setCategorias(categoryNames);
      }

      // Cargar pedidos del catálogo desde Supabase
      const { data: pedidos, error: pedError } = await getAllPedidosCatalogo();
      if (pedError) {
        console.error('Error loading pedidos catalogo:', pedError);
      } else {
        // Mapear pedidos (similar al formato anterior)
        const mappedPedidos = (pedidos || []).map(p => ({
          id: p.id,
          cliente: {
            nombre: p.cliente_nombre,
            apellido: p.cliente_apellido,
            telefono: p.cliente_telefono,
            email: p.cliente_email,
            direccion: p.cliente_direccion
          },
          metodoPago: p.metodo_pago,
          estadoPago: p.estado_pago,
          comprobanteUrl: p.comprobante_url,
          comprobanteOmitido: p.comprobante_omitido,
          fechaCreacion: p.fecha_creacion,
          fechaSolicitudEntrega: p.fecha_solicitud_entrega,
          total: p.total,
          items: p.items || [] // Los items se cargan con JOIN en getAllPedidosCatalogo
        }));
        setPedidosCatalogo(mappedPedidos);
      }
    } catch (e) {
      console.error('Error in loadData:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Ya no usamos localStorage, los datos se guardan directamente en Supabase
  const saveMovimientos = (movs) => {
    setMovimientos(movs);
  };

  const saveCategorias = (cats) => {
    setCategorias(cats);
  };

  // Ya no usamos localStorage para registros
  const saveRegistros = (regs) => {
    setRegistros(regs);
  };

  // Calculations
  const calcularResumen = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    
    const ingresosHoy = movimientos.reduce((sum, m) => {
      return sum + ((m.tipo === 'ingreso' && m.fecha?.startsWith(hoy)) ? Number(m.monto || 0) : 0);
    }, 0);
    
    const egresosHoy = movimientos.reduce((sum, m) => {
      return sum + (((m.tipo === 'egreso' || m.tipo === 'gasto') && m.fecha?.startsWith(hoy)) ? Number(m.monto || 0) : 0);
    }, 0);
    
    const equilibrioHoy = ingresosHoy - egresosHoy;
    
    const balance = movimientos.reduce((acc, m) => {
      if (m.tipo === 'ingreso') return acc + Number(m.monto || 0);
      if (m.tipo === 'egreso' || m.tipo === 'gasto') return acc - Number(m.monto || 0);
      return acc;
    }, 0);
    
    let porCobrar = 0;
    pedidosCatalogo.forEach(p => {
      const total = Number(p.total || 0);
      const estadoPago = p.estadoPago || '';
      if (estadoPago === 'pagado' || estadoPago === 'pagado_total') return;
      if (estadoPago === 'seña_pagada') {
        const sena = Number(p.senaMonto || p.señaMonto || (total * 0.5));
        porCobrar += Math.max(0, total - sena);
      } else {
        porCobrar += total;
      }
    });
    
    return { ingresosHoy, egresosHoy, equilibrioHoy, balance, porCobrar };
  };

  const resumen = calcularResumen();

  // Handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const monto = parseFloat(formData.monto) || 0;
    if (monto <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    const hora = formData.hora || new Date().toTimeString().slice(0, 8);

    if (editingId) {
      // Edit mode - actualizar en Supabase
      const { error } = await updateMovimiento(editingId, {
        ...formData,
        monto,
        hora
      });
      
      if (error) {
        console.error('Error updating movimiento:', error);
        alert('Error al actualizar el movimiento');
        return;
      }
      
      // Recargar datos
      await loadData();
    } else {
      // Create mode - crear en Supabase
      const { error } = await createMovimiento({
        ...formData,
        monto,
        hora
      });
      
      if (error) {
        console.error('Error creating movimiento:', error);
        alert('Error al crear el movimiento');
        return;
      }
      
      // Recargar datos
      await loadData();
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      tipo: 'ingreso',
      monto: '',
      fecha: new Date().toISOString().slice(0, 10),
      hora: '',
      categoria: '',
      descripcion: '',
      metodoPago: 'efectivo'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (mov) => {
    setFormData({
      tipo: mov.tipo || 'ingreso',
      monto: mov.monto || '',
      fecha: mov.fecha || new Date().toISOString().slice(0, 10),
      hora: mov.hora || '',
      categoria: mov.categoria || '',
      descripcion: mov.descripcion || '',
      metodoPago: mov.metodoPago || 'efectivo'
    });
    setEditingId(mov.id);
    setShowForm(true);
  };

  // --- Confirm modal state & helpers ---
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });

  const openConfirm = ({ title, message, onConfirm }) => {
    setConfirmModal({ visible: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmModal({ visible: false, title: '', message: '', onConfirm: null });
  };

  // Actions to run after user confirms
  const handleEditConfirmed = (mov) => {
    // same logic as previous handleEdit
    setFormData({
      tipo: mov.tipo || 'ingreso',
      monto: mov.monto || '',
      fecha: mov.fecha || new Date().toISOString().slice(0, 10),
      hora: mov.hora || '',
      categoria: mov.categoria || '',
      descripcion: mov.descripcion || '',
      metodoPago: mov.metodoPago || 'efectivo'
    });
    setEditingId(mov.id);
    setShowForm(true);
  };

  const handleDeleteConfirmed = async (id) => {
    const { error } = await deleteMovimiento(id);
    
    if (error) {
      console.error('Error deleting movimiento:', error);
      alert('Error al eliminar el movimiento');
      return;
    }
    
    // Recargar datos
    await loadData();
  };

  // Open confirmation modal wrappers used from the UI
  const openEditConfirm = (mov) => {
    openConfirm({
      title: 'Editar movimiento',
      message: 'Se abrirá el formulario para editar este movimiento. ¿Deseas continuar?',
      onConfirm: () => {
        handleEditConfirmed(mov);
        closeConfirm();
      }
    });
  };

  const openDeleteConfirm = (id) => {
    openConfirm({
      title: 'Eliminar movimiento',
      message: '¿Estás seguro de que deseas eliminar este movimiento? Esta acción no se puede deshacer.',
      onConfirm: () => {
        handleDeleteConfirmed(id);
        closeConfirm();
      }
    });
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      alert('Ingrese el nombre de la categoría');
      return;
    }
    if (categorias.includes(name)) {
      alert('La categoría ya existe');
      return;
    }
    
    const { error } = await createCategoria(name);
    
    if (error) {
      console.error('Error creating categoria:', error);
      alert('Error al crear la categoría');
      return;
    }
    
    // Recargar datos
    await loadData();
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const handleDeleteCategory = async (name) => {
    if (!confirm(`¿Eliminar categoría "${name}"?`)) return;
    
    // Buscar el ID de la categoría por nombre
    const { data: cats } = await getCategorias();
    const categoria = (cats || []).find(c => c.nombre === name);
    
    if (!categoria) {
      alert('Categoría no encontrada');
      return;
    }
    
    const { error } = await deleteCategoria(categoria.id);
    
    if (error) {
      console.error('Error deleting categoria:', error);
      alert('Error al eliminar la categoría');
      return;
    }
    
    // Recargar datos
    await loadData();
  };

  const handleRenameCategory = (oldName) => {
    const newName = prompt('Renombrar categoría', oldName);
    if (!newName || newName === oldName) return;
    
    const trimmed = newName.trim();
    if (!trimmed || categorias.includes(trimmed)) {
      alert('Nombre inválido o ya existe');
      return;
    }
    
    const updatedCats = categorias.map(c => c === oldName ? trimmed : c);
    const updatedMovs = movimientos.map(m => 
      m.categoria === oldName ? { ...m, categoria: trimmed } : m
    );
    
    saveCategorias(updatedCats);
    saveMovimientos(updatedMovs);
  };

  // Registros
  const handleVerRegistros = () => {
    const regs = registros.filter(r => r.fecha === registroFecha);
    setRegistrosDelDia(regs);
  };

  const handleCerrarCaja = async () => {
    if (!confirm(`¿Cerrar caja para ${registroFecha}?`)) return;
    
    const movsDelDia = movimientos.filter(m => 
      m.fecha?.startsWith(registroFecha)
    );
    
    if (movsDelDia.length === 0) {
      alert('No hay movimientos para cerrar en esa fecha');
      return;
    }
    
    // Calcular totales por método de pago
    const efectivo = movsDelDia
      .filter(m => m.tipo === 'ingreso' && m.metodoPago === 'efectivo')
      .reduce((acc, m) => acc + m.monto, 0);
    
    const transferencia = movsDelDia
      .filter(m => m.tipo === 'ingreso' && m.metodoPago === 'transferencia')
      .reduce((acc, m) => acc + m.monto, 0);
    
    const tarjeta = movsDelDia
      .filter(m => m.tipo === 'ingreso' && m.metodoPago === 'tarjeta')
      .reduce((acc, m) => acc + m.monto, 0);
    
    const total = movsDelDia.reduce((acc, m) => 
      acc + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0
    );
    
    const { error } = await upsertRegistroCierre({
      fecha: registroFecha,
      efectivo,
      transferencia,
      tarjeta,
      total,
      observaciones: `Cierre automático - ${movsDelDia.length} movimientos`
    });
    
    if (error) {
      console.error('Error saving registro cierre:', error);
      alert('Error al cerrar la caja');
      return;
    }
    
    // Recargar datos
    await loadData();
    handleVerRegistros();
  };

  const toggleRegistroDetalle = (registroId) => {
    setExpandedRegistro(expandedRegistro === registroId ? null : registroId);
  };

  // Group by date
  const movimientosAgrupados = movimientos.reduce((acc, mov) => {
    const fecha = mov.fecha || 'Sin fecha';
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(mov);
    return acc;
  }, {});

  const fechasOrdenadas = Object.keys(movimientosAgrupados).sort((a, b) => b.localeCompare(a));

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };

  const formatDate = (dateStr) => {
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        return date.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <Layout>
      <div className={`${styles.container} ${darkMode ? styles.dark : ''}`}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Finanzas</h1>
            <p className={styles.subtitle}>Gestión de ingresos y gastos</p>
          </div>
          <div className={styles.headerControls}>
            <button
              className={styles.btnSmall}
              onClick={() => {
                const next = !darkMode;
                setDarkMode(next);
                try { localStorage.setItem('finanzas_dark', JSON.stringify(next)); } catch (e) {}
              }}
              aria-label="Toggle theme"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className={styles.summaryTopRow}>
          <div className={styles.summaryColumn}>
            <div className={styles.summaryCard}>
              <h3>Ingresos</h3>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryValue} ${styles.ingreso}`}>
                  {formatCurrency(resumen.ingresosHoy)}
                </div>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <h3>Egresos</h3>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryValue} ${styles.egreso}`}>
                  {formatCurrency(resumen.egresosHoy)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.summaryColumn}>
            <div className={styles.summaryCard}>
              <h3>Balance Total</h3>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryValue} ${styles.balance}`}>
                  {formatCurrency(resumen.balance)}
                </div>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <h3>Equilibrio Hoy</h3>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryValue} ${styles.equilibrio}`}>
                  {formatCurrency(resumen.equilibrioHoy)}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.summaryColumn}>
            <div className={styles.summaryCard}>
              <h3>Dinero disponible</h3>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue}>{formatCurrency(resumen.balance)}</div>
              </div>
            </div>

            <div className={styles.summaryCard}>
              <h3>Por cobrar</h3>
              <div className={styles.summaryItem}>
                <div className={`${styles.summaryValue} ${styles.porCobrar}`}>
                  {formatCurrency(resumen.porCobrar)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowForm(!showForm)}
          >
            Nuevo Movimiento
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h2>{editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h2>
              <p>Registra un ingreso, egreso o inversión en tu finanzas.</p>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Tipo de Movimiento</label>
                  <div className={styles.segmentedControl}>
                    <button
                      type="button"
                      className={formData.tipo === 'ingreso' ? styles.active : ''}
                      onClick={() => setFormData({...formData, tipo: 'ingreso'})}
                    >
                      💰 Ingreso
                    </button>
                    <button
                      type="button"
                      className={formData.tipo === 'egreso' ? styles.active : ''}
                      onClick={() => setFormData({...formData, tipo: 'egreso'})}
                    >
                      💸 Egreso
                    </button>
                    <button
                      type="button"
                      className={formData.tipo === 'inversion' ? styles.active : ''}
                      onClick={() => setFormData({...formData, tipo: 'inversion'})}
                    >
                      📈 Inversión
                    </button>
                  </div>
                </div>

                <div className={styles.formField}>
                  <label>Monto</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Ej: 15.000"
                      value={formatNumberWithThousands(formData.monto)}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/\D/g, '');
                        setFormData({...formData, monto: rawValue});
                      }}
                      required
                      style={{ paddingRight: '3rem' }}
                    />
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={() => {
                        setTempMonto(formData.monto);
                        setShowMontoModal(true);
                      }}
                      title="Usar teclado numérico"
                      style={{
                        position: 'absolute',
                        right: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        padding: '0.5rem',
                        fontSize: '1rem',
                        minWidth: 'auto',
                        height: 'auto'
                      }}
                    >
                      ⌨️
                    </button>
                  </div>
                </div>

                <div className={styles.formField}>
                  <label>Fecha</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    required
                  />
                </div>

                <div className={styles.formField}>
                  <label>Hora (opcional)</label>
                  <input
                    type="time"
                    className={styles.input}
                    value={formData.hora}
                    onChange={(e) => setFormData({...formData, hora: e.target.value})}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Método de Pago</label>
                  <select
                    className={styles.input}
                    value={formData.metodoPago}
                    onChange={(e) => setFormData({...formData, metodoPago: e.target.value})}
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia</option>
                  </select>
                </div>

                <div className={styles.formField}>
                  <label>Categoría</label>
                  <div className={styles.categoryControl}>
                    <select
                      className={styles.input}
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    >
                      <option value="">-- Selecciona una categoría --</option>
                      {categorias.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      title="Agregar nueva categoría"
                    >
                      ➕
                    </button>
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={() => setShowCategoryManager(!showCategoryManager)}
                      title="Gestionar categorías"
                    >
                      ⚙️
                    </button>
                  </div>
                  
                  {showAddCategory && (
                    <div className={styles.addCategoryRow}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Nombre de la nueva categoría"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                      />
                      <button type="button" className={styles.btnSmall} onClick={handleAddCategory}>
                        Guardar
                      </button>
                    </div>
                  )}
                  
                  {showCategoryManager && (
                    <div className={styles.categoryManager}>
                      {categorias.map(cat => (
                        <div key={cat} className={styles.categoryItem}>
                          <span>{cat}</span>
                          <div>
                            <button
                              type="button"
                              className={styles.btnSmall}
                              onClick={() => handleRenameCategory(cat)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className={styles.btnSmall}
                              onClick={() => handleDeleteCategory(cat)}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.formFieldFull}>
                  <label>Descripción (opcional)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="Ej: Venta de productos, Pago de servicios..."
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={resetForm}>
                  ❌ Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingId ? '✏️ Actualizar' : '💾 Guardar Movimiento'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Monto Modal */}
        {showMontoModal && (
          <div className="confirm-modal" role="dialog" aria-modal="true" onClick={() => setShowMontoModal(false)}>
            <div className="confirm-modal__backdrop" />
            <div className="confirm-modal__box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="confirm-modal__icon" style={{ fontSize: '2rem' }}>⌨️</div>
              <div className="confirm-modal__content">
                <div className="confirm-modal__title" style={{ fontSize: '1.25rem', fontWeight: '600' }}>Ingresar Monto</div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  margin: '1.5rem 0',
                  textAlign: 'center',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  borderRadius: '12px',
                  border: '2px solid #cbd5e1',
                  color: '#1e293b'
                }}>
                  ${formatNumberWithThousands(tempMonto) || '0'}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  {[1,2,3,4,5,6,7,8,9].map(num => (
                    <button
                      key={num}
                      onClick={() => setTempMonto(prev => prev + num)}
                      className={styles.keypadButton}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setTempMonto(prev => prev + '.')}
                    className={styles.keypadButton}
                  >
                    .
                  </button>
                  <button
                    onClick={() => setTempMonto(prev => prev + '0')}
                    className={styles.keypadButton}
                  >
                    0
                  </button>
                  <button
                    onClick={() => setTempMonto(prev => prev.slice(0, -1))}
                    className={styles.keypadButton}
                    style={{ background: '#ef4444', color: 'white' }}
                  >
                    ⌫
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    className="confirm-modal__close"
                    onClick={() => setShowMontoModal(false)}
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setFormData({...formData, monto: tempMonto});
                      setTempMonto('');
                      setShowMontoModal(false);
                    }}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    ✅ Aceptar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Movimientos */}
        <div className={styles.movimientos}>
          {fechasOrdenadas.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>💰</span>
              <h3>No hay movimientos registrados</h3>
              <p>Agrega ingresos o gastos para empezar a llevar el control.</p>
            </div>
          ) : (
            fechasOrdenadas.map(fecha => {
              const movsDelDia = movimientosAgrupados[fecha].sort((a, b) => {
                const timeA = a.hora || '00:00:00';
                const timeB = b.hora || '00:00:00';
                return timeB.localeCompare(timeA);
              });
              
              const subtotal = movsDelDia.reduce((sum, m) => 
                sum + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0
              );

              return (
                <div key={fecha} className={styles.group}>
                  <div className={styles.groupHeader}>
                    <div className={styles.groupDate}>{formatDate(fecha)}</div>
                    <div className={styles.groupSubtotal}>
                      Subtotal: {formatCurrency(subtotal)}
                    </div>
                  </div>
                  <div className={styles.groupBody}>
                    {movsDelDia.map(mov => (
                      <div key={mov.id} className={styles.movCard}>
                        <div className={styles.movTop}>
                          <div className={styles.movMeta}>
                            <strong>
                              <span className={`${styles.movBadge} ${styles[mov.tipo]}`}>
                                {mov.tipo === 'ingreso' ? 'Ingreso' : mov.tipo === 'egreso' ? 'Egreso' : 'Inversión'}
                              </span>
                              <span>{mov.categoria || 'Sin categoría'}</span>
                            </strong>
                            {mov.metodoPago && <span> - {mov.metodoPago}</span>}
                            <small> {mov.fecha} {mov.hora && `- ${mov.hora}`}</small>
                          </div>
                          <div className={`${styles.movAmount} ${styles[mov.tipo]}`}>
                            <span className={styles.amountPill}>{formatCurrency(mov.monto)}</span>
                          </div>
                        </div>
                        <div className={styles.movDesc}>{mov.descripcion}</div>
                        {mov.clienteName && (
                          <div className={styles.movCliente}>Cliente: {mov.clienteName}</div>
                        )}
                        <div className={styles.movActions}>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => openEditConfirm(mov)}
                          >
                            Editar
                          </button>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => openDeleteConfirm(mov.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Registros */}
        <div className={styles.registrosSection}>
          <h3>Registros (Cierre de caja)</h3>
          <div className={styles.registrosControls}>
            <input
              type="date"
              className={styles.input}
              value={registroFecha}
              onChange={(e) => setRegistroFecha(e.target.value)}
            />
            <button className={styles.btnSecondary} onClick={handleVerRegistros}>
              Ver
            </button>
            <button className={styles.btnPrimary} onClick={handleCerrarCaja}>
              Cerrar caja
            </button>
          </div>
          
          {registrosDelDia.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🗂️</span>
              <h4>No hay registros para la fecha seleccionada</h4>
            </div>
          ) : (
            <div className={styles.registrosList}>
              {registrosDelDia.map(reg => (
                <div key={reg.id} className={styles.registroCard}>
                  <div
                    className={styles.registroHeader}
                    onClick={() => toggleRegistroDetalle(reg.id)}
                  >
                    <div>
                      <strong>{reg.fecha}</strong> - Total: {formatCurrency(reg.total)}
                    </div>
                    <small>Cerrado: {new Date(reg.cerradoAt).toLocaleString()}</small>
                  </div>
                  
                  {expandedRegistro === reg.id && (
                    <div className={styles.registroDetalle}>
                      {reg.movimientos.map(movId => {
                        const mov = movimientos.find(m => m.id === movId);
                        if (!mov) return null;
                        return (
                          <div key={movId} className={styles.registroMov}>
                            <div>
                              <strong>{mov.categoria || 'Sin categoría'}</strong>
                              <small> {mov.fecha} {mov.hora && `- ${mov.hora}`}</small>
                              <div>{mov.descripcion}</div>
                            </div>
                            <div className={`${styles.movAmount} ${styles[mov.tipo]}`}>
                              {formatCurrency(mov.monto)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Confirm modal (reutiliza estilos globales en next-app/styles/globals.css) */}
        {confirmModal.visible && (
          <div className="confirm-modal" role="dialog" aria-modal="true" onClick={closeConfirm}>
            <div className="confirm-modal__backdrop" />
            <div className="confirm-modal__box" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-modal__icon">⚠️</div>
              <div className="confirm-modal__content">
                <div className="confirm-modal__title">{confirmModal.title}</div>
                <div className="confirm-modal__message">{confirmModal.message}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="confirm-modal__close" onClick={closeConfirm}>Cancelar</button>
                  <button
                    onClick={() => { if (confirmModal.onConfirm) confirmModal.onConfirm(); }}
                    style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 10, cursor: 'pointer' }}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default withAdminAuth(Finanzas);
