import Layout from '../../components/Layout'
import withAdminAuth from '../../components/withAdminAuth'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import styles from '../../styles/metricas.module.css'
import { getAllPedidosCatalogo } from '../../utils/supabasePedidos'

const MetricasContent = dynamic(() => Promise.resolve(MetricasPage), {
  ssr: false,
  loading: () => (
    <Layout title="Métricas - Sistema KOND">
      <div className={styles.loading}>Cargando métricas...</div>
    </Layout>
  )
})

function MetricasPage() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data, error } = await getAllPedidosCatalogo()
      if (!error && data) {
        const mapped = data.map(p => ({
          id: p.id,
          estado: p.estado || 'pendiente',
          estadoPago: p.estado_pago || 'sin_seña',
          metodoPago: p.metodo_pago,
          total: p.total || 0,
          montoRecibido: p.monto_recibido || 0,
          fechaCreacion: p.fecha_creacion,
          fechaEntrega: p.fecha_entrega,
          clienteNombre: p.cliente_nombre || ''
        }))
        setPedidos(mapped)
      } else {
        // Fallback localStorage
        const local = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
        setPedidos(local)
      }
    } catch (err) {
      console.error('Error cargando métricas:', err)
      const local = JSON.parse(localStorage.getItem('pedidosCatalogo') || '[]')
      setPedidos(local)
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

  // Métricas calculadas
  const metrics = useMemo(() => {
    const now = new Date()
    const cm = now.getMonth()
    const cy = now.getFullYear()

    let pendientes = 0, confirmados = 0, enPreparacion = 0, listos = 0, entregados = 0, cancelados = 0
    let totalGeneral = 0, totalEntregado = 0, totalRecibido = 0
    let sinSena = 0, senaPagada = 0, pagadoTotal = 0
    let transferencia = 0, whatsapp = 0, retiro = 0
    let esteMesPedidos = 0, esteMesEntregados = 0, esteMesMonto = 0
    // Mes anterior
    const pm = cm === 0 ? 11 : cm - 1
    const py = cm === 0 ? cy - 1 : cy
    let mesAnteriorPedidos = 0

    for (const p of pedidos) {
      // Estado
      if (p.estado === 'pendiente') pendientes++
      else if (p.estado === 'confirmado') confirmados++
      else if (p.estado === 'en_preparacion' || p.estado === 'en_produccion') enPreparacion++
      else if (p.estado === 'listo') listos++
      else if (p.estado === 'entregado') entregados++
      else if (p.estado === 'cancelado') cancelados++

      // Montos
      const t = Number(p.total || 0)
      totalGeneral += t
      if (p.estado === 'entregado') totalEntregado += t
      totalRecibido += Number(p.montoRecibido || 0)

      // Estado de pago
      const ep = p.estadoPago || 'sin_seña'
      if (ep === 'sin_seña') sinSena++
      else if (ep === 'seña_pagada' || ep === 'sena_pagada') senaPagada++
      else if (ep === 'pagado_total' || ep === 'pagado') pagadoTotal++

      // Método de pago
      if (p.metodoPago === 'transferencia') transferencia++
      else if (p.metodoPago === 'whatsapp') whatsapp++
      else if (p.metodoPago === 'retiro') retiro++

      // Fechas
      const d = new Date(p.fechaCreacion)
      if (d.getMonth() === cm && d.getFullYear() === cy) {
        esteMesPedidos++
        esteMesMonto += t
        if (p.estado === 'entregado') esteMesEntregados++
      }
      if (d.getMonth() === pm && d.getFullYear() === py) {
        mesAnteriorPedidos++
      }
    }

    const totalPedidos = pedidos.length
    const pendienteCobrar = totalGeneral - totalRecibido
    const tasaEntrega = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 0
    const tasaCancelacion = totalPedidos > 0 ? Math.round((cancelados / totalPedidos) * 100) : 0
    const ticketPromedio = totalPedidos > 0 ? Math.round(totalGeneral / totalPedidos) : 0
    const variacionMes = mesAnteriorPedidos > 0
      ? Math.round(((esteMesPedidos - mesAnteriorPedidos) / mesAnteriorPedidos) * 100)
      : null

    return {
      totalPedidos, pendientes, confirmados, enPreparacion, listos, entregados, cancelados,
      totalGeneral, totalEntregado, totalRecibido, pendienteCobrar,
      sinSena, senaPagada, pagadoTotal,
      transferencia, whatsapp, retiro,
      esteMesPedidos, esteMesEntregados, esteMesMonto,
      tasaEntrega, tasaCancelacion, ticketPromedio, variacionMes
    }
  }, [pedidos])

  if (loading) {
    return (
      <Layout title="Métricas - Sistema KOND">
        <div className={styles.loading}>Cargando métricas...</div>
      </Layout>
    )
  }

  return (
    <Layout title="Métricas - Sistema KOND">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>📊 Métricas de Pedidos</h1>
          <p className={styles.subtitle}>
            Resumen general de {metrics.totalPedidos} pedidos
            {metrics.variacionMes !== null && (
              <span style={{ marginLeft: 12, color: metrics.variacionMes >= 0 ? '#10b981' : '#ef4444' }}>
                {metrics.variacionMes >= 0 ? '▲' : '▼'} {Math.abs(metrics.variacionMes)}% vs mes anterior
              </span>
            )}
          </p>
        </div>

        {/* KPIs principales */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Total Pedidos</span>
            <span className={styles.kpiValue} style={{ color: 'var(--text-primary)' }}>{metrics.totalPedidos}</span>
            <span className={styles.kpiSub}>{metrics.esteMesPedidos} este mes</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Pendientes</span>
            <span className={styles.kpiValue} style={{ color: '#f59e0b' }}>{metrics.pendientes}</span>
            <span className={styles.kpiSub}>requieren atención</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Entregados</span>
            <span className={styles.kpiValue} style={{ color: '#10b981' }}>{metrics.entregados}</span>
            <span className={styles.kpiSub}>{metrics.tasaEntrega}% tasa de entrega</span>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>Facturación Total</span>
            <span className={styles.kpiValue} style={{ color: 'var(--text-primary)', fontSize: '1.5rem' }}>{formatCurrency(metrics.totalGeneral)}</span>
            <span className={styles.kpiSub}>{formatCurrency(metrics.esteMesMonto)} este mes</span>
          </div>
        </div>

        {/* Detalle por estado y montos */}
        <div className={styles.detailGrid}>
          {/* Estados */}
          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>Estados de Pedidos</h3>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>⏳ Pendientes</span>
              <span className={styles.statValue} style={{ color: '#f59e0b' }}>{metrics.pendientes}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>✅ Confirmados</span>
              <span className={styles.statValue} style={{ color: '#3b82f6' }}>{metrics.confirmados}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>🔨 En Preparación</span>
              <span className={styles.statValue} style={{ color: '#8b5cf6' }}>{metrics.enPreparacion}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>📦 Listos</span>
              <span className={styles.statValue} style={{ color: '#10b981' }}>{metrics.listos}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>🎉 Entregados</span>
              <span className={styles.statValue} style={{ color: '#059669' }}>{metrics.entregados}</span>
            </div>
            {metrics.cancelados > 0 && (
              <div className={styles.statRow}>
                <span className={styles.statLabel}>❌ Cancelados</span>
                <span className={styles.statValue} style={{ color: '#ef4444' }}>{metrics.cancelados}</span>
              </div>
            )}
            {/* Barra de progreso entregados */}
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${metrics.tasaEntrega}%`, background: '#10b981' }} />
            </div>
            <span className={styles.kpiSub} style={{ marginTop: 4 }}>{metrics.tasaEntrega}% entregados del total</span>
          </div>

          {/* Montos */}
          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>Montos</h3>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total general</span>
              <span className={styles.statValue}>{formatCurrency(metrics.totalGeneral)}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total entregado</span>
              <span className={styles.statValue} style={{ color: '#10b981' }}>{formatCurrency(metrics.totalEntregado)}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Total recibido</span>
              <span className={styles.statValue} style={{ color: '#3b82f6' }}>{formatCurrency(metrics.totalRecibido)}</span>
            </div>
            <div className={styles.statRow} style={{ borderTop: '2px solid var(--border-input, var(--border-color))', paddingTop: 8 }}>
              <span className={styles.statLabel} style={{ fontWeight: 600 }}>Pendiente por cobrar</span>
              <span className={styles.statValue} style={{ color: '#f59e0b', fontWeight: 700 }}>{formatCurrency(metrics.pendienteCobrar)}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Ticket promedio</span>
              <span className={styles.statValue}>{formatCurrency(metrics.ticketPromedio)}</span>
            </div>
          </div>

          {/* Estado de Pago */}
          <div className={styles.detailCard}>
            <h3 className={styles.detailCardTitle}>Estado de Pago</h3>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Sin seña</span>
              <span className={styles.statValue} style={{ color: '#ef4444' }}>{metrics.sinSena}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Seña pagada</span>
              <span className={styles.statValue} style={{ color: '#f59e0b' }}>{metrics.senaPagada}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Pagado total</span>
              <span className={styles.statValue} style={{ color: '#10b981' }}>{metrics.pagadoTotal}</span>
            </div>
            {metrics.totalPedidos > 0 && (
              <>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${Math.round((metrics.pagadoTotal / metrics.totalPedidos) * 100)}%`, background: '#10b981' }} />
                </div>
                <span className={styles.kpiSub} style={{ marginTop: 4 }}>{Math.round((metrics.pagadoTotal / metrics.totalPedidos) * 100)}% pagados completo</span>
              </>
            )}
          </div>
        </div>

        {/* Métodos de pago */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Métodos de Pago</h2>
          <div className={styles.methodGrid}>
            <div className={styles.methodCard}>
              <div className={styles.methodIcon}>💳</div>
              <div className={styles.methodLabel}>Transferencia</div>
              <div className={styles.methodValue}>{metrics.transferencia}</div>
            </div>
            <div className={styles.methodCard}>
              <div className={styles.methodIcon}>💬</div>
              <div className={styles.methodLabel}>WhatsApp</div>
              <div className={styles.methodValue}>{metrics.whatsapp}</div>
            </div>
            <div className={styles.methodCard}>
              <div className={styles.methodIcon}>🏪</div>
              <div className={styles.methodLabel}>Retiro en Local</div>
              <div className={styles.methodValue}>{metrics.retiro}</div>
            </div>
          </div>
        </div>

        {/* Resumen este mes */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Este Mes</h2>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Pedidos Nuevos</span>
              <span className={styles.kpiValue} style={{ color: '#3b82f6' }}>{metrics.esteMesPedidos}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Entregados</span>
              <span className={styles.kpiValue} style={{ color: '#10b981' }}>{metrics.esteMesEntregados}</span>
            </div>
            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Monto Total</span>
              <span className={styles.kpiValue} style={{ color: 'var(--text-primary)', fontSize: '1.5rem' }}>{formatCurrency(metrics.esteMesMonto)}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function Metricas() {
  return <MetricasContent />
}

export default withAdminAuth(Metricas)
