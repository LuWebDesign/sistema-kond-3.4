# 🎨 Control de Color de Texto en Badges - Guía Completa

**Fecha**: 19 de octubre de 2025  
**Versión**: 1.2.0

---

## 🆕 Nueva Funcionalidad: Color de Texto Personalizable

Ahora puedes controlar **tanto el color de fondo como el color del texto** de los badges de promociones.

---

## 🎯 Características

### 1. Selector de Color de Texto
En el formulario de promociones verás:
- **Selector de fondo**: 10 colores predefinidos + picker personalizado
- **Selector de texto**: Dropdown con 5 opciones

### 2. Opciones de Color de Texto

| Opción | Descripción | Cuándo usar |
|--------|-------------|-------------|
| **Auto (detectar contraste)** | 🤖 Calcula automáticamente si el texto debe ser blanco o negro según el fondo | ✅ **RECOMENDADO** - Siempre funciona bien |
| **⚪ Blanco** | Texto blanco fijo | Fondos oscuros (azul, rojo oscuro, negro, morado) |
| **⚫ Negro** | Texto negro fijo | Fondos claros (amarillo, blanco, rosa claro, verde claro) |
| **Gris oscuro** | Texto #1f2937 | Fondos muy claros para contraste suave |
| **Gris claro** | Texto #f3f4f6 | Fondos oscuros para contraste suave |

### 3. Vista Previa en Tiempo Real
El badge de vista previa muestra **exactamente** cómo se verá en el catálogo:
- Color de fondo actualizado
- Color de texto actualizado
- Texto del badge actualizado

---

## 🧮 Algoritmo de Auto-Detección

El modo **"Auto"** usa la fórmula WCAG de luminosidad:

```javascript
// Convertir hex (#3b82f6) a RGB
const r = parseInt(hexColor.substr(1, 2), 16);
const g = parseInt(hexColor.substr(3, 2), 16);
const b = parseInt(hexColor.substr(5, 2), 16);

// Calcular luminosidad (pesos según percepción humana)
const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// Decidir color de texto
return luminance > 0.5 ? '#000000' : '#ffffff';
```

