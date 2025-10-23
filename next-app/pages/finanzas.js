import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import styles from '../styles/finanzas.module.css';

export default function Finanzas() {
  const [movimientos, setMovimientos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [categorias, setCategorias] = useState(['Ventas', 'Materia Prima', 'Servicios']);
  const [pedidosCatalogo, setPedidosCatalogo] = useState([]);
  
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

  useEffect(() => {
    loadData();
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

  const loadData = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const movs = JSON.parse(localStorage.getItem('finanzas') || '[]');
      const regs = JSON.parse(localStorage.getItem('registros') || '[]');
      const cats = JSON.parse(localStorage.getItem('categoriasFin') || '["Ventas", "Materia Prima", "Servicios"]');
      const pedidos = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]');
      
      setMovimientos(movs);
      setRegistros(regs);
      setCategorias(cats);
      setPedidosCatalogo(pedidos);
    } catch (e) {
      console.error('Error loading finanzas:', e);
    }
  };

  const saveMovimientos = (movs) => {
    localStorage.setItem('finanzas', JSON.stringify(movs));
    setMovimientos(movs);
  };

  const saveCategorias = (cats) => {
    localStorage.setItem('categoriasFin', JSON.stringify(cats));
    setCategorias(cats);
  };

  const saveRegistros = (regs) => {
    localStorage.setItem('registros', JSON.stringify(regs));
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
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const monto = parseFloat(formData.monto) || 0;
    if (monto <= 0) {
      alert('Ingrese un monto válido');
      return;
    }

    const hora = formData.hora || new Date().toTimeString().slice(0, 8);

    if (editingId) {
      // Edit mode
      const updated = movimientos.map(m => 
        m.id === editingId 
          ? { ...m, ...formData, monto, hora } 
          : m
      );
      saveMovimientos(updated);
    } else {
      // Create mode
      const newMov = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        ...formData,
        monto,
        hora,
        registrado: false
      };
      saveMovimientos([...movimientos, newMov]);
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

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return;
    const updated = movimientos.filter(m => m.id !== id);
    saveMovimientos(updated);
  };

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      alert('Ingrese el nombre de la categoría');
      return;
    }
    if (categorias.includes(name)) {
      alert('La categoría ya existe');
      return;
    }
    saveCategorias([...categorias, name]);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const handleDeleteCategory = (name) => {
    if (!confirm(`¿Eliminar categoría "${name}"?`)) return;
    saveCategorias(categorias.filter(c => c !== name));
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

  const handleCerrarCaja = () => {
    if (!confirm(`¿Cerrar caja para ${registroFecha}?`)) return;
    
    const movsDelDia = movimientos.filter(m => 
      m.fecha?.startsWith(registroFecha) && !m.registrado
    );
    
    if (movsDelDia.length === 0) {
      alert('No hay movimientos para cerrar en esa fecha');
      return;
    }
    
    const total = movsDelDia.reduce((acc, m) => 
      acc + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0
    );
    
    const newRegistro = {
      id: Date.now() + Math.floor(Math.random() * 100000),
      fecha: registroFecha,
      total,
      movimientos: movsDelDia.map(m => m.id),
      cerradoAt: new Date().toISOString()
    };
    
    saveRegistros([...registros, newRegistro]);
    
    const updatedMovs = movimientos.map(m => 
      m.fecha?.startsWith(registroFecha) ? { ...m, registrado: true } : m
    );
    saveMovimientos(updatedMovs);
    
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
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Finanzas</h1>
            <p className={styles.subtitle}>Gestión de ingresos y gastos</p>
          </div>
        </div>

        {/* Resumen */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <h3>Movimientos</h3>
            <div className={styles.summaryRow}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Ingresos</div>
                <div className={`${styles.summaryValue} ${styles.ingreso}`}>
                  {formatCurrency(resumen.ingresosHoy)}
                </div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryLabel}>Egresos</div>
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
            <h3>Estado Financiero</h3>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Dinero disponible</div>
              <div className={styles.summaryValue}>{formatCurrency(resumen.balance)}</div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.summaryLabel}>Por cobrar</div>
              <div className={`${styles.summaryValue} ${styles.porCobrar}`}>
                {formatCurrency(resumen.porCobrar)}
              </div>
            </div>
          </div>

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
                        <option key={cat} value={cat}>{cat}</option>
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
                        <div key={cat} className={styles.categoryItem}>
                          <span>{cat}</span>
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
                            {mov.metodoPago && <span> - {mov.metodoPago}</span>}
                            <small> {mov.fecha} {mov.hora && `- ${mov.hora}`}</small>
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
      </div>
    </Layout>
  );
}
