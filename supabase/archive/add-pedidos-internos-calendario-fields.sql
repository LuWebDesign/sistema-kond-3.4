-- Agregar campos necesarios para el calendario en pedidos_internos (archivado)

ALTER TABLE pedidos_internos 
ADD COLUMN IF NOT EXISTS asignado_al_calendario BOOLEAN DEFAULT false;

-- Fin de add-pedidos-internos-calendario-fields.sql (archivado)
