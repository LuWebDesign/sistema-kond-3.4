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
    title: promo?.title || '',
    type: promo?.type || 'percentage_discount',
    summary: promo?.summary || '',
    start: promo?.start || '',
    end: promo?.end || '',
    badge: promo?.badge || '',
    color: promo?.color || '#3b82f6',
    textColor: promo?.textColor || 'auto',
    tags: (promo?.tags || []).join(', '),
    active: promo?.active !== false,
    // asegurar productIds como array de Numbers para comparaciones fiables
    productIds: (promo?.productIds || []).map(id => Number(id)).filter(n => !Number.isNaN(n)),
    config: promo?.config || {}
  });
  const [errors, setErrors] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'El título es obligatorio'
    }

    // Productos requeridos para tipos que afectan precio
    if ((formData.productIds.length === 0) && formData.type !== 'free_shipping' && formData.type !== 'badge_only') {
      newErrors.productIds = 'Selecciona al menos un producto para la promoción'
    }

    // Fecha: si ambas están, validar orden
    if (formData.start && formData.end) {
      const s = new Date(formData.start)
      const eDate = new Date(formData.end)
      if (s > eDate) newErrors.date = 'La fecha de inicio no puede ser posterior a la fecha de fin'
    }

    // Validaciones por tipo
    if (formData.type === 'percentage_discount') {
      const pct = Number(formData.config.percentage || 0)
      if (!pct || pct <= 0 || pct >= 100) newErrors.percentage = 'Ingresa un porcentaje válido (1-99)'
    }

    if (formData.type === 'fixed_price') {
      const np = Number(formData.config.newPrice || 0)
      if (!np || np <= 0) newErrors.newPrice = 'Ingresa un precio válido (>0)'
    }

    if (formData.type === 'buy_x_get_y') {
      const buy = parseInt(formData.config.buyQuantity || 0, 10)
      const pay = parseInt(formData.config.payQuantity || 0, 10)
      if (!buy || buy <= 0) newErrors.buyQuantity = 'Cantidad a llevar inválida'
      if (!pay || pay <= 0) newErrors.payQuantity = 'Cantidad a pagar inválida'
      if (buy <= pay) newErrors.buyPay = 'La cantidad a llevar debe ser mayor que la cantidad a pagar'
    }

    if (formData.type === 'free_shipping') {
      const minA = Number(formData.config.minAmount || 0)
      if (minA && minA < 0) newErrors.minAmount = 'Compra mínima inválida'
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

    onSubmit({
      ...formData,
      tags,
      updatedAt: new Date().toISOString()
    });
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
    formData.textColor === 'auto' ? getContrastColor(formData.color) : formData.textColor;

  const typeConfig = PROMO_TYPES[formData.type];

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
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Título *</label>
                <input
                  type="text"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Tipo de promoción</label>
                <select
                  className={`${styles.select} ${isLight ? styles.selectLight : ''}`}
                  value={formData.type}
                  onChange={(e) => updateField('type', e.target.value)}
                >
                  {Object.entries(PROMO_TYPES).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <small className={styles.helpText}>{typeConfig?.description}</small>
              </div>

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
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.start}
                  onChange={(e) => updateField('start', e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Fecha de fin</label>
                <input
                  type="date"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.end}
                  onChange={(e) => updateField('end', e.target.value)}
                />
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Insignia (texto del badge)</label>
                <input
                  type="text"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.badge}
                  onChange={(e) => updateField('badge', e.target.value)}
                  placeholder="Ej: PROMO, OFERTA"
                />
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Color del badge</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                    value={formData.color}
                    onChange={(e) => updateField('color', e.target.value)}
                    style={{ width: 80, height: 40, padding: 4 }}
                  />
                  <select
                    className={`${styles.select} ${isLight ? styles.selectLight : ''}`}
                    value={formData.textColor}
                    onChange={(e) => updateField('textColor', e.target.value)}
                  >
                    <option value="auto">Auto</option>
                    <option value="#ffffff">⚪ Blanco</option>
                    <option value="#000000">⚫ Negro</option>
                  </select>
                  <div
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      background: formData.color,
                      color: previewTextColor,
                      fontWeight: 600,
                      minWidth: 80,
                      textAlign: 'center'
                    }}
                  >
                    {formData.badge || 'PROMO'}
                  </div>
                </div>
              </div>

              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Tags (separados por coma)</label>
                <input
                  type="text"
                  className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                  value={formData.tags}
                  onChange={(e) => updateField('tags', e.target.value)}
                  placeholder="verano, outlet"
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => updateField('active', e.target.checked)}
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
                      className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                      value={formData.config.percentage || ''}
                      onChange={(e) => updateConfig('percentage', parseFloat(e.target.value) || 0)}
                      min="1"
                      max="99"
                    />
                  </div>
                )}
                {typeConfig.fields.includes('newPrice') && (
                  <div className={styles.formField}>
                    <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Precio nuevo ($)</label>
                    <input
                      type="number"
                      className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                      value={formData.config.newPrice || ''}
                      onChange={(e) => updateConfig('newPrice', parseFloat(e.target.value) || 0)}
                      min="1"
                    />
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
                  </div>
                )}
                {typeConfig.fields.includes('minAmount') && (
                  <div className={styles.formField}>
                    <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Compra mínima ($)</label>
                    <input
                      type="number"
                      className={`${styles.input} ${isLight ? styles.inputLight : ''}`}
                      value={formData.config.minAmount || ''}
                      onChange={(e) => updateConfig('minAmount', parseFloat(e.target.value) || 0)}
                      min="1"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Selección de productos */}
              <div className={styles.formField}>
                <label className={`${styles.label} ${isLight ? styles.labelLight : ''}`}>Productos incluidos ({products.length} disponibles)</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button type="button" className={styles.btnSecondary} onClick={() => updateField('productIds', products.map(p => p.id))}>Seleccionar todos</button>
                <button type="button" className={styles.btnSecondary} onClick={() => updateField('productIds', [])}>Limpiar</button>
              </div>
              <div className={styles.productList} role="list">
                {products.map(p => {
                  const pid = Number(p.id)
                  const checked = Array.isArray(formData.productIds) && formData.productIds.includes(pid)
                  return (
                    <label key={p.id} className={styles.productItem} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="checkbox"
                        name="productIds"
                        value={String(pid)}
                        checked={checked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          const current = Array.isArray(formData.productIds) ? formData.productIds.slice() : []
                          if (e.target.checked) {
                            // add if not present
                            if (!current.includes(val)) current.push(val)
                            updateField('productIds', current)
                          } else {
                            // remove
                            updateField('productIds', current.filter(x => x !== val))
                          }
                        }}
                      />
                      <span style={{ flex: 1 }}>{p.nombre} <span style={{ color: '#9ca3af', marginLeft: 8 }}>#{p.id}</span></span>
                    </label>
                  )
                })}
              </div>
              <small className={styles.helpText}>Marca los productos que quieres incluir en la promoción</small>
              {errors.productIds && <div className={styles.fieldError}>{errors.productIds}</div>}
              {errors.date && <div className={styles.fieldError}>{errors.date}</div>}
              </div>

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
