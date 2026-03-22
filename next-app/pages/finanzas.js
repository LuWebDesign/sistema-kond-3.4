import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/finanzas.module.css';
import {
  getMovimientos, createMovimiento, updateMovimiento, deleteMovimiento,
  getCategorias, createCategoria, deleteCategoria, updateCategoria, bulkUpdateMovimientosCategoria,
  getRegistrosCierre, upsertRegistroCierre
} from '../utils/supabaseFinanzas';
import { getPedidosCatalogoParaCalendario } from '../utils/supabasePedidos';

export default function Finanzas() {
  const [mounted, setMounted] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [pedidosCatalogo, setPedidosCatalogo] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Form fields — inicializar sin new Date() para evitar hidratación SSR/cliente
  const [formData, setFormData] = useState({
    tipo: 'ingreso',
    monto: '',
    fecha: '',
    hora: '',
    categoria: '',
    descripcion: '',
    metodoPago: 'efectivo'
  });

  // Registros
  const [registroFecha, setRegistroFecha] = useState('');
  const [registrosDelDia, setRegistrosDelDia] = useState([]);
  const [expandedRegistro, setExpandedRegistro] = useState(null);

  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    setFormData(prev => ({ ...prev, fecha: hoy }));
    setRegistroFecha(hoy);
    setMounted(true);
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Recargar cuando otro módulo registre un movimiento o cambie pedidos
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUpdate = () => loadData();
    window.addEventListener('finanzasUpdated', handleUpdate);
    window.addEventListener('pedidosCatalogo:updated', handleUpdate);
    return () => {
      window.removeEventListener('finanzasUpdated', handleUpdate);
      window.removeEventListener('pedidosCatalogo:updated', handleUpdate);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mapMov = (m) => ({ ...m, metodoPago: m.metodo_pago || 'efectivo' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [movsResult, catsResult, regsResult, pedidosResult] = await Promise.all([
        getMovimientos(),
        getCategorias(),
        getRegistrosCierre(),
        getPedidosCatalogoParaCalendario()
      ]);
      if (movsResult.data) setMovimientos(movsResult.data.map(mapMov));
      if (catsResult.data) setCategorias(catsResult.data);
      if (regsResult.data) setRegistros(regsResult.data);
      if (pedidosResult.data) setPedidosCatalogo(pedidosResult.data);
    } catch (e) {
      console.error('Error loading finanzas:', e);
    } finally {
      setLoading(false);
    }
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
    if (monto <= 0) { alert('Ingrese un monto válido'); return; }
    const hora = formData.hora || new Date().toTimeString().slice(0, 8);

    if (editingId) {
      const { data } = await updateMovimiento(editingId, { ...formData, monto, hora });
      if (data) setMovimientos(movimientos.map(m => m.id === editingId ? mapMov(data) : m));
    } else {
      const { data } = await createMovimiento({ ...formData, monto, hora });
      if (data) setMovimientos([mapMov(data), ...movimientos]);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      tipo: 'ingreso',
      monto: '',
      fecha: typeof window !== 'undefined' ? new Date().toISOString().slice(0, 10) : '',
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

  const handleDelete = (id) => {
    const doDelete = async () => {
      const { error } = await deleteMovimiento(id);
      if (!error) setMovimientos(movimientos.filter(m => m.id !== id));
    };
    if (typeof window !== 'undefined' && window.showCustomConfirm) {
      window.showCustomConfirm('Eliminar movimiento', '¿Eliminar este movimiento?', doDelete);
    } else {
      doDelete();
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) { alert('Ingrese el nombre de la categoría'); return; }
    if (categorias.some(c => c.nombre === name)) { alert('La categoría ya existe'); return; }
    const { data } = await createCategoria(name);
    if (data) setCategorias([...categorias, data]);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const handleDeleteCategory = (cat) => {
    const doDelete = async () => {
      const { error } = await deleteCategoria(cat.id);
      if (!error) setCategorias(categorias.filter(c => c.id !== cat.id));
    };
    if (typeof window !== 'undefined' && window.showCustomConfirm) {
      window.showCustomConfirm('Eliminar categoría', `¿Eliminar categoría "${cat.nombre}"?`, doDelete);
    } else {
      doDelete();
    }
  };

  const handleRenameCategory = async (cat) => {
    const newName = prompt('Renombrar categoría', cat.nombre);
    if (!newName || newName === cat.nombre) return;
    const trimmed = newName.trim();
    if (!trimmed || categorias.some(c => c.nombre === trimmed)) {
      alert('Nombre inválido o ya existe');
      return;
    }
    const { data: updatedCat } = await updateCategoria(cat.id, trimmed);
    if (updatedCat) {
      setCategorias(categorias.map(c => c.id === cat.id ? updatedCat : c));
      await bulkUpdateMovimientosCategoria(cat.nombre, trimmed);
      const { data: movsData } = await getMovimientos();
      if (movsData) setMovimientos(movsData.map(mapMov));
    }
  };

  // Registros
  const handleVerRegistros = () => {
    const regs = registros.filter(r => r.fecha === registroFecha);
    setRegistrosDelDia(regs);
  };

  const handleCerrarCaja = () => {
    const doClose = async () => {
      const movsDelDia = movimientos.filter(m => m.fecha === registroFecha);
      if (movsDelDia.length === 0) {
        alert('No hay movimientos para la fecha seleccionada');
        return;
      }
      const total = movsDelDia.reduce((acc, m) =>
        acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0
      );
      const { data } = await upsertRegistroCierre({ fecha: registroFecha, total });
      if (data) {
        const { data: regsData } = await getRegistrosCierre();
        if (regsData) setRegistros(regsData);
        handleVerRegistros();
      }
    };
    if (typeof window !== 'undefined' && window.showCustomConfirm) {
      window.showCustomConfirm('Cerrar caja', `¿Registrar cierre de caja para ${registroFecha}?`, doClose);
    } else {
      doClose();
    }
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

  if (!mounted) return null;

  if (loading) return (
    <Layout>
      <div className={styles.loadingContainer}>Cargando finanzas...</div>
    </Layout>
  );

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Finanzas</h1>
            <p className={styles.subtitle}>Gestión de ingresos, egresos e inversiones</p>
          </div>
          <button 
            className={styles.btnPrimary}
            onClick={() => setShowForm(!showForm)}
          >
            + Nuevo Movimiento
          </button>
        </div>

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiIcon}>📈</span>
            <span className={styles.kpiLabel}>Ingresos hoy</span>
            <span className={`${styles.kpiValue} ${styles.ingreso}`}>
              {formatCurrency(resumen.ingresosHoy)}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiIcon}>📉</span>
            <span className={styles.kpiLabel}>Egresos hoy</span>
            <span className={`${styles.kpiValue} ${styles.egreso}`}>
              {formatCurrency(resumen.egresosHoy)}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiIcon}>⚖️</span>
            <span className={styles.kpiLabel}>Equilibrio hoy</span>
            <span className={`${styles.kpiValue} ${resumen.equilibrioHoy >= 0 ? styles.equilibrio : styles.negative}`}>
              {formatCurrency(resumen.equilibrioHoy)}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiIcon}>💰</span>
            <span className={styles.kpiLabel}>Balance total</span>
            <span className={`${styles.kpiValue} ${resumen.balance >= 0 ? styles.balance : styles.negative}`}>
              {formatCurrency(resumen.balance)}
            </span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiIcon}>🧾</span>
            <span className={styles.kpiLabel}>Por cobrar</span>
            <span className={`${styles.kpiValue} ${styles.porCobrar}`}>
              {formatCurrency(resumen.porCobrar)}
            </span>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className={styles.formContainer}>
            <h3 className={styles.formTitle}>{editingId ? '✏️ Editar Movimiento' : '➕ Nuevo Movimiento'}</h3>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Tipo</label>
                  <div className={styles.segmentedControl}>
                    <button
                      type="button"
                      className={formData.tipo === 'ingreso' ? styles.active : ''}
                      onClick={() => setFormData({...formData, tipo: 'ingreso'})}
                    >
                      Ingreso
                    </button>
                    <button
                      type="button"
                      className={formData.tipo === 'egreso' ? styles.active : ''}
                      onClick={() => setFormData({...formData, tipo: 'egreso'})}
                    >
                      Egreso
                    </button>
                    <button
                      type="button"
                      className={formData.tipo === 'inversion' ? styles.active : ''}
                      onClick={() => setFormData({...formData, tipo: 'inversion'})}
                    >
                      Inversión
                    </button>
                  </div>
                </div>

                <div className={styles.formField}>
                  <label>Monto ($)</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={formData.monto}
                    onChange={(e) => setFormData({...formData, monto: e.target.value})}
                    required
                  />
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
                  <label>Hora</label>
                  <input
                    type="time"
                    className={styles.input}
                    value={formData.hora}
                    onChange={(e) => setFormData({...formData, hora: e.target.value})}
                  />
                </div>

                <div className={styles.formField}>
                  <label>Categoría</label>
                  <div className={styles.categoryControl}>
                    <select
                      className={styles.input}
                      value={formData.categoria}
                      onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    >
                      <option value="">-- Sin categoría --</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={() => setShowAddCategory(!showAddCategory)}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className={styles.btnSmall}
                      onClick={() => setShowCategoryManager(!showCategoryManager)}
                    >
                      Gestionar
                    </button>
                  </div>
                  
                  {showAddCategory && (
                    <div className={styles.addCategoryRow}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Nueva categoría"
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
                        <div key={cat.id} className={styles.categoryItem}>
                          <span>{cat.nombre}</span>
                          <div>
                            <button
                              type="button"
                              className={styles.btnSmall}
                              onClick={() => handleRenameCategory(cat)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={styles.btnSmall}
                              onClick={() => handleDeleteCategory(cat)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.formField}>
                  <label>Método de pago</label>
                  <select
                    className={styles.input}
                    value={formData.metodoPago}
                    onChange={(e) => setFormData({...formData, metodoPago: e.target.value})}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                <div className={styles.formFieldFull}>
                  <label>Descripción</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={resetForm}>
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Movimientos */}
        <h3 className={styles.sectionTitle}>Movimientos</h3>
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
                            <span className={`${styles.movBadge} ${styles[mov.tipo]}`}>{mov.tipo}</span>
                            <strong>{mov.categoria || 'Sin categoría'}</strong>
                            {mov.metodoPago && <span> · {mov.metodoPago}</span>}
                            <small>{mov.hora && `${mov.hora}`}</small>
                          </div>
                          <div className={`${styles.movAmount} ${styles[mov.tipo]}`}>
                            {formatCurrency(mov.monto)}
                          </div>
                        </div>
                        <div className={styles.movDesc}>{mov.descripcion}</div>
                        {mov.clienteName && (
                          <div className={styles.movCliente}>Cliente: {mov.clienteName}</div>
                        )}
                        <div className={styles.movActions}>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => handleEdit(mov)}
                          >
                            Editar
                          </button>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => handleDelete(mov.id)}
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
          <h3 className={styles.sectionTitle}>Registros (Cierre de caja)</h3>
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
                      {movimientos.filter(m => m.fecha === reg.fecha).map(mov => (
                        <div key={mov.id} className={styles.registroMov}>
                          <div>
                            <strong>{mov.categoria || 'Sin categoría'}</strong>
                            <small> {mov.fecha} {mov.hora && `- ${mov.hora}`}</small>
                            <div>{mov.descripcion}</div>
                          </div>
                          <div className={`${styles.movAmount} ${styles[mov.tipo]}`}>
                            {formatCurrency(mov.monto)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
