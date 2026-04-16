-- AGREGAR COLUMNAS FALTANTES A pedidos_catalogo (archivado)

ALTER TABLE pedidos_catalogo 
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'pendiente';

-- Fin de add-pedidos-catalogo-fields.sql (archivado)
