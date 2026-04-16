-- ============================================
-- TABLA DE NOTIFICACIONES EN TIEMPO REAL (archivado)
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

-- 3. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON public.notifications;

CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_notifications_updated_at();

-- Fin de notifications-table.sql (archivado)
