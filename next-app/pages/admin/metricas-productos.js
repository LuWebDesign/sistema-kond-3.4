import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import styles from '../../styles/metricas.module.css'
import { getAllProductos } from '../../utils/supabaseProducts'
import Link from 'next/link'

const MetricasProductosContent = dynamic(() => Promise.resolve(MetricasProductosPage), {
  ssr: false,
  loading: () => (
    <Layout title="Métricas de Productos - Sistema KOND">
      <div className={styles.loading}>Cargando métricas...</div>
    </Layout>
  )
})

function MetricasProductosPage() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data, error } = await getAllProductos()
      if (!error && data) {
        setProductos(data)
      } else {
        const local = JSON.parse(localStorage.getItem('productosBase') || '[]')
        setProductos(local)
      }
    } catch (err) {
      console.error('Error cargando productos:', err)
      const local = JSON.parse(localStorage.getItem('productosBase') || '[]')
      setProductos(local)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount || 0)
  }

  const parseTime = (t) => {
    if (!t) return 0
    const parts = String(t).split(':')
    return (parseInt(parts[0] || 0) * 60) + parseInt(parts[1] || 0) + (parseInt(parts[2] || 0) / 60)
  }

  const metrics = useMemo(() => {
    const total = productos.length
    const publicados = productos.filter(p => p.publicado).length
    const noPublicados = total - publicados

    const conPrecio = productos.filter(p => p.precio_unitario > 0)
    const conCosto = productos.filter(p => {
      const costoPlaca = Number(p.costo_placa || 0)
      const costoMaterial = Number(p.costo_material || 0)
      return costoPlaca > 0 || costoMaterial > 0
    })

    // Calcular rentabilidad por producto
    const productosConRentabilidad = productos.map(p => {
      const precio = Number(p.precio_unitario || 0)
      const costoMaterial = Number(p.costo_material || 0)
      const margen = Number(p.margen_material || 0)

      const ganancia = precio - costoMaterial

      const tiempoMin = parseTime(p.tiempo_unitario)
      const gananciaPorMinuto = tiempoMin > 0 ? ganancia / tiempoMin : 0

      return {
        ...p,
        costoMaterial,
        ganancia,
        margen,
        tiempoMin,
        gananciaPorMinuto
      }
    })

    // KPIs generales
    const margenes = productosConRentabilidad.filter(p => p.margen !== 0)
    const margenPromedio = margenes.length > 0
      ? margenes.reduce((s, p) => s + p.margen, 0) / margenes.length
      : 0

    const rentabilidadTotal = productosConRentabilidad.reduce((s, p) => s + p.ganancia, 0)

    const conTiempo = productosConRentabilidad.filter(p => p.tiempoMin > 0 && p.ganancia > 0)
    const precioPorMinutoPromedio = conTiempo.length > 0
      ? conTiempo.reduce((s, p) => s + p.gananciaPorMinuto, 0) / conTiempo.length
      : 0

    const costoMaterialTotal = productosConRentabilidad.reduce((s, p) => s + p.costoMaterial, 0)

    // Rankings
    const top5Rentables = [...productosConRentabilidad]
      .filter(p => p.ganancia > 0)
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 5)

    const bottom5Rentables = [...productosConRentabilidad]
      .filter(p => p.precio_unitario > 0)
      .sort((a, b) => a.margen - b.margen)
      .slice(0, 5)

    const top5Eficientes = [...productosConRentabilidad]
      .filter(p => p.gananciaPorMinuto > 0)
      .sort((a, b) => b.gananciaPorMinuto - a.gananciaPorMinuto)
      .slice(0, 5)

    const top5TiempoProduccion = [...productosConRentabilidad]
      .filter(p => p.tiempoMin > 0)
      .sort((a, b) => b.tiempoMin - a.tiempoMin)
      .slice(0, 5)

    const bottom5TiempoProduccion = [...productosConRentabilidad]
      .filter(p => p.tiempoMin > 0)
      .sort((a, b) => a.tiempoMin - b.tiempoMin)
      .slice(0, 5)

    // Distribución por categoría (solo publicados)
    const categorias = {}
    for (const p of productosConRentabilidad) {
      if (!p.publicado) continue // Solo productos publicados
      const cat = p.categoria || 'Sin categoría'
      if (!categorias[cat]) {
        categorias[cat] = { count: 0, gananciaTotal: 0, valorTotal: 0, margenSum: 0, tiempoTotal: 0 }
      }
      categorias[cat].count++
      categorias[cat].gananciaTotal += p.ganancia
      categorias[cat].valorTotal += Number(p.precio_unitario || 0)
      categorias[cat].margenSum += p.margen
      categorias[cat].tiempoTotal += p.tiempoMin
    }

    const categoriasArray = Object.entries(categorias).map(([nombre, data]) => ({
      nombre,
      ...data,
      margenPromedio: data.count > 0 ? data.margenSum / data.count : 0,
      gananciaPorHora: data.tiempoTotal > 0 ? (data.gananciaTotal / data.tiempoTotal) * 60 : 0
    })).sort((a, b) => b.valorTotal - a.valorTotal)

    // Distribución por tipo
    const tipos = {}
    for (const p of productos) {
      const tipo = p.tipo || 'Sin tipo'
      if (!tipos[tipo]) tipos[tipo] = 0
      tipos[tipo]++
    }

    // Productos con promoción
    const conPromo = productos.filter(p => p.precio_promos && p.precio_promos > 0 && p.precio_promos < (p.precio_unitario || 0))
    const descuentoPromedio = conPromo.length > 0
      ? conPromo.reduce((s, p) => {
          const desc = ((p.precio_unitario - p.precio_promos) / p.precio_unitario) * 100
          return s + desc
        }, 0) / conPromo.length
      : 0

    return {
      total, publicados, noPublicados,
      margenPromedio, rentabilidadTotal, precioPorMinutoPromedio, costoMaterialTotal,
      top5Rentables, bottom5Rentables, top5Eficientes, top5TiempoProduccion, bottom5TiempoProduccion,
      categoriasArray, tipos,
      conPromo: conPromo.length, descuentoPromedio,
      productosConRentabilidad
    }
  }, [productos])

  if (loading) {
    return (
      <Layout title="Métricas de Productos - Sistema KOND">
        <div className={styles.loading}>Cargando métricas...</div>
      </Layout>
    )
  }

  return (
    <Layout title="Métricas de Productos - Sistema KOND">
      <div className={styles.container}>
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <Link href="/admin/metricas" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>← Métricas</Link>
          </div>
          <h1 className={styles.title}>📦 Métricas de Productos</h1>
          <p className={styles.subtitle}>
            Análisis de rentabilidad y eficiencia de {metrics.total} productos
          </p>
        </div>

        {/* KPIs principales */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Margen Promedio</span>
            <span className={styles.kpiValue} style={{ color: metrics.margenPromedio >= 40 ? '#10b981' : metrics.margenPromedio >= 20 ? '#f59e0b' : '#ef4444' }}>
              {metrics.margenPromedio.toFixed(1)}%
            </span>
            <span className={styles.kpiSub}>sobre costo material</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Ganancia Total</span>
            <span className={styles.kpiValue} style={{ color: 'var(--text-primary)', fontSize: '1.5rem' }}>
              {formatCurrency(metrics.rentabilidadTotal)}
            </span>
            <span className={styles.kpiSub}>suma de todos los productos</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Ganancia/Minuto</span>
            <span className={styles.kpiValue} style={{ color: '#8b5cf6' }}>
              {formatCurrency(metrics.precioPorMinutoPromedio)}
            </span>
            <span className={styles.kpiSub}>promedio por producto</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Publicados</span>
            <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>
              {metrics.publicados} / {metrics.total}
            </span>
            <span className={styles.kpiSub}>{metrics.noPublicados} ocultos</span>
          </div>
        </div>

        {/* Top 5 más rentables y menos rentables */}
        <div className={styles.detailGrid}>
          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>🏆 Top 5 Más Rentables</h3>
            {metrics.top5Rentables.map((p, i) => (
              <div className={styles.statRow} key={p.id || i}>
                <span className={styles.statLabel} style={{ fontSize: '0.85rem' }}>
                  {i + 1}. {p.nombre || 'Sin nombre'}
                </span>
                <span className={styles.statValue} style={{ color: '#10b981', fontSize: '0.85rem' }}>
                  {formatCurrency(p.ganancia)} ({p.margen.toFixed(1)}%)
                </span>
              </div>
            ))}
            {metrics.top5Rentables.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin datos suficientes</p>
            )}
          </div>

          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>⚠️ Top 5 Menor Margen</h3>
            {metrics.bottom5Rentables.map((p, i) => (
              <div className={styles.statRow} key={p.id || i}>
                <span className={styles.statLabel} style={{ fontSize: '0.85rem' }}>
                  {i + 1}. {p.nombre || 'Sin nombre'}
                </span>
                <span className={styles.statValue} style={{ color: p.margen < 10 ? '#ef4444' : '#f59e0b', fontSize: '0.85rem' }}>
                  {p.margen.toFixed(1)}%
                </span>
              </div>
            ))}
            {metrics.bottom5Rentables.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin datos suficientes</p>
            )}
          </div>

          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>⚡ Top 5 Eficiencia ($/min)</h3>
            {metrics.top5Eficientes.map((p, i) => (
              <div className={styles.statRow} key={p.id || i}>
                <span className={styles.statLabel} style={{ fontSize: '0.85rem' }}>
                  {i + 1}. {p.nombre || 'Sin nombre'}
                </span>
                <span className={styles.statValue} style={{ color: '#8b5cf6', fontSize: '0.85rem' }}>
                  {formatCurrency(p.gananciaPorMinuto)}/min
                </span>
              </div>
            ))}
            {metrics.top5Eficientes.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin datos de tiempo</p>
            )}
          </div>
        </div>

        {/* Tiempos de producción */}
        <div className={styles.detailGrid}>
          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>⏱️ Mayor Tiempo de Producción</h3>
            {metrics.top5TiempoProduccion.map((p, i) => (
              <div className={styles.statRow} key={p.id || i}>
                <span className={styles.statLabel} style={{ fontSize: '0.85rem' }}>
                  {i + 1}. {p.nombre || 'Sin nombre'}
                </span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {p.tiempo_unitario || '—'}
                  </span>
                  <span className={styles.statValue} style={{ color: '#3b82f6', fontSize: '0.85rem' }}>
                    {p.tiempoMin.toFixed(0)} min
                  </span>
                </div>
              </div>
            ))}
            {metrics.top5TiempoProduccion.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin datos de tiempo</p>
            )}
          </div>

          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>⚡ Menor Tiempo de Producción</h3>
            {metrics.bottom5TiempoProduccion.map((p, i) => (
              <div className={styles.statRow} key={p.id || i}>
                <span className={styles.statLabel} style={{ fontSize: '0.85rem' }}>
                  {i + 1}. {p.nombre || 'Sin nombre'}
                </span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {p.tiempo_unitario || '—'}
                  </span>
                  <span className={styles.statValue} style={{ color: '#10b981', fontSize: '0.85rem' }}>
                    {p.tiempoMin.toFixed(0)} min
                  </span>
                </div>
              </div>
            ))}
            {metrics.bottom5TiempoProduccion.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sin datos de tiempo</p>
            )}
          </div>
        </div>

        {/* Tabla completa de productos */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>🏆 Top 10 Mejores Productos</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
            Ordenados por rentabilidad: combina ganancia por minuto y margen
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ background: 'var(--bg-hover)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)' }}>Producto</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-secondary)' }}>Tiempo</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>Margen %</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>$/min</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {metrics.productosConRentabilidad
                  .filter(p => p.precio_unitario > 0 && p.tiempoMin > 0)
                  .map(p => ({
                    ...p,
                    score: p.gananciaPorMinuto * (1 + p.margen / 100)
                  }))
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 10)
                  .map((p, i) => (
                  <tr key={p.id || i} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      <span style={{ color: '#f59e0b', marginRight: 8, fontWeight: 700 }}>#{i + 1}</span>
                      {p.nombre || 'Sin nombre'}
                      {!p.publicado && <span style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>🔒</span>}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {p.tiempo_unitario || '—'}
                      {p.tiempoMin > 0 && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          ({p.tiempoMin.toFixed(0)} min)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: p.margen >= 40 ? '#10b981' : p.margen >= 20 ? '#f59e0b' : '#ef4444', fontWeight: 500 }}>
                      {p.margen.toFixed(1)}%
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#8b5cf6', fontWeight: 500 }}>
                      {p.gananciaPorMinuto > 0 ? formatCurrency(p.gananciaPorMinuto) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {formatCurrency(p.precio_unitario)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Análisis por categoría */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>📁 Análisis por Categoría</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ background: 'var(--bg-hover)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-secondary)' }}>Categoría</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-secondary)' }}>Productos</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>Valor Total</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>$/Hora</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>Margen Prom.</th>
                </tr>
              </thead>
              <tbody>
                {metrics.categoriasArray.map((cat, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)' }}>{cat.nombre}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-secondary)' }}>{cat.count}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#3b82f6', fontWeight: 500 }}>
                      {formatCurrency(cat.valorTotal)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#8b5cf6', fontWeight: 500 }}>
                      {cat.gananciaPorHora > 0 ? formatCurrency(cat.gananciaPorHora) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: cat.margenPromedio >= 30 ? '#10b981' : '#f59e0b' }}>
                      {cat.margenPromedio.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribución por tipo y promociones */}
        <div className={styles.detailGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>📋 Distribución por Tipo</h3>
            {Object.entries(metrics.tipos).map(([tipo, count], i) => (
              <div className={styles.statRow} key={i}>
                <span className={styles.statLabel}>{tipo}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={styles.statValue}>{count}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    ({metrics.total > 0 ? ((count / metrics.total) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>🏷️ Promociones</h3>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Con precio promocional</span>
              <span className={styles.statValue} style={{ color: '#8b5cf6' }}>{metrics.conPromo}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Sin promoción</span>
              <span className={styles.statValue}>{metrics.total - metrics.conPromo}</span>
            </div>
            {metrics.conPromo > 0 && (
              <div className={styles.statRow} style={{ borderTop: '2px solid var(--border-input, var(--border-color))', paddingTop: 8 }}>
                <span className={styles.statLabel} style={{ fontWeight: 600 }}>Descuento promedio</span>
                <span className={styles.statValue} style={{ color: '#ef4444', fontWeight: 700 }}>{metrics.descuentoPromedio.toFixed(1)}%</span>
              </div>
            )}
            {metrics.total > 0 && (
              <>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${(metrics.conPromo / metrics.total * 100)}%`, background: '#8b5cf6' }} />
                </div>
                <span className={styles.kpiSub} style={{ marginTop: 4 }}>{(metrics.conPromo / metrics.total * 100).toFixed(0)}% con promoción activa</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function MetricasProductos() {
  return <MetricasProductosContent />
}

export default withAdminAuth(MetricasProductos)
