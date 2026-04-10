# 📦 Configuración de Stock en Supabase

## Resumen
Este documento explica cómo agregar y configurar el sistema de stock en la base de datos de Supabase para el Sistema KOND.

## 🎯 Características del Sistema de Stock

- **Campo `stock`**: Almacena la cantidad de unidades disponibles
- **Descuento automático**: Al crear un pedido, se resta del stock
- **Stock mínimo**: Nunca puede ser negativo (mínimo 0)
- **Indicadores visuales**: 
  - 🟢 Verde: stock > 10
  - 🟡 Amarillo: stock entre 1-10
  - 🔴 Rojo: stock = 0

## 📋 Pasos de Instalación

### 1. Ejecutar la migración SQL

Ve al panel de Supabase → SQL Editor y ejecuta el archivo:
```
supabase/add-stock-field.sql
```

Este script hará lo siguiente:
- ✅ Agregar el campo `stock` (INTEGER) a la tabla `productos`
- ✅ Crear índice para mejorar consultas de productos con stock
- ✅ Configurar políticas RLS para lectura pública y edición solo admins
- ✅ Crear función auxiliar `descontar_stock_producto()`
- ✅ Migrar datos del campo `unidades` a `stock` (si existe)

### 2. Verificar la instalación

Ejecuta esta consulta en SQL Editor:
```sql
SELECT id, nombre, stock, publicado 
FROM productos 
ORDER BY stock ASC 
LIMIT 10;
```

Deberías ver todos los productos con su campo `stock`.

### 3. Actualizar stock inicial de productos

Si necesitas establecer stock inicial manualmente:

```sql
-- Actualizar stock de un producto específico
UPDATE productos 
SET stock = 50 
WHERE id = 1;

-- Actualizar stock de múltiples productos
UPDATE productos 
SET stock = CASE 
  WHEN id = 1 THEN 50
  WHEN id = 2 THEN 30
  WHEN id = 3 THEN 100
  ELSE stock
END
WHERE id IN (1, 2, 3);

-- Establecer stock predeterminado para todos los productos publicados
UPDATE productos 
SET stock = 20 
WHERE publicado = true AND stock = 0;
```

## 🔄 Funcionamiento Automático

### Descuento de Stock al Crear Pedido

El sistema descuenta automáticamente el stock cuando:
1. Un cliente completa un pedido en el catálogo público
2. El pedido se guarda exitosamente en Supabase
3. Se ejecuta el código en `hooks/useCatalog.js`:

```javascript
// Para cada item del pedido
const nuevoStock = Math.max(0, (stockActual || 0) - cantidad);
await supabase
  .from('productos')
  .update({ stock: nuevoStock })
  .eq('id', productoId);
```

### Función SQL Auxiliar (Opcional)

También puedes usar la función SQL para descontar stock:

```sql
-- Descontar 5 unidades del producto con ID 1
SELECT descontar_stock_producto(1, 5);

-- Resultado: retorna el nuevo stock después del descuento
```

## 🎨 Visualización en el Frontend

El stock se muestra automáticamente en las tarjetas del catálogo:

```jsx
{product.stock !== undefined && (
  <div className="stock-indicator" 
       style={{backgroundColor: product.stock > 10 ? '#10b981' : 
                                 product.stock > 0 ? '#f59e0b' : '#ef4444'}}>
    Stock: {product.stock}
  </div>
)}
```

## 🛠️ Mantenimiento

### Consultas Útiles

```sql
-- Ver productos con bajo stock
SELECT id, nombre, stock 
FROM productos 
WHERE stock < 10 AND publicado = true
ORDER BY stock ASC;

-- Ver productos sin stock
SELECT id, nombre, categoria 
FROM productos 
WHERE stock = 0 AND publicado = true;

-- Reponer stock masivo
UPDATE productos 
SET stock = stock + 50 
WHERE categoria = 'Llaveros';

-- Historial de cambios (requiere auditoría adicional)
-- Considerar agregar una tabla audit_stock si se necesita tracking detallado
```

### Agregar Auditoría de Stock (Opcional)

Si necesitas rastrear cambios de stock:

```sql
-- Crear tabla de auditoría
CREATE TABLE audit_stock (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER REFERENCES productos(id),
  stock_anterior INTEGER,
  stock_nuevo INTEGER,
  cantidad_cambio INTEGER,
  motivo VARCHAR(255),
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para registrar cambios
CREATE OR REPLACE FUNCTION audit_stock_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stock IS DISTINCT FROM NEW.stock THEN
    INSERT INTO audit_stock (producto_id, stock_anterior, stock_nuevo, cantidad_cambio)
    VALUES (NEW.id, OLD.stock, NEW.stock, NEW.stock - OLD.stock);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stock_audit_trigger
AFTER UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION audit_stock_changes();
```

## ⚠️ Notas Importantes

1. **No se permite stock negativo**: El sistema usa `Math.max(0, stock - cantidad)` para evitar negativos
2. **Políticas RLS**: Solo administradores pueden modificar stock directamente
3. **Sincronización**: El stock se actualiza en tiempo real en la base de datos
4. **Cache**: El frontend puede tardar unos segundos en reflejar cambios (recargar página)

## 🔍 Troubleshooting

### El stock no se descuenta
- Verificar que el campo `stock` existe en Supabase
- Revisar políticas RLS (debe permitir UPDATE)
- Verificar consola del navegador para errores

### Stock aparece como undefined
- Confirmar que `useCatalog.js` mapea el campo: `stock: p.stock || 0`
- Verificar que la consulta SELECT incluye el campo stock

### Permisos denegados
- Asegurar que las políticas RLS permiten lectura pública
- Para modificación manual, usar cuenta de admin

## 📚 Referencias

- Archivo SQL: `supabase/add-stock-field.sql`
- Hook de catálogo: `next-app/hooks/useCatalog.js`
- Componente visual: `next-app/pages/catalog.js`
- Documentación Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
