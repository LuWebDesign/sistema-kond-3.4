-- ============================================
-- TABLA: cotizaciones_corte (archivado)
-- Cotizaciones para servicio de corte láser
-- ============================================

CREATE TABLE IF NOT EXISTS cotizaciones_corte (
  id SERIAL PRIMARY KEY,
  cliente_nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL
);

-- Fin de create-cotizaciones-corte-table.sql (archivado)
