---
name: email-transaccional
description: "Agregar un nuevo tipo de email transaccional al sistema (Resend). Usar cuando: querés notificar al cliente por email ante un nuevo evento de pedido u otro disparador del sistema."
triggers: [email, resend, notificación email, send-order-email, confirmado, listo, transaccional, template email]
---

# Skill: email-transaccional

## Objetivo
Añadir un nuevo estado/evento que dispara un email al cliente usando la API Resend ya configurada en `pages/api/send-order-email.js`.

## Pasos

1. **Agregar el nuevo estado** al whitelist en `send-order-email.js`:
   ```js
   if (!['confirmado', 'listo', 'nuevo-estado'].includes(nuevoEstado)) { ... }
   ```

2. **Crear el template HTML** al final del mismo archivo:
   ```js
   function buildNuevoEstadoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl }) {
     return `<html>...usar buildItemsTable(items) y formatCurrency(total)...</html>`
   }
   ```

3. **Agregar el case** en el bloque `if/else`:
   ```js
   } else if (nuevoEstado === 'nuevo-estado') {
     subject = '📬 Asunto descriptivo - KOND'
     bodyHtml = buildNuevoEstadoEmail({ clienteNombre, pedidoId, items, total, miCuentaUrl })
   }
   ```

4. **Llamar desde el trigger** (por ej. desde `pages/api/pedidos/catalogo/[id].js`):
   ```js
   await fetch('/api/send-order-email', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ pedidoId, nuevoEstado: 'nuevo-estado' })
   })
   ```

## Output esperado
- Nuevo estado en el whitelist
- Función `buildXxxEmail()` con HTML inline completo
- Email enviado sin romper el flujo si Resend no está configurado (ya retorna `skipped: true`)

## Notas de eficiencia
- Reutilizar `buildItemsTable(items)`, `formatCurrency()` y `escapeHtml()` ya presentes en el archivo.
- El endpoint nunca lanza excepción al cliente — devuelve `{ success: false, skipped: true }` si falta config.
- Variables de entorno requeridas: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_BASE_URL`.
