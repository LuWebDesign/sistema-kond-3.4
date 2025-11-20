import { useState } from 'react';
import styles from '../../styles/marketing.module.css';

const PROMO_TYPES = {
  percentage_discount: {
    label: 'Descuento Porcentual',
    fields: ['percentage'],
    description: 'Reducir precio en % del original'
  },
  fixed_price: {
    label: 'Precio Fijo',
    fields: ['newPrice'],
    description: 'Establecer precio fijo específico'
  },
  buy_x_get_y: {
    label: '2x1 / Lleva X Paga Y',
    fields: ['buyQuantity', 'payQuantity'],
    description: 'Oferta de cantidad: lleva X unidades y paga Y'
  },
  free_shipping: {
    label: 'Envío Gratis',
    fields: ['minAmount'],
    description: 'Envío gratuito con compra mínima'
  },
  badge_only: {
    label: 'Solo Insignia',
    fields: [],
    description: 'Solo mostrar badge sin cambio de precio'
  }
};

function getContrastColor(hexColor) {
  if (!hexColor || hexColor === 'auto') hexColor = '#3b82f6';
  if (!hexColor.startsWith('#')) hexColor = '#' + hexColor;
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export default function PromoModal({ promo, products, onSubmit, onClose, isLight = false }) {
  const isEdit = !!promo;
  const [formData, setFormData] = useState({
    nombre: promo?.nombre || '',
    tipo: promo?.tipo || 'percentage_discount',
    summary: promo?.summary || '',
    fechaInicio: promo?.fechaInicio || '',
    fechaFin: promo?.fechaFin || '',
    badgeTexto: promo?.badgeTexto || '',
    badgeColor: promo?.badgeColor || '#3b82f6',
    badgeTextColor: promo?.badgeTextColor || 'auto',
    tags: (promo?.tags || []).join(', '),
    activo: promo?.activo !== false,
    aplicaA: promo?.aplicaA || 'todos',
    categoria: promo?.categoria || null,
    productoId: promo?.productoId || null,
    descuentoPorcentaje: promo?.descuentoPorcentaje || null,
    descuentoMonto: promo?.descuentoMonto || null,
    precioEspecial: promo?.precioEspecial || null,
    prioridad: promo?.prioridad || 0,
    config: promo?.config || {}
  });
  const [errors, setErrors] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {}

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio'
    }

    // Validar aplicaA y productoId
    if (formData.aplicaA === 'producto' && !formData.productoId) {
      newErrors.productoId = 'Selecciona un producto para la promoción'
    }
    if (formData.aplicaA === 'categoria' && !formData.categoria) {
      newErrors.categoria = 'Selecciona una categoría para la promoción'
    }

    // Fecha: si ambas están, validar orden
    if (formData.fechaInicio && formData.fechaFin) {
      const s = new Date(formData.fechaInicio)
      const eDate = new Date(formData.fechaFin)
      if (s > eDate) newErrors.date = 'La fecha de inicio no puede ser posterior a la fecha de fin'
    }

    // Validaciones por tipo
    if (formData.tipo === 'percentage_discount') {
      const pct = Number(formData.descuentoPorcentaje || 0)
      if (!pct || pct <= 0 || pct >= 100) newErrors.descuentoPorcentaje = 'Ingresa un porcentaje válido (1-99)'
    }

    if (formData.tipo === 'fixed_price') {
      const np = Number(formData.precioEspecial || 0)
      if (!np || np <= 0) newErrors.precioEspecial = 'Ingresa un precio válido (>0)'
    }

    if (formData.tipo === 'buy_x_get_y') {
      const buy = parseInt(formData.config.buyQuantity || 0, 10)
      const pay = parseInt(formData.config.payQuantity || 0, 10)
      if (!buy || buy <= 0) newErrors.buyQuantity = 'Cantidad a llevar inválida'
      if (!pay || pay <= 0) newErrors.payQuantity = 'Cantidad a pagar inválida'
      if (buy <= pay) newErrors.buyPay = 'La cantidad a llevar debe ser mayor que la cantidad a pagar'
    }

    if (formData.tipo === 'free_shipping') {
      const minA = Number(formData.descuentoMonto || 0)
      if (minA && minA < 0) newErrors.descuentoMonto = 'Monto mínimo inválido'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      // scroll to first error field (best-effort)
      const firstKey = Object.keys(newErrors)[0]
      const el = document.querySelector(`[name="${firstKey}"]`) || document.querySelector('.' + firstKey)
      if (el && el.focus) el.focus()
      return
    }

    const tags = formData.tags.trim() ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Construir objeto para Supabase
    const promoData = {
      nombre: formData.nombre,
      tipo: formData.tipo,
      aplicaA: formData.aplicaA,
      categoria: formData.aplicaA === 'categoria' ? formData.categoria : null,
      productoId: formData.aplicaA === 'producto' ? formData.productoId : null,
      fechaInicio: formData.fechaInicio || null,
      fechaFin: formData.fechaFin || null,
      activo: formData.activo,
      prioridad: formData.prioridad,
      badgeTexto: formData.badgeTexto || null,
      badgeColor: formData.badgeColor || '#3b82f6',
      badgeTextColor: formData.badgeTextColor === 'auto' ? getContrastColor(formData.badgeColor) : formData.badgeTextColor,
      descuentoPorcentaje: formData.tipo === 'percentage_discount' ? parseFloat(formData.descuentoPorcentaje) : null,
      descuentoMonto: formData.tipo === 'free_shipping' ? parseFloat(formData.descuentoMonto || 0) : null,
      precioEspecial: formData.tipo === 'fixed_price' ? parseFloat(formData.precioEspecial) : null,
      config: formData.tipo === 'buy_x_get_y' ? {
        buyQuantity: parseInt(formData.config.buyQuantity || 0, 10),
        payQuantity: parseInt(formData.config.payQuantity || 0, 10)
      } : null,
      valor: null // Este campo lo mantenemos por compatibilidad pero no lo usamos
    };

    // console.log('🎯 PromoModal - Datos enviados al handler:', promoData);
    onSubmit(promoData);
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateConfig = (field, value) => {
    setFormData(prev => ({
      ...prev,
      config: { ...prev.config, [field]: value }
    }));
  };

  const previewTextColor =
    formData.badgeTextColor === 'auto' ? getContrastColor(formData.badgeColor) : formData.badgeTextColor;

  const typeConfig = PROMO_TYPES[formData.tipo];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
  <div className={`${styles.modalContent} ${isLight ? styles.modalContentLight : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeModal} onClick={onClose}>×</button>
        <div className={`${styles.modalHeader} ${isLight ? styles.modalHeaderLight : ''}`}>
          <h3>{isEdit ? 'Editar Promoción' : 'Nueva Promoción'}</h3>
        </div>
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.nombre}
                  onChange={(e) => updateField('nombre', e.target.value)}
                  required
                />
                {errors.nombre && <small className={styles.errorText}>{errors.nombre}</small>}
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Tipo de promoción</label>
                <select
                  name="tipo"
                  className={`${styles.select} ${isLight ? styles.selectLight : ''}`}
                  value={formData.tipo}
                  onChange={(e) => updateField('tipo', e.target.value)}
                >
                  {Object.entries(PROMO_TYPES).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <small className={styles.helpText}>{typeConfig?.description}</small>
              </div>

              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Aplica a</label>
                <select
                  name="aplicaA"
                  className={`${styles.select} ${isLight ? styles.selectLight : ''}`}
                  value={formData.aplicaA}
                  onChange={(e) => updateField('aplicaA', e.target.value)}
                >
                  <option value="todos">Todos los productos</option>
                  <option value="categoria">Categoría específica</option>
                  <option value="producto">Producto específico</option>
                </select>
                {errors.aplicaA && <small className={styles.errorText}>{errors.aplicaA}</small>}
              </div>

              {formData.aplicaA === 'categoria' && (
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Categoría *</label>
                  <select
                    name="categoria"
                    className={`${styles.select} ${isLight ? styles.selectLight : ''}`}
                    value={formData.categoria || ''}
                    onChange={(e) => updateField('categoria', e.target.value)}
                  >
                    <option value="">Selecciona una categoría</option>
                    {[...new Set(products.map(p => p.categoria))].filter(Boolean).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {errors.categoria && <small className={styles.errorText}>{errors.categoria}</small>}
                </div>
              )}

              {formData.aplicaA === 'producto' && (
                <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                  <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Producto *</label>
                  <select
                    name="productoId"
                    className={`${styles.select} ${isLight ? styles.selectLight : ''}`}
                    value={formData.productoId || ''}
                    onChange={(e) => updateField('productoId', parseInt(e.target.value) || null)}
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} (${p.precioUnitario || 0})</option>
                    ))}
                  </select>
                  {errors.productoId && <small className={styles.errorText}>{errors.productoId}</small>}
                </div>
              )}

              <div className={styles.formField} style={{ gridColumn: '1 / -1' }}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Descripción</label>
                <input
                  type="text"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  placeholder="Resumen corto de la promoción"
                />
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Fecha de inicio</label>
                <input
                  type="date"
                  name="fechaInicio"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.fechaInicio}
                  onChange={(e) => updateField('fechaInicio', e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Fecha de fin</label>
                <input
                  type="date"
                  name="fechaFin"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.fechaFin}
                  onChange={(e) => updateField('fechaFin', e.target.value)}
                />
                {errors.date && <small className={styles.errorText}>{errors.date}</small>}
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Insignia (texto del badge)</label>
                <input
                  type="text"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.badgeTexto}
                  onChange={(e) => updateField('badgeTexto', e.target.value)}
                  placeholder="Ej: PROMO, OFERTA"
                />
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Color del badge</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                    value={formData.badgeColor}
                    onChange={(e) => updateField('badgeColor', e.target.value)}
                    style={{ width: 80, height: 40, padding: 4 }}
                  />
                  <select
                    className={`${styles.select} ${isLight ? styles.selectLight : ''}`}
                    value={formData.badgeTextColor}
                    onChange={(e) => updateField('badgeTextColor', e.target.value)}
                  >
                    <option value="auto">Auto</option>
                    <option value="#ffffff">⚪ Blanco</option>
                    <option value="#000000">⚫ Negro</option>
                  </select>
                  <div
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      background: formData.badgeColor,
                      color: previewTextColor,
                      fontWeight: 600,
                      minWidth: 80,
                      textAlign: 'center'
                    }}
                  >
                    {formData.badgeTexto || 'PROMO'}
                  </div>
                </div>
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Prioridad (0-100)</label>
                <input
                  type="number"
                  name="prioridad"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.prioridad}
                  onChange={(e) => updateField('prioridad', parseInt(e.target.value) || 0)}
                  min="0"
                  max="100"
                />
                <small className={styles.helpText}>Mayor prioridad = se muestra primero</small>
              </div>

              <div className={styles.formField}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => updateField('activo', e.target.checked)}
                  />
                  Activa
                </label>
              </div>
            </div>

            {/* Campos específicos por tipo */}
            {typeConfig && typeConfig.fields.length > 0 && (
              <div className={styles.specificFields}>
                <h4>Configuración específica</h4>
                {typeConfig.fields.includes('percentage') && (
                  <div className={styles.formField}>
                    <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Descuento (%)</label>
                    <input
                      type="number"
                      name="descuentoPorcentaje"
                      className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                      value={formData.descuentoPorcentaje || ''}
                      onChange={(e) => updateField('descuentoPorcentaje', parseFloat(e.target.value) || null)}
                      min="1"
                      max="99"
                      step="0.01"
                    />
                    {errors.descuentoPorcentaje && <small className={styles.errorText}>{errors.descuentoPorcentaje}</small>}
                  </div>
                )}
                {typeConfig.fields.includes('newPrice') && (
                  <div className={styles.formField}>
                    <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Precio especial ($)</label>
                    <input
                      type="number"
                      name="precioEspecial"
                      className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                      value={formData.precioEspecial || ''}
                      onChange={(e) => updateField('precioEspecial', parseFloat(e.target.value) || null)}
                      min="1"
                      step="0.01"
                    />
                    {errors.precioEspecial && <small className={styles.errorText}>{errors.precioEspecial}</small>}
                  </div>
                )}
                {typeConfig.fields.includes('buyQuantity') && (
                  <div className={styles.formField}>
                    <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Cantidad a llevar</label>
                    <input
                      type="number"
                      className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                      value={formData.config.buyQuantity || ''}
                      onChange={(e) => updateConfig('buyQuantity', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                    {errors.buyQuantity && <small className={styles.errorText}>{errors.buyQuantity}</small>}
                  </div>
                )}
                {typeConfig.fields.includes('payQuantity') && (
                  <div className={styles.formField}>
                    <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Cantidad a pagar</label>
                    <input
                      type="number"
                      className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                      value={formData.config.payQuantity || ''}
                      onChange={(e) => updateConfig('payQuantity', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                    {errors.payQuantity && <small className={styles.errorText}>{errors.payQuantity}</small>}
                  </div>
                )}
                {typeConfig.fields.includes('minAmount') && (
                  <div className={styles.formField}>
                    <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Monto mínimo de compra ($)</label>
                    <input
                      type="number"
                      name="descuentoMonto"
                      className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                      value={formData.descuentoMonto || ''}
                      onChange={(e) => updateField('descuentoMonto', parseFloat(e.target.value) || null)}
                      min="0"
                      step="0.01"
                    />
                    {errors.descuentoMonto && <small className={styles.errorText}>{errors.descuentoMonto}</small>}
                  </div>
                )}
              </div>
            )}

            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary}>
                {isEdit ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
