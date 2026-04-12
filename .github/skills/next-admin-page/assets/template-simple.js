/**
 * PATRÓN B: next-admin-page sin dynamic (export directo)
 * Usar cuando la página solo lee de Supabase y no accede a localStorage directamente.
 * Se usa un `mounted` guard para evitar hydration mismatch en valores dinámicos.
 *
 * Reemplazar:
 *   NombrePagina        → Renombrar con PascalCase real (ej: Materiales)
 *   'Titulo Pagina'      → Título legible (ej: "Gestión de Materiales")
 *   nombre-archivo       → Nombre del archivo CSS module (kebab-case, sin extensión)
 */

import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect } from 'react'
import styles from '../../styles/nombre-archivo.module.css' // ← renombrar
// import { obtenerDatos } from '../../utils/supabase*.js'  ← ajustar según entidad

const NombrePagina = () => {
  const [mounted, setMounted] = useState(false) // ← guard contra hydration
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filtros y paginación
  const [searchText, setSearchText] = useState('')
  const ITEMS_PER_PAGE = 12
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setMounted(true) // ← previene render del contenido en SSR
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // const { data: result, error: err } = await obtenerDatos()
      // if (err) throw err
      // setData(result || [])
    } catch (err) {
      // Fallback a localStorage si Supabase falla
      const cached = JSON.parse(localStorage.getItem('KOND_CACHE_KEY') || '[]')
      setData(cached)
      setError(cached.length ? 'Usando datos en caché local.' : 'No se pudieron cargar los datos.')
    } finally {
      setLoading(false)
    }
  }

  // filteredData como derivación directa — React 19 Compiler optimiza esto automáticamente
  const filteredData = !searchText
    ? data
    : data.filter(item => item.nombre?.toLowerCase().includes(searchText.toLowerCase()))

  const handleRefresh = async () => {
    await loadData()
  }

  // No renderizar hasta que el componente esté montado en cliente
  if (!mounted) return null

  return (
    <Layout title="Titulo Pagina - Sistema KOND"> {/* ← cambiar título */}
      <div className={styles.container}>
        <div className={styles.header}>
          {/* REEMPLAZAR: cambiar 'Titulo Pagina' por el título real */}
          <h1 className={styles.title}>Titulo Pagina</h1>
          <button onClick={handleRefresh} className={styles.btnRefresh}>
            Actualizar
          </button>
        </div>

        {/* Filtros */}
        <input
          type="text"
          placeholder="Buscar..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className={styles.searchInput}
        />

        {error && <div className={styles.error}>{error}</div>}
        {loading ? (
          <div className={styles.loading}>Cargando...</div>
        ) : (
          <div className={styles.list}>
            {filteredData.map(item => (
              <div key={item.id} className={styles.item}>
                {/* Contenido del item */}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

// ─── Export con protección de ruta admin ──────────────────────────────────────
export default withAdminAuth(NombrePagina)
