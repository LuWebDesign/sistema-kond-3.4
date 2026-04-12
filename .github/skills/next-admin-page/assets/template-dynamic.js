/**
 * PATRÓN A: next-admin-page con dynamic + ssr:false
 * Usar cuando la página accede a localStorage, usa gráficos, o tiene riesgo de hydration mismatch.
 *
 * Reemplazar:
 *   NombrePagina        → Renombrar con PascalCase real (ej: MetricasProductos)
 *   'Titulo Pagina'      → Título legible (ej: "Métricas de Productos")
 *   nombre-archivo       → Nombre del archivo CSS module (kebab-case, sin extensión)
 */

import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import styles from '../../styles/nombre-archivo.module.css' // ← renombrar
// import { getAllProductos } from '../../utils/supabaseProducts'  ← ejemplo, ajustar según entidad

// ─── Wrapper dinámico sin SSR ──────────────────────────────────────────────────
const NombrePaginaDynamic = dynamic(() => Promise.resolve(NombrePaginaContent), {
  ssr: false,
  loading: () => (
    <Layout title="Titulo Pagina - Sistema KOND"> {/* ← cambiar título */}
      <div className={styles.loading}>Cargando...</div>
    </Layout>
  )
})

// ─── Componente principal ──────────────────────────────────────────────────────
const NombrePaginaContent = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Reemplazar con la util de Supabase correcta
      // const { data: result, error: err } = await getAllProductos()
      // if (!err && result) {
      //   setData(result)
      //   return
      // }

      // Fallback a localStorage (obligatorio)
      const local = JSON.parse(localStorage.getItem('productosBase') || '[]')
      setData(local)
    } catch (err) {
      setError('No se pudieron cargar los datos.')
      const local = JSON.parse(localStorage.getItem('productosBase') || '[]')
      setData(local)
    } finally {
      setLoading(false) // ← siempre en finally
    }
  }

  // Agregar aquí cálculos derivados de `data` si son necesarios
  // (usar useMemo solo si el cálculo es costoso y los benchmarks lo justifican — React 19 Compiler optimiza automáticamente)

  if (loading) {
    return (
      <Layout title="Titulo Pagina - Sistema KOND"> {/* ← cambiar título */}
        <div className={styles.loading}>Cargando datos...</div>
      </Layout>
    )
  }

  return (
    <Layout title="Titulo Pagina - Sistema KOND"> {/* ← cambiar título */}
      <div className={styles.container}>
        {/* REEMPLAZAR: cambiar 'Titulo Pagina' por el título real */}
        <h1 className={styles.title}>Titulo Pagina</h1>
        {error && <div className={styles.error}>{error}</div>}

        {/* Contenido principal */}
      </div>
    </Layout>
  )
}

// ─── Export con protección de ruta admin ──────────────────────────────────────
export default withAdminAuth(NombrePaginaDynamic)
