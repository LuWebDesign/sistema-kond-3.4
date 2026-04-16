-- ============================================
-- SISTEMA KOND - POLÍTICAS STORAGE
-- Paso 3: Configurar políticas para buckets de Storage
-- ============================================

-- NOTA IMPORTANTE:
-- Antes de ejecutar este script, debes crear los buckets manualmente:
-- 1. Ve a Storage en el menú lateral de Supabase
-- 2. Crea bucket "productos-imagenes" (marcar como público)
-- 3. Crea bucket "comprobantes-pago" (dejar privado)

-- ============================================
-- POLÍTICAS STORAGE - productos-imagenes
-- ============================================

-- Permitir lectura pública
CREATE POLICY "Lectura pública de imágenes de productos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'productos-imagenes');

-- Solo admins pueden subir imágenes
CREATE POLICY "Solo admins suben imágenes de productos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'productos-imagenes'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- Solo admins pueden eliminar imágenes
CREATE POLICY "Solo admins eliminan imágenes de productos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'productos-imagenes'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- ============================================
-- POLÍTICAS STORAGE - comprobantes-pago
-- ============================================

-- Cualquiera puede subir comprobantes
CREATE POLICY "Cualquiera puede subir comprobantes"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'comprobantes-pago');

-- Solo admins pueden leer comprobantes
CREATE POLICY "Solo admins leen comprobantes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprobantes-pago'
  AND EXISTS (
    SELECT 1 FROM usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.rol = 'admin'
  )
);

-- Fin de storage-policies.sql
