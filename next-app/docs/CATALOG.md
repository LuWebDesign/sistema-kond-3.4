# Catálogo público — Referencia técnica

Documentación de los patrones centrales del catálogo público de KOND: hook del carrito, eventos del sistema y estilos configurables.

---

## 1. `useCart` — Hook del carrito

**Archivo:** `hooks/useCatalog.js` (línea 164)

Gestiona el carrito de compras del cliente. Persiste en `localStorage['cart']` y sincroniza precios con Supabase al cargar (con fallback a los datos guardados).

### Importación

```js
import { useCart } from '../hooks/useCatalog'
```

### API pública

```js
const {
  cart,          // CartItem[] — ítems actuales
  addToCart,     // (product, quantity?: number) => void
  updateQuantity,// (index, 'increase' | 'decrease') => void
  removeItem,    // (index) => void
  clearCart,     // () => void
  totalItems,    // number — suma de cantidades
  subtotal,      // number — suma de (price * quantity)
} = useCart()
```

### `addToCart(product, quantity = 1)`

- Si el producto ya existe en el carrito, **suma** la cantidad (no duplica).
- Usa `product.precioPromocional` si está disponible; de lo contrario `product.precioUnitario`.
- No valida stock al agregar — la validación ocurre al confirmar pedido en Supabase.

### Estructura de un ítem en el carrito

```js
{
  productId: string,
  idProducto: string,
  name: string,
  price: number,          // precio efectivo (puede ser promocional)
  originalPrice: number,  // precio base (para mostrar ahorro)
  measures: string,
  image: string,
  quantity: number,
  tiempoUnitario: string, // formato 'HH:MM:SS'
  precioPorMinuto: number,
}
```

---

## 2. CustomEvents del catálogo

El catálogo utiliza `CustomEvent` para comunicar navegación y actualizaciones entre las páginas shell y el componente `<Catalog />` sin necesidad de props directas.

### `catalog:openCart`

Abre el modal del carrito.

```js
window.dispatchEvent(new CustomEvent('catalog:openCart'))
```

Disparado por: `pages/catalog/mi-carrito/index.js`

---

### `catalog:openCheckout`

Abre el modal de checkout.

```js
window.dispatchEvent(new CustomEvent('catalog:openCheckout', {
  detail: { mode: 'order' } // 'order' (nuevo pedido) | 'edit' (editar pedido)
}))
```

Disparado por: `pages/catalog/mi-carrito/finalizar-compra.js`

---

### `catalogStyles:updated`

Notifica al catálogo que los estilos de apariencia cambiaron. El catálogo escucha este evento y los aplica en tiempo real sin recargar la página.

```js
window.dispatchEvent(new CustomEvent('catalogStyles:updated', {
  detail: styles // objeto con las keys de catalogStyles (ver sección 3)
}))
```

Disparado por: panel de administración al guardar cambios de apariencia.

---

## 3. `catalogStyles` — Estilos configurables

Los estilos se obtienen con `getCatalogStyles()` de `utils/supabaseCatalogStyles.js`. Esta función intenta leer desde la API (`/api/admin/catalog-styles`), con fallback a `localStorage` y luego a los valores por defecto.

```js
import { getCatalogStyles } from '../utils/supabaseCatalogStyles'

const styles = await getCatalogStyles()
```

### Keys principales

| Key                  | Tipo      | Default         | Descripción                                       |
|----------------------|-----------|-----------------|---------------------------------------------------|
| `gridColumnsDesktop` | `number`  | `3`             | Columnas del grid en pantallas ≥ 641 px            |
| `gridColumnsMobile`  | `number`  | `2`             | Columnas del grid en pantallas ≤ 640 px            |
| `gridColumns`        | `number`  | `3`             | Fallback legacy (usado si los anteriores no existen) |
| `accentColor`        | `string`  | `'#3b82f6'`     | Color de acento general                           |
| `buttonBg`           | `string`  | `'#3b82f6'`     | Fondo de botones primarios                        |
| `buttonTextColor`    | `string`  | `'#ffffff'`     | Texto de botones primarios                        |
| `buttonRadius`       | `string`  | `'12'`          | Radio de borde de botones (en px, sin unidad)     |
| `cardBg`             | `string`  | `''`            | Fondo de cards de producto                        |
| `cardRadius`         | `string`  | `'12'`          | Radio de borde de cards                           |
| `whatsappEnabled`    | `boolean` | `false`         | Muestra el botón flotante de WhatsApp             |
| `whatsappNumber`     | `string`  | `''`            | Número de WhatsApp (sin `+`, sin espacios)        |
| `whatsappMessage`    | `string`  | `'Hola! ...'`   | Mensaje pre-cargado al abrir WhatsApp             |
| `bannerEnabled`      | `boolean` | `false`         | Muestra el banner superior                        |
| `bannerText`         | `string`  | `''`            | Texto del banner                                  |
| `bannerBg`           | `string`  | `'#3b82f6'`     | Fondo del banner                                  |
| `headerBg`           | `string`  | `''`            | Fondo del header del catálogo                     |
| `logoText`           | `string`  | `'KOND'`        | Texto del logo (si no hay `logoUrl`)              |
| `logoUrl`            | `string`  | `''`            | URL de imagen del logo                            |
| `footerDescription`  | `string`  | `'Tu tienda...'`| Descripción en el footer                          |

> **Nota sobre `gridColumns`:** es la clave legacy. El catálogo lee `gridColumnsDesktop` / `gridColumnsMobile` y las aplica como CSS custom properties (`--catalog-cols-desktop` / `--catalog-cols-mobile`). `gridColumns` se usa como fallback si los nuevos valores no están definidos.

### Cómo se aplican las columnas del grid

Las columnas se aplican como CSS custom properties inline en el contenedor del grid:

```jsx
<div
  className="products-grid"
  style={{
    '--catalog-cols-desktop': gridColumnsDesktop,
    '--catalog-cols-mobile': gridColumnsMobile,
  }}
>
```

Y en `styles/globals.css`:

```css
.products-grid {
  display: grid;
  grid-template-columns: repeat(var(--catalog-cols-desktop, 3), 1fr);
}

@media (max-width: 768px) {
  .products-grid {
    grid-template-columns: repeat(var(--catalog-cols-mobile, 2), 1fr);
  }
}
```
