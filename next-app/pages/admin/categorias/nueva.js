import Layout from '../../../components/Layout'
import withAdminAuth from '../../../components/withAdminAuth'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, STALE_TIMES } from '../../../lib/queryKeys'
import { slugify } from '../../../utils/slugify'

async function fetchCategorias() {
  const res = await fetch('/api/admin/categorias')
  if (!res.ok) throw new Error('Error al cargar categorías')
  const json = await res.json()
  return json.data || []
}

async function crearCategoria(body) {
  const res = await fetch('/api/admin/categorias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al crear categoría')
  return json.data
}

function NuevaCategoria() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [nombre, setNombre] = useState('')
  const [parentId, setParentId] = useState('')
  const [orden, setOrden] = useState(0)
  const [slugPreview, setSlugPreview] = useState('')
  const [submitError, setSubmitError] = useState(null)

  // Update slug preview when nombre changes
  useEffect(() => {
    setSlugPreview(slugify(nombre))
  }, [nombre])

  const { data: categorias = [] } = useQuery({
    queryKey: QUERY_KEYS.categorias.list(),
    queryFn: fetchCategorias,
    staleTime: STALE_TIMES.categorias,
  })

  // Only roots can be parents (max 1 level)
  const padres = categorias.filter(c => c.parent_id === null)

  const mutation = useMutation({
    mutationFn: crearCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categorias.all })
      router.push('/admin/categorias')
    },
    onError: (err) => {
      setSubmitError(err.message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitError(null)
    if (!nombre.trim()) {
      setSubmitError('El nombre es requerido')
      return
    }
    mutation.mutate({
      nombre: nombre.trim(),
      parent_id: parentId ? Number(parentId) : null,
      orden: Number(orden) || 0,
    })
  }

  return (
    <Layout title="Nueva Categoría - Sistema KOND">
      <div style={{ padding: '20px', maxWidth: '600px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/admin/categorias" style={{ color: 'var(--accent-blue, #3b82f6)', fontSize: '0.9rem' }}>
            ← Volver a categorías
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--person-color)', marginTop: '12px', marginBottom: '4px' }}>
            Nueva Categoría
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
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem' }}>
              Nombre <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Remeras"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid var(--border-color)', fontSize: '0.95rem',
                background: 'var(--bg-primary, #fff)', color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Slug preview */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Slug generado
            </label>
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary, #f9fafb)',
              fontFamily: 'monospace', fontSize: '0.9rem',
              color: slugPreview ? 'var(--text-primary)' : 'var(--text-secondary)',
              minHeight: '42px'
            }}>
              {slugPreview || '(se generará automáticamente)'}
            </div>
          </div>

          {/* Parent */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem' }}>
              Categoría padre <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <select
              value={parentId}
              onChange={e => setParentId(e.target.value)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid var(--border-color)', fontSize: '0.95rem',
                background: 'var(--bg-primary, #fff)', color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            >
              <option value="">— Sin padre (categoría principal) —</option>
              {padres.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Orden */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem' }}>
              Orden <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="number"
              value={orden}
              onChange={e => setOrden(e.target.value)}
              min={0}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '8px',
                border: '1px solid var(--border-color)', fontSize: '0.95rem',
                background: 'var(--bg-primary, #fff)', color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Error */}
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
            <Link href="/admin/categorias">
              <button
                type="button"
                style={{
                  padding: '10px 20px', borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: 600
                }}
              >
                Cancelar
              </button>
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              style={{
                padding: '10px 24px', borderRadius: '8px',
                border: 'none', background: 'var(--accent-blue, #3b82f6)',
                color: 'white', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: 600,
                opacity: mutation.isPending ? 0.7 : 1,
              }}
            >
              {mutation.isPending ? 'Guardando...' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default withAdminAuth(NuevaCategoria)
