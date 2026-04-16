-- Crear tabla para estilos personalizados del catálogo (archivado)
CREATE TABLE IF NOT EXISTS catalog_styles (
  id SERIAL PRIMARY KEY,
  styles JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Fin de add-catalog-styles-table.sql (archivado)
