import Layout from '../../../../components/Layout'
import withAdminAuth from '../../../../components/withAdminAuth'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS, STALE_TIMES } from '../../../../lib/queryKeys'
import { slugify } from '../../../../utils/slugify'

async function fetchCategoria(id) {
  const res = await fetch(`/api/admin/categorias/${id}`)
  if (!res.ok) throw new Error('Error al cargar categoría')
  const json = await res.json()
  return json.data
}

async function fetchCategorias() {
  const res = await fetch('/api/admin/categorias')
  if (!res.ok) throw new Error('Error al cargar categorías')
  const json = await res.json()
  return json.data || []
}

async function actualizarCategoria({ id, body }) {
  const res = await fetch(`/api/admin/categorias/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Error al actualizar categoría')
  return json.data
}

function EditarCategoria() {
  const router = useRouter()
  const { id } = router.query
  const queryClient = useQueryClient()

  const [nombre, setNombre] = useState('')
  const [parentId, setParentId] = useState('')
  const [orden, setOrden] = useState(0)
  const [slugPreview, setSlugPreview] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const [imagenUrl, setImagenUrl] = useState('')
  const [imageUploadError, setImageUploadError] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const imageInputRef = useRef(null)

  const { data: categorias = [] } = useQuery({
    queryKey: QUERY_KEYS.categorias.list(),
    queryFn: fetchCategorias,
    staleTime: STALE_TIMES.categorias,
  })

  const { data: categoria, isLoading, error: loadError } = useQuery({
    queryKey: QUERY_KEYS.categorias.byId(id),
    queryFn: () => fetchCategoria(id),
    enabled: !!id,
    staleTime: STALE_TIMES.categorias,
  })

  // Pre-populate form once data loads
  useEffect(() => {
    if (categoria && !initialized) {
      setNombre(categoria.nombre || '')
      setParentId(categoria.parent_id != null ? String(categoria.parent_id) : '')
      setOrden(categoria.orden ?? 0)
      setSlugPreview(categoria.slug || '')
      setImagenUrl(categoria.imagen_url || '')
      setInitialized(true)
    }
  }, [categoria, initialized])

  // Re-generate slug when nombre changes (after init, only if user actually changed it)
  useEffect(() => {
    if (initialized) {
      setSlugPreview(slugify(nombre))
    }
  }, [nombre]) // eslint-disable-line react-hooks/exhaustive-deps

  // Only roots can be parents (exclude self and existing children)
  const padres = categorias.filter(c => c.parent_id === null && String(c.id) !== String(id))

  const mutation = useMutation({
    mutationFn: actualizarCategoria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categorias.all })
      router.push('/admin/categorias')
    },
    onError: (err) => {
      setSubmitError(err.message)
    },
  })

  // Upload category image to Supabase Storage (productos bucket, categorias/{id}/ path)
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_SIZE = 8 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setImageUploadError('La imagen supera los 8 MB. Por favor usá una imagen más chica.')
      e.target.value = ''
      return
    }

    setImageUploadError(null)
    setIsUploading(true)

    try {
      // Lazy-import to avoid SSR issues
      const { supabase } = await import('../../../../utils/supabaseClient')
      const { compressImage } = await import('../../../../utils/catalogUtils')

      let fileToUpload = file
      try {
        const blob = await compressImage(file, 1200, 0.82)
        if (blob && blob.size) {
          fileToUpload = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
        }
      } catch {
        // Compression failed — upload original
      }

      const fileName = `${id}-${Date.now()}.jpg`
      const filePath = `categorias/${id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('productos')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg',
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('productos')
        .getPublicUrl(filePath)

      setImagenUrl(urlData.publicUrl)
    } catch (err) {
      console.error('Error uploading category image:', err)
      setImageUploadError('No se pudo subir la imagen. Intentá de nuevo.')
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleClearImage = () => {
    setImagenUrl('')
    setImageUploadError(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitError(null)
    if (!nombre.trim()) {
      setSubmitError('El nombre es requerido')
      return
    }
    mutation.mutate({
      id,
      body: {
        nombre: nombre.trim(),
        parent_id: parentId ? Number(parentId) : null,
        orden: Number(orden) || 0,
        imagen_url: imagenUrl || null,
      },
    })
  }

  if (isLoading) {
    return (
      <Layout title="Editar Categoría - Sistema KOND">
        <div style={{ padding: '20px' }}>Cargando...</div>
      </Layout>
    )
  }

  if (loadError || !categoria) {
    return (
      <Layout title="Editar Categoría - Sistema KOND">
        <div style={{ padding: '20px' }}>
          <p style={{ color: '#ef4444' }}>No se pudo cargar la categoría.</p>
          <Link href="/admin/categorias" style={{ color: 'var(--accent-blue, #3b82f6)' }}>← Volver</Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`Editar ${categoria.nombre} - Sistema KOND`}>
      <div style={{ padding: '20px', maxWidth: '600px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href="/admin/categorias" style={{ color: 'var(--accent-blue, #3b82f6)', fontSize: '0.9rem' }}>
            ← Volver a categorías
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--person-color)', marginTop: '12px', marginBottom: '4px' }}>
            Editar Categoría
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
              Slug (se regenera al cambiar el nombre)
            </label>
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary, #f9fafb)',
              fontFamily: 'monospace', fontSize: '0.9rem',
              color: slugPreview ? 'var(--text-primary)' : 'var(--text-secondary)',
              minHeight: '42px'
            }}>
              {slugPreview || '(vacío)'}
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
              Orden
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

          {/* Imagen de categoría */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem' }}>
              Imagen de categoría <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span>
            </label>

            {imagenUrl && (
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <img
                  src={imagenUrl}
                  alt="Imagen de categoría"
                  style={{ maxWidth: '200px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'block' }}
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  style={{
                    padding: '4px 10px', borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent', cursor: 'pointer',
                    fontSize: '0.8rem', color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Quitar imagen
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label
                htmlFor="categoria-imagen-input"
                style={{
                  display: 'inline-block', padding: '8px 16px', borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem', fontWeight: 600,
                  opacity: isUploading ? 0.6 : 1,
                }}
              >
                {isUploading ? 'Subiendo...' : imagenUrl ? 'Cambiar imagen' : 'Subir imagen'}
              </label>
              <input
                id="categoria-imagen-input"
                ref={imageInputRef}
                type="file"
                accept="image/*"
                disabled={isUploading}
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              {imagenUrl && !isUploading && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Imagen cargada ✓
                </span>
              )}
            </div>

            {imageUploadError && (
              <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#dc2626' }}>
                ⚠️ {imageUploadError}
              </div>
            )}
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
              {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default withAdminAuth(EditarCategoria)
