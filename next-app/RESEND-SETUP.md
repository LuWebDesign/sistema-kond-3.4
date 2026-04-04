# Configuración de Resend para Emails Transaccionales

## ¿Qué es Resend?

[Resend](https://resend.com) es un servicio de envío de emails transaccionales. Se usa en KOND para notificar a los clientes cuando su pedido cambia de estado (confirmado / listo).

---

## 1. Crear cuenta en Resend

1. Ir a [resend.com/signup](https://resend.com/signup)
2. Registrarse con email o GitHub
3. Verificar el email de la cuenta

## 2. Obtener API Key

1. En el dashboard de Resend, ir a **API Keys** (menú lateral)
2. Click en **Create API Key**
3. Nombre: `kond-production` (o el que quieras)
4. Permisos: **Sending access** (solo envío)
5. Copiar la key generada (empieza con `re_`)

> ⚠️ La API key solo se muestra una vez. Guardala en un lugar seguro.

## 3. Configurar dominio (recomendado)

Para enviar emails desde tu dominio propio (ej: `pedidos@kond.com.ar`):

1. En Resend, ir a **Domains** → **Add Domain**
2. Ingresar tu dominio (ej: `kond.com.ar`)
3. Agregar los registros DNS que Resend indica (MX, SPF, DKIM)
4. Esperar verificación (puede tardar unos minutos)

**Sin dominio propio:** Resend permite enviar desde `onboarding@resend.dev` para pruebas (límite: 100 emails/día en plan gratuito).

## 4. Variables de entorno

Agregar en `.env.local` (desarrollo local):

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=KOND <pedidos@kond.com.ar>
```

### En Vercel (producción):

1. Ir a tu proyecto en [vercel.com](https://vercel.com)
2. **Settings** → **Environment Variables**
3. Agregar:
   - `RESEND_API_KEY` = tu API key
   - `RESEND_FROM_EMAIL` = `KOND <pedidos@kond.com.ar>` (o `onboarding@resend.dev` para pruebas)
4. Redesplegar para que tome las variables

## 5. Cuándo se envían emails

| Estado del pedido | Email enviado |
|---|---|
| `confirmado` | ✅ Tu pedido fue confirmado - KOND |
| `listo` | 📦 Tu pedido está listo - KOND |

Los emails se disparan automáticamente cuando el admin cambia el estado del pedido desde `/admin/orders`.

## 6. Comportamiento si falla

- Si Resend no está configurado (sin API key), el cambio de estado se guarda normalmente y el email se omite silenciosamente.
- Si el envío de email falla por cualquier motivo, el cambio de estado igual se persiste. No se bloquea la operación del admin.
- Los errores se registran en los logs del servidor (`console.warn`).

## 7. Plan gratuito de Resend

- **100 emails/día**
- **3,000 emails/mes**
- 1 dominio personalizado
- Sin tarjeta de crédito

Para la mayoría de negocios pequeños/medianos esto es más que suficiente.

## 8. Probar el envío

1. Configurar las variables de entorno
2. Crear un pedido de prueba con un email válido
3. Cambiar el estado a "confirmado" desde el panel admin
4. Verificar que el email llegó a la bandeja de entrada

---

*Última actualización: Abril 2026*
