# 🔧 APLICAR MIGRACIÓN: Columnas Faltantes en pedidos_catalogo

## ❗ PROBLEMA IDENTIFICADO

La tabla `pedidos_catalogo` en Supabase **NO tiene las columnas necesarias** para soportar la gestión completa de pedidos desde el admin. Por eso los cambios que haces en el modal no se guardan en la base de datos.

## ✅ SOLUCIÓN

Debes ejecutar el SQL que está en `supabase/add-pedidos-catalogo-fields.sql` en tu proyecto de Supabase.

---

## 📝 INSTRUCCIONES PASO A PASO

### Opción 1: Ejecutar desde el Dashboard de Supabase (RECOMENDADO)

1. **Abre el SQL Editor de Supabase:**
   ```
   https://supabase.com/dashboard/project/sdudjuomhcywhpyfziel/sql/new
   ```

2. **Copia y pega el siguiente SQL:**

```sql
-- ============================================
-- AGREGAR COLUMNAS FALTANTES A pedidos_catalogo
-- Para soportar gestión completa de pedidos en admin
-- ============================================

-- Agregar campos de gestión del pedido
ALTER TABLE pedidos_catalogo 
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS fecha_confirmada_entrega DATE,
ADD COLUMN IF NOT EXISTS fecha_produccion DATE,
ADD COLUMN IF NOT EXISTS fecha_produccion_calendario DATE,
ADD COLUMN IF NOT EXISTS fecha_entrega DATE,
ADD COLUMN IF NOT EXISTS fecha_entrega_calendario DATE,
ADD COLUMN IF NOT EXISTS monto_recibido NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS asignado_al_calendario BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notas TEXT,
ADD COLUMN IF NOT EXISTS notas_admin TEXT;

-- Crear índices para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_estado ON pedidos_catalogo(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_estado_pago ON pedidos_catalogo(estado_pago);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_fecha_entrega ON pedidos_catalogo(fecha_entrega);
CREATE INDEX IF NOT EXISTS idx_pedidos_catalogo_cliente_email ON pedidos_catalogo(cliente_email);
```

3. **Ejecuta el SQL:**
   - Haz clic en el botón "Run" (▶️) o presiona `Ctrl+Enter`
   - Deberías ver el mensaje: "Success. No rows returned"

4. **Verifica que las columnas se agregaron:**
   - Ve a la sección "Table Editor" → tabla `pedidos_catalogo`
   - Deberías ver las nuevas columnas: `estado`, `fecha_produccion`, `monto_recibido`, etc.

---

## 🧪 PROBAR QUE FUNCIONA

Después de aplicar la migración:

1. **Reinicia el servidor de desarrollo:**
   ```powershell
   # Detén el servidor (Ctrl+C)
   # Y vuelve a iniciarlo:
   npm run dev
   ```

2. **Prueba actualizar un pedido:**
   - Abre Admin → Pedidos Catálogo
   - Abre el modal de un pedido
   - Cambia el estado o la fecha de producción
   - Guarda los cambios
   - **Refresca la página**
   - ✅ Los cambios deberían mantenerse ahora

3. **Verifica en consola:**
   - Abre DevTools (F12)
   - Ve a la pestaña "Console"
   - Deberías ver mensajes como:
     ```
     🔄 Intentando sincronizar pedido X al servidor...
     ✅ Pedido sincronizado exitosamente en servidor
     ```

---

## 📊 COLUMNAS AGREGADAS

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `estado` | VARCHAR(50) | Estado del pedido (pendiente, confirmado, en_preparacion, listo, entregado, cancelado) |
| `fecha_confirmada_entrega` | DATE | Fecha de entrega confirmada por admin |
| `fecha_produccion` | DATE | Fecha programada para producción |
| `fecha_produccion_calendario` | DATE | Fecha asignada en calendario de producción |
| `fecha_entrega` | DATE | Fecha real de entrega |
| `fecha_entrega_calendario` | DATE | Fecha asignada en calendario de entrega |
| `monto_recibido` | NUMERIC(10,2) | Monto recibido (seña o pago total) |
| `asignado_al_calendario` | BOOLEAN | Si fue asignado al calendario |
| `notas` | TEXT | Notas del cliente |
| `notas_admin` | TEXT | Notas internas del admin |

---

## ⚠️ NOTAS IMPORTANTES

- Esta migración es **segura**: usa `IF NOT EXISTS` para no fallar si las columnas ya existen
- **No perderás datos existentes**: solo agrega columnas nuevas
- Los valores por defecto se aplicarán a los registros existentes
- Si ya aplicaste esta migración antes, puedes ejecutarla de nuevo sin problemas

---

## 🐛 TROUBLESHOOTING

### Error: "column 'estado' already exists"
✅ **Esto es normal** si ya ejecutaste la migración. El sistema ya tiene las columnas.

### Los cambios aún no se guardan
1. Verifica que ejecutaste el SQL en Supabase
2. Revisa la consola del navegador (F12) para ver errores
3. Asegúrate de que el servidor de desarrollo está corriendo
4. Prueba con un pedido nuevo (no uno antiguo)

### Error: "permission denied"
- Asegúrate de que estás usando el proyecto correcto en Supabase
- Verifica que tu usuario tiene permisos de administrador

---

## 📞 SIGUIENTE PASO

Una vez que apliques esta migración, **¡los cambios se guardarán en Supabase!** 🎉

Si tienes algún problema, revisa los logs del servidor de desarrollo y la consola del navegador.
