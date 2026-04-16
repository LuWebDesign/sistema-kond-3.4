-- Asegurar que los buckets sean publicos/privados segun corresponde (archivado)

INSERT INTO storage.buckets (id, name, public) VALUES ('productos-imagenes', 'productos-imagenes', true) ON CONFLICT (id) DO UPDATE SET public = true;

-- Fin de 20260310000002_storage_policies.sql (archivado)
