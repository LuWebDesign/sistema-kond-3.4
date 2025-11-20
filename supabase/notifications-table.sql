-- ============================================
-- TABLA DE NOTIFICACIONES EN TIEMPO REAL
-- Sistema de notificaciones para KOND
-- ============================================

-- 1. Crear la tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  meta JSONB DEFAULT '{}'::jsonb,
  target_user TEXT NOT NULL DEFAULT 'admin',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON public.notifications(target_user);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Índice compuesto para mejorar consultas comunes
CREATE INDEX IF NOT EXISTS idx_notifications_target_read ON public.notifications(target_user, read);

-- 3. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON public.notifications;

-- Crear trigger solo para UPDATE (no para INSERT)
CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_notifications_updated_at();

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS

-- Política: Los administradores pueden ver todas las notificaciones de admin
CREATE POLICY "Admin can view admin notifications"
  ON public.notifications
  FOR SELECT
  USING (
    target_user = 'admin' 
    AND auth.role() = 'authenticated'
  );

-- Política: Los usuarios pueden ver solo sus notificaciones
CREATE POLICY "Users can view their notifications"
  ON public.notifications
  FOR SELECT
  USING (
    target_user = 'user' 
    AND (meta->>'userId')::text = auth.uid()::text
  );

-- Política: Permitir inserción desde backend (service_role bypass RLS automáticamente)
-- No necesitamos política INSERT porque supabaseAdmin() ignora RLS

-- Política: Los administradores pueden actualizar notificaciones de admin
CREATE POLICY "Admin can update admin notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    target_user = 'admin' 
    AND auth.role() = 'authenticated'
  );

-- Política: Los usuarios pueden actualizar sus propias notificaciones
CREATE POLICY "Users can update their notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    target_user = 'user' 
    AND (meta->>'userId')::text = auth.uid()::text
  );

-- Política: Los administradores pueden eliminar notificaciones de admin
CREATE POLICY "Admin can delete admin notifications"
  ON public.notifications
  FOR DELETE
  USING (
    target_user = 'admin' 
    AND auth.role() = 'authenticated'
  );

-- Política: Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "Users can delete their notifications"
  ON public.notifications
  FOR DELETE
  USING (
    target_user = 'user' 
    AND (meta->>'userId')::text = auth.uid()::text
  );

-- 6. Habilitar Realtime para esta tabla
-- IMPORTANTE: Esto debe ejecutarse en el panel de Supabase o vía API
-- Dashboard → Database → Replication → Enable realtime for 'notifications'

-- Para verificar si Realtime está habilitado:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Si necesitas habilitarlo manualmente:
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 7. Función para limpiar notificaciones antiguas (opcional)
-- Puedes ejecutar esto periódicamente con un cron job en Supabase
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE read = true
    AND created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permisos para el cliente anon y authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

-- Grant permisos en la secuencia (manejar si no existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications_id_seq') THEN
    GRANT USAGE, SELECT ON SEQUENCE public.notifications_id_seq TO anon;
    GRANT USAGE, SELECT ON SEQUENCE public.notifications_id_seq TO authenticated;
  END IF;
END $$;

-- 9. Comentarios para documentación
COMMENT ON TABLE public.notifications IS 'Tabla de notificaciones en tiempo real para administradores y usuarios';
COMMENT ON COLUMN public.notifications.title IS 'Título de la notificación';
COMMENT ON COLUMN public.notifications.body IS 'Cuerpo/mensaje de la notificación';
COMMENT ON COLUMN public.notifications.type IS 'Tipo: success, error, warning, info, pedido_nuevo, etc.';
COMMENT ON COLUMN public.notifications.meta IS 'Metadatos adicionales en formato JSON';
COMMENT ON COLUMN public.notifications.target_user IS 'Usuario objetivo: admin o user';
COMMENT ON COLUMN public.notifications.read IS 'Si la notificación fue leída';
COMMENT ON COLUMN public.notifications.read_at IS 'Fecha y hora de lectura';

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================

/*

1. EJECUTAR ESTE SCRIPT EN SUPABASE:
   - Ve a Dashboard → SQL Editor
   - Pega este contenido completo
   - Click en "Run"

2. HABILITAR REALTIME (CRÍTICO):
   - Dashboard → Database → Replication
   - Busca la tabla "notifications"
   - Activa el toggle para "Enable Realtime"

3. VERIFICAR PERMISOS:
   - Las políticas RLS ya están configuradas
   - Los usuarios autenticados pueden ver notificaciones según target_user
   - El service_role (backend) puede insertar sin restricciones

4. PROBAR FUNCIONAMIENTO:
   - Desde tu frontend, inserta una notificación
   - Verifica que aparezca en tiempo real en el dashboard
   - Marca como leída y verifica que el badge se actualice

5. MANTENIMIENTO:
   - Las notificaciones leídas mayores a 30 días se pueden limpiar ejecutando:
     SELECT cleanup_old_notifications();
   - Considera crear un cron job para ejecutar esto semanalmente

*/
