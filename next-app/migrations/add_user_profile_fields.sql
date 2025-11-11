-- Agregar campos de perfil a la tabla usuarios
-- Fecha: 2025-11-11
-- Propósito: Permitir que los usuarios guarden su información de perfil completa

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS nombre VARCHAR(100),
ADD COLUMN IF NOT EXISTS apellido VARCHAR(100),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS telefono VARCHAR(50),
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS localidad VARCHAR(100),
ADD COLUMN IF NOT EXISTS cp VARCHAR(20),
ADD COLUMN IF NOT EXISTS provincia VARCHAR(100),
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Crear índice para email
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Comentarios para documentar los campos
COMMENT ON COLUMN usuarios.nombre IS 'Nombre del usuario';
COMMENT ON COLUMN usuarios.apellido IS 'Apellido del usuario';
COMMENT ON COLUMN usuarios.email IS 'Email del usuario';
COMMENT ON COLUMN usuarios.telefono IS 'Teléfono de contacto';
COMMENT ON COLUMN usuarios.direccion IS 'Dirección de envío';
COMMENT ON COLUMN usuarios.localidad IS 'Localidad/ciudad';
COMMENT ON COLUMN usuarios.cp IS 'Código postal';
COMMENT ON COLUMN usuarios.provincia IS 'Provincia';
COMMENT ON COLUMN usuarios.observaciones IS 'Observaciones adicionales para envíos';