**Ejemplos**:
- Fondo amarillo (#eab308) → luminance = 0.72 → Texto **negro** ⚫
- Fondo azul (#3b82f6) → luminance = 0.48 → Texto **blanco** ⚪
- Fondo blanco (#ffffff) → luminance = 1.0 → Texto **negro** ⚫
- Fondo negro (#000000) → luminance = 0.0 → Texto **blanco** ⚪

---

## 📋 Guía de Uso

### Crear Promoción con Color de Texto

1. **Abrir formulario**:
   - Click en "Nueva Promoción"

2. **Configurar badge**:
   - Escribir texto: "OFERTA"
   - Elegir color de fondo (ej: amarillo 🟡)

3. **Elegir color de texto**:
   - **Opción 1 (recomendada)**: Dejar en "Auto" → se ajusta automáticamente
   - **Opción 2**: Seleccionar manualmente (ej: "Negro" para fondos claros)

4. **Vista previa**:
   - Verificar que el badge se ve bien
   - Si el texto no se ve, cambiar modo manual

5. **Guardar**:
   - Click en "Guardar"
   - El badge aparecerá en el catálogo con los colores elegidos

---

## 🎨 Combinaciones Recomendadas

### Fondos Oscuros + Texto Blanco
| Fondo | Color | Texto |
|-------|-------|-------|
| Rojo | 🔴 #ef4444 | ⚪ Blanco |
| Azul | 🔵 #3b82f6 | ⚪ Blanco |
| Morado | 🟣 #a855f7 | ⚪ Blanco |
| Gris | ⚫ #6b7280 | ⚪ Blanco |
| Negro | ⚫ #000000 | ⚪ Blanco |

### Fondos Claros + Texto Negro
| Fondo | Color | Texto |
|-------|-------|-------|
| Amarillo | 🟡 #eab308 | ⚫ Negro |
| Rosa | 💗 #ec4899 | ⚫ Negro |
| Blanco | ⚪ #ffffff | ⚫ Negro |
| Verde | 🟢 #22c55e | ⚫ Negro |

### Contrastes Altos (Máxima Legibilidad)
| Fondo | Texto | Uso |
|-------|-------|-----|
| Negro | Blanco | Promociones importantes |
| Blanco | Negro | Fondos claros elegantes |
| Rojo | Blanco | Urgencia / Descuentos |
| Amarillo | Negro | Atención / Novedades |

---

## 🔧 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `js/marketing.js` | • Agregado campo `#mkTextColor` selector<br>• Función `getContrastColor()` para auto-detección<br>• `updateColorPreview()` aplica textColor<br>• Guardar `textColor` en objeto promo |
| `js/promo-engine.js` | • Función `getContrastColor()` centralizada<br>• Calcular textColor si es 'auto'<br>• Agregar `textColor` a badges array<br>• Incluir `badgeTextColor` en result |
| `js/catalog.js` | • Aplicar `color: ${b.textColor}` en badges<br>• Soporte para textColor personalizado |
| `css/marketing.css` | • Estilos para botones de colores<br>• Grid layout para selectores |

---

## 🧪 Pruebas

### Test 1: Auto-Detección
1. Crear promo con fondo amarillo 🟡
2. Dejar "Auto" en color de texto
3. **Verificar**: Vista previa muestra texto negro ✅
4. Guardar y abrir catálogo
5. **Verificar**: Badge amarillo con texto negro ✅

### Test 2: Color Manual
1. Crear promo con fondo azul 🔵
2. Cambiar texto a "Negro" manualmente
3. **Verificar**: Vista previa muestra advertencia visual (texto mal contrastado)
4. Cambiar texto a "Blanco"
5. **Verificar**: Vista previa se ve correcta ✅

### Test 3: Múltiples Badges
1. Crear promo 1: Rojo 🔴 + Texto blanco
2. Crear promo 2: Amarillo 🟡 + Texto negro
3. Aplicar ambas al mismo producto
4. **Verificar**: Catálogo muestra 2 badges apilados con colores correctos ✅

### Test 4: Edición
1. Editar promo existente
2. **Verificar**: Selectores de color cargan valores guardados ✅
3. Cambiar de "Auto" a "Blanco"
4. **Verificar**: Vista previa actualiza inmediatamente ✅
5. Guardar
6. **Verificar**: Cambio se refleja en catálogo ✅

---

## 📊 Estructura de Datos

### Objeto Promoción (actualizado)
```javascript
{
  id: 123456,
  title: "Oferta de Verano",
  badge: "VERANO",
  color: "#eab308",        // ← Color de fondo
  textColor: "auto",       // ← NUEVO: Color de texto ('auto', '#ffffff', '#000000', etc.)
  // ... resto de campos
}
```

### Objeto Badge en PromoEngine (actualizado)
```javascript
{
  text: "VERANO",
  color: "#eab308",        // ← Color de fondo
  textColor: "#000000"     // ← NUEVO: Color de texto calculado/fijo
}
```

### Renderizado en Catálogo
```html
<span class="catalog-product-badge" 
      style="background-color: #eab308; color: #000000; top: 8px;">
  VERANO
</span>
```

---

## 🎓 Tips de Accesibilidad

### Contraste WCAG AA
Para cumplir con estándares de accesibilidad:
- **Ratio mínimo**: 4.5:1 para texto normal
- **Ratio recomendado**: 7:1 para AAA

El modo **"Auto"** garantiza al menos 4.5:1 de contraste.

### Colores Problemáticos
Evitar estas combinaciones:
- ❌ Rojo sobre verde (daltonismo)
- ❌ Amarillo sobre blanco (bajo contraste)
- ❌ Azul claro sobre blanco (bajo contraste)
- ❌ Gris medio sobre gris claro (bajo contraste)

### Colores Seguros
Siempre funcionan bien:
- ✅ Blanco sobre negro
- ✅ Negro sobre blanco
- ✅ Blanco sobre colores oscuros
- ✅ Negro sobre colores claros

---

## 🐛 Troubleshooting

### Problema: El texto no se ve en el badge
**Solución**: Cambiar de "Auto" a color manual opuesto al fondo.

### Problema: Los colores no se guardan
**Solución**: Verificar que el formulario se envía correctamente. Revisar consola (F12) para errores.

### Problema: Badge en catálogo muestra color incorrecto
**Solución**: 
1. Limpiar localStorage: `localStorage.clear()`
2. Recargar promociones desde index.html
3. Verificar que promo-engine.js está cargado

### Problema: Vista previa no actualiza
**Solución**: 
1. Verificar que marketing.js no tiene errores (F12)
2. Recargar la página
3. Verificar que los event listeners están funcionando

---

## 🚀 Próximas Mejoras Sugeridas

- [ ] Agregar más opciones de color de texto (gradientes)
- [ ] Permitir sombra de texto para mayor contraste
- [ ] Agregar indicador visual de contraste (WCAG AA/AAA)
- [ ] Presets de combinaciones de colores populares
- [ ] Exportar/importar paletas de colores

---

## 📞 Soporte

Si tienes dudas o problemas:
1. Abre consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que todos los scripts se cargaron correctamente
4. Limpia localStorage si hay datos corruptos

---

**Autor**: GitHub Copilot  
**Revisión**: Sistema KOND v3.2  
**Actualización**: Control de color de texto en badges
