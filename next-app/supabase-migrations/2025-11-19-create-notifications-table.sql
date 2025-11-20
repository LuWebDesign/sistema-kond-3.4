-- Migración: Crear tabla de notificaciones
-- Fecha: 2025-11-19
-- Descripción: Tabla para almacenar notificaciones del sistema con soporte para targeting (admin/user)

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('success', 'error', 'warning', 'info', 'pedido_nuevo', 'pedido_entregado', 'pedido_asignado', 'finanzas', 'producto', 'carrito')),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,

  -- Metadatos JSON para información adicional (pedidoId, orderId, etc.)
  meta JSONB DEFAULT '{}',

  -- Usuario objetivo (admin, user, o null para todos)
  target_user TEXT CHECK (target_user IN ('admin', 'user')) DEFAULT 'admin',

  -- Usuario que creó la notificación (opcional)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Políticas RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver sus propias notificaciones
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (
    CASE
      WHEN target_user = 'admin' THEN auth.jwt() ->> 'role' = 'admin'
      WHEN target_user = 'user' THEN auth.uid()::text = (meta->>'userId')::text
      ELSE false
    END
  );

-- Política: Solo admins pueden crear notificaciones
CREATE POLICY "Only admins can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin' OR
    target_user = 'user'
  );

-- Política: Los usuarios pueden actualizar sus propias notificaciones (marcar como leídas)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (
    CASE
      WHEN target_user = 'admin' THEN auth.jwt() ->> 'role' = 'admin'
      WHEN target_user = 'user' THEN auth.uid()::text = (meta->>'userId')::text
      ELSE false
    END
  );

-- Política: Solo admins pueden eliminar notificaciones
CREATE POLICY "Only admins can delete notifications" ON notifications
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Comentarios en la tabla
COMMENT ON TABLE notifications IS 'Sistema de notificaciones del Sistema KOND';
COMMENT ON COLUMN notifications.target_user IS 'Usuario objetivo: admin o user';
COMMENT ON COLUMN notifications.meta IS 'Metadatos JSON con información adicional (pedidoId, orderId, etc.)';