import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import withAdminAuth from '../components/withAdminAuth';
import styles from '../styles/finanzas.module.css';
import {
  getCategorias,
  createCategoria,
  deleteCategoria,
  updateCategoria,
  getMovimientos,
  createMovimiento,
  updateMovimiento,
  deleteMovimiento as deleteMovimientoApi,
  bulkUpdateMovimientosCategoria,
  getRegistrosCierre,
  getRegistroCierreByFecha,
  upsertRegistroCierre,
} from '../utils/supabaseFinanzas';
import { getAllPedidosCatalogo } from '../utils/supabasePedidos';

function Finanzas() {
  const [movimientos, setMovimientos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [pedidosCatalogo, setPedidosCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [movsRes, catsRes, regsRes, pedidosRes] = await Promise.all([
        getMovimientos(),
        getCategorias(),
        getRegistrosCierre(),
        getAllPedidosCatalogo(),
      ]);

      if (movsRes.data) setMovimientos(movsRes.data);
      if (catsRes.data) setCategorias(catsRes.data);
      if (regsRes.data) setRegistros(regsRes.data);
      if (pedidosRes.data) setPedidosCatalogo(pedidosRes.data);
    } catch (e) {
      console.error('Error loading finanzas:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations
  const calcularResumen = () => {
    const hoy = new Date().toISOString().slice(0, 10);
    
    const ingresosHoy = movimientos.reduce((sum, m) => {
      const fecha = typeof m.fecha === 'string' ? m.fecha : '';
      return sum + ((m.tipo === 'ingreso' && fecha.startsWith(hoy)) ? Number(m.monto || 0) : 0);
    }, 0);
    
    const egresosHoy = movimientos.reduce((sum, m) => {
      const fecha = typeof m.fecha === 'string' ? m.fecha : '';
      return sum + (((m.tipo === 'egreso' || m.tipo === 'gasto') && fecha.startsWith(hoy)) ? Number(m.monto || 0) : 0);
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
      const estadoPago = p.estado_pago || p.estadoPago || '';
      if (estadoPago === 'pagado' || estadoPago === 'pagado_total') return;
      if (estadoPago === 'seña_pagada') {
        const sena = Number(p.monto_recibido || p.senaMonto || p.señaMonto || (total * 0.5));
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

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await updateMovimiento(editingId, { ...formData, monto, hora });
        if (error) throw new Error(error);
      } else {
        const { error } = await createMovimiento({ ...formData, monto, hora });
        if (error) throw new Error(error);
      }
      await loadData();
      resetForm();
    } catch (err) {
      console.error('Error guardando movimiento:', err);
      alert('Error al guardar el movimiento: ' + err.message);
    } finally {
      setSaving(false);
    }
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
      fecha: typeof mov.fecha === 'string' ? mov.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10),
      hora: mov.hora || '',
      categoria: mov.categoria || '',
      descripcion: mov.descripcion || '',
      metodoPago: mov.metodo_pago || mov.metodoPago || 'efectivo'
    });
    setEditingId(mov.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    setSaving(true);
    try {
      const { error } = await deleteMovimientoApi(id);
      if (error) throw new Error(error);
      await loadData();
    } catch (err) {
      console.error('Error eliminando movimiento:', err);
      alert('Error al eliminar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      alert('Ingrese el nombre de la categoría');
      return;
    }
    if (categorias.some(c => c.nombre === name)) {
      alert('La categoría ya existe');
      return;
    }
    setSaving(true);
    try {
      const { error } = await createCategoria(name);
      if (error) throw new Error(error);
      await loadData();
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (err) {
      console.error('Error creando categoría:', err);
      alert('Error al crear categoría: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!confirm(`¿Eliminar categoría "${cat.nombre}"?`)) return;
    setSaving(true);
    try {
      const { error } = await deleteCategoria(cat.id);
      if (error) throw new Error(error);
      await loadData();
    } catch (err) {
      console.error('Error eliminando categoría:', err);
      alert('Error al eliminar categoría: ' + err.message);
    } finally {
      setSaving(false);
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
    
    setSaving(true);
    try {
      const { error: catError } = await updateCategoria(cat.id, trimmed);
      if (catError) throw new Error(catError);
      // Actualizar los movimientos que usan la categoría vieja
      await bulkUpdateMovimientosCategoria(cat.nombre, trimmed);
      await loadData();
    } catch (err) {
      console.error('Error renombrando categoría:', err);
      alert('Error al renombrar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Registros
  const handleVerRegistros = async () => {
    const { data } = await getRegistroCierreByFecha(registroFecha);
    setRegistrosDelDia(data ? [data] : []);
  };

  const handleCerrarCaja = async () => {
    if (!confirm(`¿Cerrar caja para ${registroFecha}?`)) return;
    
    const movsDelDia = movimientos.filter(m => {
      const fecha = typeof m.fecha === 'string' ? m.fecha : '';
      return fecha.startsWith(registroFecha);
    });
    
    if (movsDelDia.length === 0) {
      alert('No hay movimientos para cerrar en esa fecha');
      return;
    }
    
    const efectivo = movsDelDia
      .filter(m => (m.metodo_pago || m.metodoPago) === 'efectivo')
      .reduce((acc, m) => acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0);
    
    const transferencia = movsDelDia
      .filter(m => (m.metodo_pago || m.metodoPago) === 'transferencia')
      .reduce((acc, m) => acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0);
    
    const total = movsDelDia.reduce((acc, m) => 
      acc + (m.tipo === 'ingreso' ? Number(m.monto) : -Number(m.monto)), 0
    );
    
    setSaving(true);
    try {
      const { error } = await upsertRegistroCierre({
        fecha: registroFecha,
        efectivo,
        transferencia,
        tarjeta: 0,
        total,
      });
      if (error) throw new Error(error);
      await loadData();
      await handleVerRegistros();
    } catch (err) {
      console.error('Error cerrando caja:', err);
      alert('Error al cerrar caja: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRegistroDetalle = (registroId) => {
    setExpandedRegistro(expandedRegistro === registroId ? null : registroId);
  };

  // Group by date
  const movimientosAgrupados = movimientos.reduce((acc, mov) => {
    const fecha = (typeof mov.fecha === 'string' ? mov.fecha.slice(0, 10) : null) || 'Sin fecha';
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
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Finanzas</h1>
            <p className={styles.subtitle}>Gestión de ingresos y gastos</p>
          </div>
        </div>

        {loading ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>⏳</span>
            <h3>Cargando datos financieros...</h3>
          </div>
        ) : (
        <>
        {/* Resumen */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <h3>Movimientos</h3>
            <div className={styles.summaryRow}>
              <div>
                <div className={styles.summaryLabel}>Ingresos Hoy</div>
                <div className={`${styles.summaryValue} ${styles.ingreso}`}>
                  {formatCurrency(resumen.ingresosHoy)}
                </div>
              </div>
              <div>
                <div className={styles.summaryLabel}>Egresos Hoy</div>
                <div className={`${styles.summaryValue} ${styles.egreso}`}>
                  {formatCurrency(resumen.egresosHoy)}
                </div>
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Balance Total</div>
              <div className={`${styles.summaryValue} ${styles.balance}`}>
                {formatCurrency(resumen.balance)}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Equilibrio Hoy</div>
              <div className={`${styles.summaryValue} ${styles.equilibrio}`}>
                {formatCurrency(resumen.equilibrioHoy)}
              </div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Dinero disponible</div>
            <div className={styles.summaryValue}>{formatCurrency(resumen.balance)}</div>
            <div className={styles.summaryLabel}>Por cobrar</div>
            <div className={`${styles.summaryValue} ${styles.porCobrar}`}>
              {formatCurrency(resumen.porCobrar)}
            </div>
          </div>

          <button 
            className={styles.btnPrimary}
            onClick={() => setShowForm(!showForm)}
            disabled={saving}
          >
            + Nuevo Movimiento
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className={styles.formContainer}>
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
                              disabled={saving}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={styles.btnSmall}
                              onClick={() => handleDeleteCategory(cat)}
                              disabled={saving}
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
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')}
                </button>
              </div>
            </form>
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
                            <strong>{mov.categoria || 'Sin categoría'}</strong>
                            {(mov.metodo_pago || mov.metodoPago) && <span> - {mov.metodo_pago || mov.metodoPago}</span>}
                            <small> {typeof mov.fecha === 'string' ? mov.fecha.slice(0, 10) : mov.fecha} {mov.hora && `- ${mov.hora}`}</small>
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
                            disabled={saving}
                          >
                            Editar
                          </button>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => handleDelete(mov.id)}
                            disabled={saving}
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
            <button className={styles.btnSecondary} onClick={handleVerRegistros} disabled={saving}>
              Ver
            </button>
            <button className={styles.btnPrimary} onClick={handleCerrarCaja} disabled={saving}>
              {saving ? 'Procesando...' : 'Cerrar caja'}
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
                      <strong>{typeof reg.fecha === 'string' ? reg.fecha.slice(0, 10) : reg.fecha}</strong> - Total: {formatCurrency(reg.total)}
                    </div>
                    <small>Cerrado: {reg.created_at ? new Date(reg.created_at).toLocaleString() : '-'}</small>
                  </div>
                  
                  {expandedRegistro === reg.id && (
                    <div className={styles.registroDetalle}>
                      <div className={styles.registroMov}>
                        <div>
                          <strong>Efectivo</strong>
                        </div>
                        <div className={styles.movAmount}>
                          {formatCurrency(reg.efectivo || 0)}
                        </div>
                      </div>
                      <div className={styles.registroMov}>
                        <div>
                          <strong>Transferencia</strong>
                        </div>
                        <div className={styles.movAmount}>
                          {formatCurrency(reg.transferencia || 0)}
                        </div>
                      </div>
                      {reg.observaciones && (
                        <div className={styles.registroMov}>
                          <div>
                            <strong>Observaciones:</strong>
                            <div>{reg.observaciones}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </Layout>
  );
}

export default withAdminAuth(Finanzas);
