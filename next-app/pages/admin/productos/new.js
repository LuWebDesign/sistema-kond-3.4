import Layout from '../../../components/Layout'
import withAdminAuth from '../../../components/withAdminAuth'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, STALE_TIMES } from '../../../lib/queryKeys'
import { createProducto } from '../../../utils/supabaseProducts'
import { escapeHtml } from '../../../utils/catalogUtils'

async function fetchCategorias() {
  const res = await fetch('/api/admin/categorias')
  if (!res.ok) throw new Error('Error al cargar categorías')
  const json = await res.json()
  return json.data || []
}

const TIPOS = ['Corte Laser', 'Stock', 'Venta', 'Presupuesto']
const ENSAMBLES = ['Sin ensamble', 'Ensamble básico', 'Ensamble completo']

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: '8px',
  border: '1px solid var(--border-color)', fontSize: '0.95rem',
  background: 'var(--bg-primary, #fff)', color: 'var(--text-primary)',
  boxSizing: 'border-box',
}

function labelStyle(required) {
  return { display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem' }
}

function NuevoProducto() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    nombre: '',
    tipo: 'Stock',
    medidas: '',
    precioUnitario: '',
    stock: '',
    description: '',
    ensamble: 'Sin ensamble',
  })
  const [categoriaIdPadre, setCategoriaIdPadre] = useState('')
  const [categoriaIdHijo, setCategoriaIdHijo] = useState('')
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [loading, setLoading] = useState(false)

  const { data: categorias = [] } = useQuery({
    queryKey: QUERY_KEYS.categorias.list(),
    queryFn: fetchCategorias,
    staleTime: STALE_TIMES.categorias,
  })

  const padres = categorias.filter(c => c.parent_id === null)
  const hijos = categoriaIdPadre
    ? categorias.filter(c => String(c.parent_id) === String(categoriaIdPadre))
    : []

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const handlePadreChange = (e) => {
    setCategoriaIdPadre(e.target.value)
    setCategoriaIdHijo('') // reset subcategory when parent changes
  }

  const validate = () => {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido'
    if (!form.precioUnitario || Number(form.precioUnitario) <= 0) errs.precioUnitario = 'El precio debe ser mayor a 0'
    return errs
  }

  // Determine final categoria_id:
  // - If subcategory selected → subcategory id
  // - Else if parent selected → parent id
  // - Else null
  const resolvedCategoriaId = categoriaIdHijo
    ? Number(categoriaIdHijo)
    : categoriaIdPadre
      ? Number(categoriaIdPadre)
      : null

  // For the text `categoria` field: find the name of the resolved categoria
  const resolvedCategoriaNombre = resolvedCategoriaId
    ? (categorias.find(c => c.id === resolvedCategoriaId)?.nombre || '')
    : ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError(null)
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await createProducto({
        nombre: escapeHtml(form.nombre.trim()),
        tipo: form.tipo,
        medidas: form.medidas ? escapeHtml(form.medidas.trim()) : '',
        precioUnitario: Number(form.precioUnitario) || 0,
        stock: Number(form.stock) || 0,
        description: form.description ? escapeHtml(form.description.trim()) : '',
        ensamble: form.ensamble,
        categoria: resolvedCategoriaNombre,
        categoria_id: resolvedCategoriaId,
        publicado: false,
        imagenes: [],
      })

      if (error) {
        setSubmitError(typeof error === 'string' ? error : 'Error al crear el producto')
        return
      }

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productos.all })
      router.push('/admin/products')
    } catch (err) {
      setSubmitError(err.message || 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Agregar Producto - Sistema KOND">
      <div style={{ padding: '20px', maxWidth: '680px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/admin/products" style={{ color: 'var(--accent-blue, #3b82f6)', fontSize: '0.9rem' }}>
            ← Volver a productos
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--person-color)', marginTop: '12px', marginBottom: '4px' }}>
            Agregar Producto
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'
          }}
        >
          {/* Nombre */}
          <div>
            <label style={labelStyle()}>
              Nombre <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Ej: Remera Básica"
              style={{ ...inputStyle, borderColor: errors.nombre ? '#ef4444' : undefined }}
            />
            {errors.nombre && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '4px' }}>{errors.nombre}</p>}
          </div>

          {/* Tipo */}
          <div>
            <label style={labelStyle()}>Tipo</label>
            <select name="tipo" value={form.tipo} onChange={handleChange} style={inputStyle}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Medidas */}
          <div>
            <label style={labelStyle()}>Medidas</label>
            <input
              type="text"
              name="medidas"
              value={form.medidas}
              onChange={handleChange}
              placeholder="Ej: 30x40cm"
              style={inputStyle}
            />
          </div>

          {/* Precio */}
          <div>
            <label style={labelStyle()}>
              Precio unitario <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              name="precioUnitario"
              value={form.precioUnitario}
              onChange={handleChange}
              min={0}
              step="0.01"
              placeholder="0.00"
              style={{ ...inputStyle, borderColor: errors.precioUnitario ? '#ef4444' : undefined }}
            />
            {errors.precioUnitario && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '4px' }}>{errors.precioUnitario}</p>}
          </div>

          {/* Stock */}
          <div>
            <label style={labelStyle()}>Stock</label>
            <input type="number" name="stock" value={form.stock} onChange={handleChange} min={0} placeholder="0" style={inputStyle} />
          </div>

          {/* Ensamble */}
          <div>
            <label style={labelStyle()}>Ensamble</label>
            <select name="ensamble" value={form.ensamble} onChange={handleChange} style={inputStyle}>
              {ENSAMBLES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* ── Categoría (dos selects dependientes) ── */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <p style={{ fontWeight: 600, marginBottom: '16px', fontSize: '0.95rem' }}>Categoría</p>

            {/* Select 1: padre */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Categoría
              </label>
              <select
                value={categoriaIdPadre}
                onChange={handlePadreChange}
                style={inputStyle}
              >
                <option value="">— Sin categoría —</option>
                {padres.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            {/* Select 2: subcategoría (only when parent selected) */}
            {categoriaIdPadre && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Subcategoría <span style={{ fontWeight: 400 }}>(opcional)</span>
                </label>
                {hijos.length === 0 ? (
                  <div style={{
                    padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary, #f9fafb)',
                    fontSize: '0.9rem', color: 'var(--text-secondary)'
                  }}>
                    (esta categoría no tiene subcategorías — se asignará a la categoría padre)
                  </div>
                ) : (
                  <select
                    value={categoriaIdHijo}
                    onChange={e => setCategoriaIdHijo(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">— Asignar a categoría padre —</option>
                    {hijos.map(h => (
                      <option key={h.id} value={h.id}>{h.nombre}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Preview */}
            {resolvedCategoriaId && (
              <p style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                📌 Se asignará a: <strong>{resolvedCategoriaNombre}</strong>
              </p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label style={labelStyle()}>Descripción</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Descripción del producto (opcional)"
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            />
          </div>

          {/* Error global */}
          {submitError && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.08)', color: '#dc2626', fontSize: '0.88rem'
            }}>
              ⚠️ {submitError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <Link href="/admin/products">
              <button type="button" style={{
                padding: '10px 20px', borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'transparent', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: 600
              }}>
                Cancelar
              </button>
            </Link>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px', borderRadius: '8px',
                border: 'none', background: 'var(--accent-blue, #3b82f6)',
                color: 'white', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: 600,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Guardando...' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default withAdminAuth(NuevoProducto)
