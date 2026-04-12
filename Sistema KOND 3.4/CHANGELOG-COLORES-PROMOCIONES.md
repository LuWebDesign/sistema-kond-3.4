# 🎨 Changelog: Selector de Colores y Persistencia de Valores

**Fecha**: 19 de octubre de 2025  
**Versión**: 1.1.0

---

## ✅ Problemas Resueltos

### 1. Persistencia de valores en campos de descuento
**Problema anterior**: Al cambiar cualquier otro campo del formulario (nombre, fechas, productos), el campo de descuento se borraba.

**Solución implementada**:
- ✅ La función `updateSpecificFields()` ahora guarda los valores actuales ANTES de regenerar el HTML
- ✅ Parámetro `preserveValues` para controlar cuándo preservar o no
- ✅ Al cambiar el tipo de promoción, los valores se mantienen si ya existen
- ✅ Al editar una promoción existente, los valores se cargan correctamente desde `editPromo.config`

**Código modificado**:
```javascript
// js/marketing.js - línea ~222
function updateSpecificFields(type, preserveValues = true) {
  // Guardar valores actuales ANTES de regenerar
  const currentValues = {};
  if (preserveValues) {
    currentValues.percentage = el('#mkPercentage')?.value || '';
    currentValues.newPrice = el('#mkNewPrice')?.value || '';
    // ... etc
  }
  
  // Regenerar HTML con valores preservados
  html += `<input id="mkPercentage" ... value="${currentValues.percentage || ''}">`;
}
```

---

### 2. Selector de colores mejorado
**Problema anterior**: Solo había un input type="color" básico, sin vista previa ni opciones rápidas.

**Solución implementada**:
- ✅ **8 colores predefinidos** con emojis visuales:
  - 🔴 Rojo (#ef4444)
  - 🟠 Naranja (#f97316)
  - 🟡 Amarillo (#eab308)
  - 🟢 Verde (#22c55e)
  - 🔵 Azul (#3b82f6)
  - 🟣 Morado (#a855f7)
  - 💗 Rosa (#ec4899)
  - ⚫ Gris (#6b7280)

- ✅ **Vista previa en tiempo real** del badge con el color seleccionado
- ✅ Input color HTML5 para colores personalizados
- ✅ Actualización instantánea al cambiar color o texto del badge

**Código modificado**:
```javascript
// js/marketing.js - línea ~165
<div style="display: flex; gap: 8px;">
  <button class="mk-color-preset" data-color="#ef4444">🔴</button>
  <!-- ... más colores -->
</div>
<input id="mkColor" type="color" value="${editPromo?.color || '#3b82f6'}">
<div id="mkColorPreview" style="background: ${color};">
  ${badgeText}
</div>
```

**Estilos CSS agregados**:
```css
/* css/marketing.css - línea ~51 */
.mk-color-preset {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.mk-color-preset:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

---

## 🎯 Funcionalidades

### Flujo de uso mejorado:

1. **Crear nueva promoción**:
   - Click en "Nueva Promoción"
   - Escribir descuento (ej: 20%)
   - Cambiar otros campos → **descuento se mantiene** ✅
   - Elegir color del badge con un click
   - Vista previa del badge en tiempo real

2. **Editar promoción existente**:
   - Click en "Editar"
   - Todos los valores se cargan correctamente
   - Modificar cualquier campo sin perder datos
   - Cambiar color con selector visual

3. **Selector de color**:
   - Click en emoji/color → selección instantánea
   - O usar el picker de color para precisión
   - Vista previa muestra el resultado final

---

## 📁 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `js/marketing.js` | • Función `updateSpecificFields()` con preservación de valores<br>• Event listeners para vista previa de color<br>• Botones de colores predefinidos<br>• Carga de valores al editar |
| `css/marketing.css` | • Estilos `.mk-color-preset`<br>• Hover y active states<br>• Transiciones suaves |

---

## 🧪 Pruebas Recomendadas

### Test 1: Persistencia de descuento
1. Crear nueva promoción tipo "Descuento por porcentaje"
2. Escribir "25" en el campo de descuento
3. Cambiar el nombre de la promoción
4. **Verificar**: El descuento sigue siendo "25" ✅

### Test 2: Cambio de tipo
1. Crear promoción con descuento 20%
2. Cambiar tipo a "Precio fijo"
3. Escribir precio fijo 5000
4. Volver a tipo "Descuento por porcentaje"
5. **Verificar**: El descuento 20% se restauró ✅

### Test 3: Selector de colores
1. Crear nueva promoción
2. Click en emoji 🔴 (rojo)
3. **Verificar**: Vista previa es roja ✅
4. Cambiar texto del badge a "OFERTA"
5. **Verificar**: Vista previa actualiza texto ✅
6. Usar picker de color para elegir color personalizado
7. **Verificar**: Vista previa refleja color exacto ✅

### Test 4: Edición de promoción
1. Editar promoción existente con descuento 15%
2. **Verificar**: Campo muestra "15" ✅
3. Modificar nombre
4. **Verificar**: Descuento sigue en "15" ✅
5. Guardar
6. **Verificar**: En catálogo aparece con descuento correcto ✅

---

## 🐛 Issues Conocidos

Ninguno reportado hasta el momento.

---

## 🚀 Próximas Mejoras Sugeridas

- [ ] Agregar paleta de colores favoritos guardada en localStorage
- [ ] Permitir vista previa del badge en diferentes fondos (claro/oscuro)
- [ ] Agregar validación: impedir descuentos mayores a 99%
- [ ] Shortcut: Enter en campo de descuento para guardar rápido
- [ ] Histórico de colores recientemente usados

---

## 📞 Soporte

Si encuentras algún problema:
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que `marketing.js` y `marketing.css` estén cargados
4. Limpia localStorage si hay datos corruptos: `localStorage.clear()`

---

**Autor**: GitHub Copilot  
**Revisión**: Sistema KOND v3.2
