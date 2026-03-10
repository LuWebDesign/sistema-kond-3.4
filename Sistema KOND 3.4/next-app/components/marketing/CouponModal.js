import { useState } from 'react';
import styles from '../../styles/marketing.module.css';

export default function CouponModal({ coupon, onSubmit, onClose }) {
  const isEdit = !!coupon;
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    description: coupon?.description || '',
    type: coupon?.type || 'percentage',
    value: coupon?.value || '',
    minAmount: coupon?.minAmount || '',
    minQuantity: coupon?.minQuantity || '',
    start: coupon?.start || '',
    end: coupon?.end || '',
    active: coupon?.active !== false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const code = formData.code.trim().toUpperCase().replace(/\s/g, '');
    if (!code) {
      alert('El código del cupón es requerido');
      return;
    }
    if (!/^[A-Z0-9]+$/.test(code)) {
      alert('El código solo puede contener letras mayúsculas y números (sin espacios ni caracteres especiales)');
      return;
    }

    const value = parseFloat(formData.value) || 0;
    if (value <= 0) {
      alert('El valor del descuento debe ser mayor a 0');
      return;
    }
    if (formData.type === 'percentage' && value > 100) {
      alert('El porcentaje de descuento no puede ser mayor a 100%');
      return;
    }

    onSubmit({
      ...formData,
      code,
      value,
      minAmount: formData.minAmount > 0 ? parseFloat(formData.minAmount) : undefined,
      minQuantity: formData.minQuantity > 0 ? parseInt(formData.minQuantity) : undefined,
      start: formData.start || undefined,
      end: formData.end || undefined,
      updatedAt: new Date().toISOString()
    });
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeModal} onClick={onClose}>×</button>
        <div className={styles.modalHeader}>
          <h3>{isEdit ? 'Editar Cupón' : 'Nuevo Cupón'}</h3>
        </div>
        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formField}>
              <label className={styles.label}>Código del cupón *</label>
              <input
                type="text"
                className={styles.input}
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value)}
                placeholder="Ej: LASER10, 5X1LLAVEROS"
                required
              />
              <small className={styles.helpText}>
                El código que ingresará el cliente (solo letras y números, sin espacios)
              </small>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Descripción</label>
              <input
                type="text"
                className={styles.input}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Ej: 10% de descuento en toda la tienda"
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Tipo de descuento *</label>
              <select
                className={styles.input}
                value={formData.type}
                onChange={(e) => updateField('type', e.target.value)}
                required
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Valor del descuento *</label>
              <input
                type="number"
                className={styles.input}
                value={formData.value}
                onChange={(e) => updateField('value', e.target.value)}
                placeholder="Ej: 10 (para 10% o $10)"
                min="0"
                step="0.01"
                required
              />
              <small className={styles.helpText}>
                Para porcentaje: número entre 0-100. Para fijo: monto en pesos
              </small>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Monto mínimo de compra</label>
              <input
                type="number"
                className={styles.input}
                value={formData.minAmount}
                onChange={(e) => updateField('minAmount', e.target.value)}
                placeholder="Ej: 10000"
                min="0"
                step="100"
              />
              <small className={styles.helpText}>
                Opcional: monto mínimo de carrito para aplicar el cupón
              </small>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Cantidad mínima de productos</label>
              <input
                type="number"
                className={styles.input}
                value={formData.minQuantity}
                onChange={(e) => updateField('minQuantity', e.target.value)}
                placeholder="Ej: 5"
                min="0"
                step="1"
              />
              <small className={styles.helpText}>
                Opcional: cantidad mínima de productos en el carrito
              </small>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Fecha de inicio</label>
              <input
                type="date"
                className={styles.input}
                value={formData.start}
                onChange={(e) => updateField('start', e.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Fecha de fin</label>
              <input
                type="date"
                className={styles.input}
                value={formData.end}
                onChange={(e) => updateField('end', e.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => updateField('active', e.target.checked)}
                />
                Cupón activo
              </label>
            </div>

            <div className={styles.formActions}>
              <button type="button" className={styles.btnSecondary} onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className={styles.btnPrimary}>
                {isEdit ? 'Guardar cambios' : 'Crear cupón'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
