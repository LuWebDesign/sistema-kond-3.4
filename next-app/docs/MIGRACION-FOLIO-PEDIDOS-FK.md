# Migración: Folio legible de pedidos y relación movimientos → pedidos

Fecha: 2025-11-12
Objetivo: Incorporar un identificador humano estable `nro_pedido` (ej: `PC-2025-00042`) y la relación formal `pedido_id` entre `movimientos_financieros` y `pedidos_catalogo`.

## Motivación
- Mejorar trazabilidad financiera: JOIN directo para obtener todos los movimientos de un pedido.
- Simplificar reportes e informes (ventas diarias por pedido, recuperación de señas, pagos restantes).
- Evitar parseos frágiles de texto en `descripcion` o `idempotency_key`.

## Pasos SQL
Ejecutar el archivo `supabase-migrations/2025-11-12-pedidos-folio-and-fk.sql` en el panel SQL de Supabase.

Contenido principal:
1. `ALTER TABLE pedidos_catalogo ADD COLUMN nro_pedido TEXT UNIQUE;`
2. Backfill de folios para pedidos existentes.
3. `ALTER TABLE movimientos_financieros ADD COLUMN pedido_id INTEGER REFERENCES pedidos_catalogo(id) ON DELETE SET NULL;`
4. Index para acelerar consultas por pedido.
5. Backfill automático de `pedido_id` usando `idempotency_key`.
6. Fallback de backfill usando texto en `descripcion`.

## Validación Post-Migración
1. Verificar que todos los pedidos tienen `nro_pedido` distinto:
   ```sql
   SELECT nro_pedido, COUNT(*) FROM pedidos_catalogo GROUP BY nro_pedido HAVING COUNT(*) > 1;
   ```
   Debe devolver 0 filas.
2. Comprobar movimientos con relación:
   ```sql
   SELECT COUNT(*) AS total, COUNT(pedido_id) AS con_fk FROM movimientos_financieros;
   ```
3. Revisar algunos movimientos:
   ```sql
   SELECT id, pedido_id, idempotency_key, descripcion FROM movimientos_financieros ORDER BY created_at DESC LIMIT 20;
   ```

## Cambios en Código
- `supabasePedidos.js`: genera folio en `createPedidoCatalogo` y expone `nro_pedido`.
- `PedidoCard.js`: muestra `nroPedido` si existe (fallback a ID).
- `finanzasUtils.js` y `supabaseFinanzas.js`: incluyen `pedido_id` al crear/actualizar movimientos.
- `finanzas.js`: mapea `pedidoId` e `idempotencyKey` para potencial uso futuro en la UI.

## Próximos Ajustes Recomendados
- Mostrar folio también en modal de detalle de pedido y en exportaciones CSV.
- Añadir filtros por folio en búsqueda administrativa.
- Agregar reportes agrupados por `nro_pedido` (ingreso total, seña, restante, fecha de pago completo).
- Limpiar parseos antiguos de `PedidoID:` en descripciones cuando todo esté migrado.

## Rollback (Opcional)
En caso extremo:
```sql
ALTER TABLE movimientos_financieros DROP COLUMN pedido_id;
ALTER TABLE pedidos_catalogo DROP COLUMN nro_pedido;
```
(No recomendado una vez consumido en UI.)

## Notas
- La columna `nro_pedido` se vuelve el identificador humano en todas las vistas. Evitar recalcularlo; se basa en el ID interno.
- Los movimientos antiguos sin `pedido_id` seguirán visibles; se pueden auditar manualmente para completarlos si el parseo no logró asociarlos.

---
Fin de la migración.
