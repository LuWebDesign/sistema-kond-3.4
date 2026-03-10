-- Asegurar que los buckets sean publicos/privados segun corresponde
INSERT INTO storage.buckets (id, name, public) VALUES ('productos-imagenes', 'productos-imagenes', true) ON CONFLICT (id) DO UPDATE SET public = true;

-- Politicas de storage para productos-imagenes (publico)
CREATE POLICY "Publico puede ver imagenes de productos" ON storage.objects FOR SELECT USING (bucket_id = 'productos-imagenes');
CREATE POLICY "Autenticados pueden subir imagenes de productos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'productos-imagenes');
CREATE POLICY "Autenticados pueden actualizar imagenes de productos" ON storage.objects FOR UPDATE USING (bucket_id = 'productos-imagenes');
CREATE POLICY "Autenticados pueden eliminar imagenes de productos" ON storage.objects FOR DELETE USING (bucket_id = 'productos-imagenes');

-- Politicas de storage para comprobantes-pago
CREATE POLICY "Autenticados pueden insertar comprobantes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comprobantes-pago');
CREATE POLICY "Autenticados pueden ver comprobantes" ON storage.objects FOR SELECT USING (bucket_id = 'comprobantes-pago');