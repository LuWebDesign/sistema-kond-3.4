-- ============================================
-- CONFIGURACIÓN DE STORAGE BUCKETS EN SUPABASE
-- ============================================

-- Bucket para comprobantes de pago
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes',
  'comprobantes',
  false, -- Privado, solo accesible con auth
  5242880, -- 5 MB máximo
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para imágenes de productos (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'productos',
  'productos',
  true, -- Público para mostrar en catálogo
  2097152, -- 2 MB máximo
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- POLÍTICAS DE STORAGE
-- ============================================

-- Permitir subir comprobantes (usuarios anónimos pueden subir)
CREATE POLICY "Permitir subida de comprobantes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'comprobantes');

-- Permitir lectura de comprobantes solo a admins (ajustar según auth)
CREATE POLICY "Admins pueden leer comprobantes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'comprobantes' AND auth.role() = 'authenticated');

-- Permitir lectura pública de imágenes de productos
CREATE POLICY "Imágenes de productos son públicas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'productos');

-- Permitir subida de imágenes de productos solo a admins
CREATE POLICY "Solo admins pueden subir imágenes de productos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'productos' AND auth.role() = 'authenticated');

-- Permitir eliminación de archivos solo a admins
CREATE POLICY "Solo admins pueden eliminar archivos"
  ON storage.objects FOR DELETE
  USING (auth.role() = 'authenticated');
