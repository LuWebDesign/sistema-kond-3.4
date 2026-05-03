import Layout from '../../../components/Layout'
import withAdminAuth from '../../../components/withAdminAuth'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, STALE_TIMES } from '../../../lib/queryKeys'

async function fetchCategorias() {
  const res = await fetch('/api/admin/categorias')
  if (!res.ok) throw new Error('Error al cargar categorías')
  const json = await res.json()
  return json.data || []
}

async function deleteCategoria(id) {
  const res = await fetch(`/api/admin/categorias/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw { status: res.status, message: json.error || 'Error al eliminar' }
  }
  return res.json()
}

function CategoriasAdmin() {
  const queryClient = useQueryClient()
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.categorias.list(),
    queryFn: fetchCategorias,
    staleTime: STALE_TIMES.categorias,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categorias.all })
      setDeleteConfirm(null)
      setDeleteError(null)
    },
    onError: (err) => {
      setDeleteError(err.message || 'Error al eliminar la categoría')
    },
  })

  // Build tree: parents with their children nested
  const padres = categorias.filter(c => c.parent_id === null)
  const hijos = categorias.filter(c => c.parent_id !== null)

  const tree = padres.map(padre => ({
    ...padre,
    subcategorias: hijos.filter(h => h.parent_id === padre.id),
  }))

  const handleDeleteClick = (cat) => {
    setDeleteError(null)
    setDeleteConfirm(cat)
  }

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return
    deleteMutation.mutate(deleteConfirm.id)
  }

  return (
    <Layout title="Categorías - Sistema KOND">
      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div
          onClick={() => { setDeleteConfirm(null); setDeleteError(null) }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-secondary, #fff)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '1.5rem'
            }}>🗑️</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700 }}>
              Eliminar categoría
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--text-secondary, #666)', fontSize: '0.95rem' }}>
              ¿Eliminar <strong>{deleteConfirm.nombre}</strong>?
            </p>
            {deleteError && (
              <p style={{
                margin: '0 0 16px', padding: '10px 14px',
                background: 'rgba(239,68,68,0.08)', borderRadius: '8px',
                color: '#dc2626', fontSize: '0.85rem', textAlign: 'left'
              }}>
                ⚠️ {deleteError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(null) }}
                style={{
                  flex: 1, padding: '10px 20px', borderRadius: '10px',
                  border: '1px solid var(--border-color, #ddd)',
                  background: 'var(--bg-primary, #f5f5f5)',
                  color: 'var(--text-primary, #333)',
                  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                style={{
                  flex: 1, padding: '10px 20px', borderRadius: '10px',
                  border: 'none', background: '#ef4444', color: 'white',
                  fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                  opacity: deleteMutation.isPending ? 0.7 : 1,
                }}
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--person-color)', marginBottom: '8px' }}>
              🏷️ Categorías
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Administrá las categorías y subcategorías del catálogo
            </p>
          </div>
          <Link href="/admin/categorias/nueva">
            <button style={{
              background: 'var(--accent-blue, #3b82f6)', color: 'white',
              border: 'none', borderRadius: '8px',
              padding: '12px 20px', cursor: 'pointer',
              fontSize: '0.9rem', fontWeight: 600,
            }}>
              + Nueva categoría
            </button>
          </Link>
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
        ) : tree.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '12px', padding: '40px', textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            No hay categorías aún.{' '}
            <Link href="/admin/categorias/nueva" style={{ color: 'var(--accent-blue, #3b82f6)' }}>
              Crear la primera
            </Link>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: '12px', overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary, #f9fafb)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slug</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tree.map((padre, idx) => (
                  <>
                    <tr
                      key={padre.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary, #f9fafb)'
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        📁 {padre.nombre}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {padre.slug}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          Padre
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link href={`/admin/categorias/${padre.id}/editar`}>
                            <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>
                              ✏️ Editar
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDeleteClick(padre)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    {padre.subcategorias.map(sub => (
                      <tr
                        key={sub.id}
                        style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary, #f9fafb)' }}
                      >
                        <td style={{ padding: '12px 16px 12px 36px', color: 'var(--text-primary)' }}>
                          └ {sub.nombre}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {sub.slug}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            Sub
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Link href={`/admin/categorias/${sub.id}/editar`}>
                              <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem' }}>
                                ✏️ Editar
                              </button>
                            </Link>
                            <button
                              onClick={() => handleDeleteClick(sub)}
                              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default withAdminAuth(CategoriasAdmin)
