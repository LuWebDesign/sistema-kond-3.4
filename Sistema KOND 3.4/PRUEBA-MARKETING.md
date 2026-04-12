# 🧪 Guía de Prueba - Sistema de Marketing

## Problema Identificado y Solucionado

### ❌ Problema:
Cuando hacías clic en "Nueva promoción" o "Nuevo cupón", el sistema pensaba que estabas **editando** en lugar de **creando** porque el evento del clic se estaba pasando como parámetro `editPromo`.

### ✅ Solución Aplicada:
Agregué validación al inicio de `openCreateModal()` y `openCouponModal()` para detectar si el parámetro es un objeto Event y convertirlo a `null`:

```javascript
if (editPromo && editPromo.type && editPromo.target) {
  editPromo = null; // Es un Event, no una promoción
}
```

---

## 📋 Pasos para Probar

### 1. Abrir el Sistema
```
1. Abre: index.html
2. Navega a la sección "Marketing" en la sidebar
```

### 2. Crear una Promoción

#### A. Descuento Porcentual (20%)
1. Clic en `+ Nueva promoción`
2. El modal debe decir "**Nueva** promoción" (no "Editar")
3. El botón debe decir "**Guardar**" (no "Actualizar")
4. Completa:
   - **Título**: "Descuento 20%"
   - **Tipo**: Descuento Porcentual
   - **Porcentaje**: 20
   - **Inicio**: (fecha hoy)
   - **Fin**: (fecha +30 días)
   - **Insignia**: "20% OFF"
   - **Color**: Rojo (#ef4444)
   - **Productos**: Selecciona 2-3 productos (mantén Ctrl presionado)
   - **Activa**: ✅ Marcado
5. Clic en "Guardar"
6. **Verificar**: 
   - Debe aparecer un mensaje verde: "Promoción creada correctamente"
   - La tarjeta debe aparecer en la lista
   - Debe mostrar "🟢 Activa"

#### B. Descuento Porcentual (10%) - Segunda Promoción
1. Clic en `+ Nueva promoción`
2. Completa:
   - **Título**: "Descuento Adicional 10%"
   - **Tipo**: Descuento Porcentual
   - **Porcentaje**: 10
   - **Insignia**: "10% EXTRA"
   - **Color**: Azul (#3b82f6)
   - **Productos**: Selecciona LOS MISMOS productos de la primera promo
3. Guardar
4. **Verificar**: Ahora debes tener 2 promociones en la lista

### 3. Crear un Cupón

1. Clic en la pestaña `🎫 Cupones`
2. El botón cambia a `+ Nuevo cupón`
3. Clic en `+ Nuevo cupón`
4. El modal debe decir "**Nuevo Cupón**" (not "Editar")
5. Completa:
   - **Código**: VERANO20
   - **Descripción**: Cupón de verano 20%
   - **Tipo**: Porcentaje
   - **Valor**: 20
   - **Compra mínima**: 5000
   - **Cantidad mínima**: 2
   - **Activo**: ✅ Marcado
6. Guardar
7. **Verificar**: Debe aparecer en la lista de cupones

### 4. Editar una Promoción

1. Ve a la pestaña `🎯 Promociones`
2. En cualquier tarjeta, clic en "✏️ Editar"
3. El modal debe decir "**Editar** promoción"
4. El botón debe decir "**Actualizar**"
5. Cambia algo (ej: título, porcentaje)
6. Guardar
7. **Verificar**: Los cambios se reflejan en la tarjeta

### 5. Ver en Catálogo

1. Abre una nueva pestaña con `catalog.html`
2. Busca los productos que incluiste en las promociones
3. **Verificar**:
   - Deben mostrar **2 badges apilados** (uno rojo, uno azul)
   - Debe aparecer un **tercer badge verde** con "-28%" (descuento acumulativo)
   - El precio debe mostrar:
     - Precio original: $X (tachado)
     - Precio con descuento: $Y (en rojo)
   - Selector de cantidad con botones +/-

---

## 🔍 Verificaciones de Consola

Abre las DevTools (F12) y ve a la pestaña Console. Deberías ver:

```
[DEBUG] render() llamado, currentTab: promotions
[DEBUG] Promociones cargadas: Array(2) [...]
[DEBUG] Promociones filtradas: 2 de 2
```

Si haces clic en "Nueva promoción":
```
[DEBUG] btnNuevaPromo clicked
[DEBUG] openCreateModal llamado con: null
[DEBUG] isEdit: false
```

Si haces clic en "Editar":
```
[DEBUG] openCreateModal llamado con: {id: 123, title: "...", ...}
[DEBUG] isEdit: true
```

---

## 🐛 Si algo no funciona

### Problema: No aparece el modal
- **Solución**: Revisa la consola, puede haber un error de JavaScript
- **Verifica**: Que `js/utils.js` y `js/marketing.js` estén cargados

### Problema: Modal dice "Actualizar" en lugar de "Guardar"
- **Solución**: Refresca la página (Ctrl+F5) para limpiar caché
- **Verifica**: Que los cambios en `marketing.js` se hayan guardado

### Problema: Las promociones no se guardan
- **Solución**: 
  1. Abre DevTools > Application > Local Storage
  2. Busca la clave `marketing_promotions`
  3. Si está vacío, prueba crear una promo manualmente desde consola:
     ```javascript
     localStorage.setItem('marketing_promotions', JSON.stringify([{
       id: 1,
       title: "Test",
       type: "percentage_discount",
       config: {percentage: 20},
       productIds: [],
       active: true,
       badge: "TEST",
       color: "#ef4444"
     }]));
     location.reload();
     ```

### Problema: No se ven las promociones en catálogo
- **Verifica**:
  1. Que `catalog.html` tenga cargado `js/promo-engine.js` **antes** de `js/catalog.js`
  2. Que las promociones tengan `productIds` con IDs válidos
  3. En DevTools Console:
     ```javascript
     console.log(localStorage.getItem('marketing_promotions'));
     ```

---

## ✅ Checklist de Verificación

- [ ] Modal "Nueva promoción" dice "Guardar" (no "Actualizar")
- [ ] Modal "Editar promoción" dice "Actualizar"
- [ ] Las promociones se guardan en localStorage
- [ ] Las promociones aparecen en la lista de Marketing
- [ ] Se pueden crear múltiples promociones
- [ ] Modal "Nuevo Cupón" funciona correctamente
- [ ] Los cupones aparecen en la pestaña Cupones
- [ ] En catalog.html se ven múltiples badges apilados
- [ ] El descuento porcentual acumulativo es correcto (20% + 10% = 28%)
- [ ] El selector de cantidad +/- funciona

---

## 📊 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `js/marketing.js` | ✅ Validación de Event en `openCreateModal()` y `openCouponModal()` |
| `js/marketing.js` | ✅ Logs de debug agregados (temporales) |
| `index.html` | ✅ Sección Marketing con pestañas |

---

**Fecha**: 19 de octubre de 2025  
**Estado**: ✅ Problema resuelto - Listo para probar
