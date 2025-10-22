## Sistema KOND - Gestión de Producción

Este proyecto es una SPA estática (HTML/CSS/JS) destinada a la gestión interna de productos, pedidos y reportes, y un catálogo público simple para clientes. No usa bundlers ni servidor por defecto: los archivos HTML cargan scripts directamente y la persistencia se realiza en el navegador mediante Local Storage.

Resumen rápido (qué hay y dónde buscar)
- Páginas principales:
  - `index.html` — Dashboard administrativo
  - `catalog.html` — Catálogo público y checkout (transferencia / WhatsApp / retiro)
  - `dashboard.html` — Vistas administrativas y listas de pedidos
  - `tracking.html` — Vista pública para seguimiento de pedidos
  - `user.html` — Gestión de usuarios / login
- Directorio `js/` — lógica principal (catalog.js, products.js, pedidos.js, utils.js, etc.)
- Directorio `css/` — estilos por secciones (catalog.css, modals.css, calendar.css...)

Arquitectura y convenciónes importantes
- Persistencia: el proyecto usa `localStorage` para guardar arrays como `productosBase`, `pedidos`, `pedidosCatalogo` y `cart`. Busca `localStorage.setItem`/`getItem` para ver las claves usadas.
- Globals: algunas variables globales son compartidas entre archivos. Ejemplos: `productosBase`, `pedidos`, `cart`, `selectedDeliveryDate`. Revisa `js/main.js` y `js/catalog.js` para inicialización.
- Orden de scripts: los archivos utilitarios deben cargarse antes que los módulos que dependen de ellos. Revisa `index.html` / `catalog.html` para el orden correcto (`utils.js` → utilidades compartidas → `main.js` inicializador`).

Modelo de datos (ejemplos)
- Producto (ejemplo):
```
{
  id: Number,
  nombre: String,
  categoria: String,
  tipo: String,
  medidas: String,
  tiempoUnitario: String, // 'HH:MM:SS'
  publicado: Boolean, // visible en catálogo público
  hiddenInProductos: Boolean, // oculto en la vista interna
  unidadesPorPlaca: Number,
  usoPlacas: Number,
  costoPlaca: Number,
  costoMaterial: Number,
  imagen: String, // dataURL base64
}
```

- Pedido catálogo (ejemplo simplificado):
```
{
  id: Number,
  cliente: { nombre, apellido?, telefono, email, direccion? },
  items: [ { idProducto, name, price, quantity, measures } ],
  metodoPago: 'transferencia' | 'whatsapp' | 'retiro',
  estadoPago: 'sin_seña' | 'seña_pagada' | 'pagado',
  comprobante: dataURL | null,
  _comprobanteOmitted: Boolean, // si se omite por cuota localStorage
  fechaCreacion: ISOString,
  fechaSolicitudEntrega: 'YYYY-MM-DD' | null,
  total: Number
}
```

Reglas UX / negocio relevantes
- Calendario en checkout (transferencia): domingo no seleccionable, sábado permitidos, el día actual no es seleccionable. Para envíos (método 'envío'), la fecha mínima suele ser hoy + 2 días.
- Transferencia: se pide una seña (50%). El comprobante se guarda en `pedidosCatalogo`. Si localStorage lanza `QuotaExceededError`, el flujo reintenta guardar sin el comprobante y marca el pedido con `_comprobanteOmitted: true` para que el admin lo revise.

Funciones y puntos de entrada clave
- `js/catalog.js` — contiene la mayor parte del flujo de catálogo/checkout: `renderAvailabilityCalendar()`, `sendTransferProof()`, `savePedidoCatalogo()`, `showInfoModal()`.
- `js/pedidos-catalogo.js` — vistas administrativas y exportación de pedidos.
- `js/utils.js` — utilidades compartidas: `guardarProductos()`, `formatCurrency()`, `minutesToTime()`.

Buenas prácticas y convenciones
- Siempre llamar a las funciones de persistencia después de mutar estado: p. ej. `guardarProductos()` o `localStorage.setItem('pedidosCatalogo', JSON.stringify(pedidosCatalogo))`.
- Evitar mutar objetos compartidos sin clonar si los vas a rerenderizar.
- Usar `escapeHtml()` antes de insertar contenido dinámico en el DOM.

Depuración rápida
- Abrir `catalog.html` directamente en el navegador y usar DevTools > Application > Local Storage para inspeccionar claves (`productosBase`, `pedidos`, `pedidosCatalogo`, `cart`).
- Console: agregar `console.log()` temporales en funciones como `sendTransferProof()` o `savePedidoCatalogo()` para seguir el flujo.

Tareas comunes y enlaces
- Añadir producto: `js/products.js` → busca el listener del formulario `addProduct`.
- Modificar visibilidad: `js/database.js` → `showToggleVisibilityModal()`.
- Editar el calendario: `js/calendar.js` y `js/catalog.js` → `renderAvailabilityCalendar()`.

Checklist de control de calidad antes de commits
- Ejecutar manualmente flujo de checkout en `catalog.html` (transferencia y WhatsApp).
- Verificar que las imágenes adjuntas no excedan localStorage para evitar `QuotaExceededError` (usar compresión si es necesario).
- Probar funciones administrativas en `dashboard.html` y `pedidos-catalogo`.

Contacto y notas
- Si agregás cambios que afectan la estructura de datos (por ejemplo, nuevos campos en `pedido`), actualizá cualquier función que lea/escriba `pedidosCatalogo`.
- Para cambios grandes, proponé migraciones: por ejemplo, cuando añadas `_comprobanteOmitted`, actualiza el render admin para mostrar una advertencia.

---
Versión: actualizada 14-10-2025 — contiene notas sobre manejo de comprobantes y fallback para localStorage.
