# 🎨 Personalización del Badge de Descuento Porcentual

**Fecha**: 19 de octubre de 2025  
**Versión**: 1.3.0

---

## 🆕 Nueva Funcionalidad

Ahora puedes **personalizar los colores del badge de descuento porcentual** (el que muestra `-10%`, `-20%`, etc.) que aparece cuando hay un descuento activo.

Anteriormente este badge siempre era **verde (#10b981) con texto blanco**, ahora puedes configurarlo en cada promoción.

---

## 📍 Ubicación

La configuración se encuentra en el formulario de promociones, en la sección **"Configuración específica"**, al final:

```
🎨 Badge de descuento porcentual
Personaliza el badge verde con el % (ej: -10%) que aparece cuando hay descuento

[Color de fondo: 🎨]  [Color del texto: Auto ▼]
Por defecto: verde (#10b981)
```

---

## 🎯 Casos de Uso

### Caso 1: Promoción de Envío Gratis
- **Situación**: Creas una promoción de "Envío Gratis" pero el badge de descuento sigue apareciendo en verde
- **Solución**: Configura el color del badge de descuento en la misma promoción
- **Ejemplo**: Fondo azul (#3b82f6) + Texto blanco → Badge azul con "Envío Gratis" + Badge azul con "-10%"

### Caso 2: Black Friday
- **Tema**: Negro elegante
- **Configuración**: 
  - Badge principal: Negro (#000000) + Texto blanco → "BLACK FRIDAY"
  - Badge descuento: Negro (#000000) + Texto blanco → "-50%"
- **Resultado**: Todo el producto tiene badges negros coherentes

### Caso 3: Temporada Navideña
- **Tema**: Rojo festivo
- **Configuración**:
  - Badge principal: Rojo (#ef4444) + Texto blanco → "NAVIDAD"
  - Badge descuento: Rojo (#ef4444) + Texto blanco → "-25%"
- **Resultado**: Badges rojos navideños

### Caso 4: Promoción Ecológica
- **Tema**: Verde natural
- **Configuración**:
  - Badge principal: Verde (#22c55e) + Texto blanco → "ECO"
  - Badge descuento: Verde oscuro (#059669) + Texto blanco → "-15%"
- **Resultado**: Paleta de verdes coherente

---

## 🔧 Cómo Usar

### Crear Nueva Promoción

1. **Abrir Marketing** → Click en "Nueva Promoción"
2. **Configurar promoción básica**:
   - Título: "Black Friday"
   - Tipo: "Descuento por porcentaje"
   - Badge: "BLACK"
   - Color badge: Negro (#000000)
   - Color texto: Blanco

3. **Configurar descuento**:
   - Descuento: 50%

4. **Scroll hasta el final de "Configuración específica"**:
   - Verás la sección "🎨 Badge de descuento porcentual"
   - Color de fondo: Elegir negro (#000000)
   - Color del texto: Auto (o Blanco)

5. **Guardar**

6. **Resultado en catálogo**:
   - Badge "BLACK" → Negro con texto blanco
   - Badge "-50%" → Negro con texto blanco (coherente)

---

### Editar Promoción Existente

1. **Abrir Marketing** → Click en "Editar" en una promoción
2. **Scroll hasta "Configuración específica"**
3. **Modificar colores del badge de descuento**
4. **Guardar**
5. **Recargar catálogo** para ver cambios

---

## 🎨 Configuración Detallada

### Campo 1: Color de Fondo
- **Tipo**: Color picker HTML5
- **Por defecto**: Verde (#10b981)
- **Tip**: Usa el mismo color que el badge principal para coherencia visual

### Campo 2: Color del Texto
- **Opciones**:
  - **Auto (detectar contraste)**: 🤖 Recomendado - Calcula automáticamente
  - **⚪ Blanco**: Para fondos oscuros
  - **⚫ Negro**: Para fondos claros

---

## 📊 Flujo Técnico

### 1. Guardar en Promoción
```javascript
config: {
  percentage: 50,
  discountBadgeColor: '#000000',
  discountBadgeTextColor: 'auto'
}
```

### 2. PromoEngine Procesa
```javascript
result.discountBadgeColor = promo.config.discountBadgeColor || '#10b981';
result.discountBadgeTextColor = promo.config.discountBadgeTextColor || 'auto';
```

### 3. Catalog.js Renderiza
```javascript
const discountBadgeColor = promoResult.discountBadgeColor;
const discountBadgeTextColor = // calcula según 'auto' o usa fijo

<span style="background-color: ${discountBadgeColor}; color: ${discountBadgeTextColor};">
  -50%
</span>
```

---

## 🎓 Combinaciones Sugeridas

### Coherencia Visual (Mismo color en todos los badges)

| Promoción | Badge Principal | Badge Descuento |
|-----------|----------------|-----------------|
| Black Friday | ⚫ Negro + ⚪ Blanco | ⚫ Negro + ⚪ Blanco |
| Verano | 🟡 Amarillo + ⚫ Negro | 🟡 Amarillo + ⚫ Negro |
| Navidad | 🔴 Rojo + ⚪ Blanco | 🔴 Rojo + ⚪ Blanco |
| Cyber Monday | 🔵 Azul + ⚪ Blanco | 🔵 Azul + ⚪ Blanco |

### Contraste (Diferentes colores para diferenciar)

| Promoción | Badge Principal | Badge Descuento |
|-----------|----------------|-----------------|
| Primavera | 💗 Rosa + ⚫ Negro | 🟢 Verde + ⚪ Blanco |
| Halloween | 🟠 Naranja + ⚫ Negro | ⚫ Negro + ⚪ Blanco |
| Premium | 🟣 Morado + ⚪ Blanco | 🟡 Dorado + ⚫ Negro |

---

## ⚙️ Configuración Avanzada

### Múltiples Promociones en el Mismo Producto

Si un producto tiene **múltiples promociones simultáneas**:
- Cada promoción tiene su propio badge con sus colores
- El badge de descuento toma el color de la **primera promoción** que lo defina
- Si ninguna lo define, usa verde por defecto

**Ejemplo**:
```
Producto: Llavero
Promoción 1: "OUTLET" (Rojo) → config.discountBadgeColor = '#ef4444'
Promoción 2: "VERANO" (Amarillo) → Sin config.discountBadgeColor

Resultado:
- Badge "OUTLET" → Rojo
- Badge "VERANO" → Amarillo
- Badge "-30%" → Rojo (toma color de Promoción 1)
```

### Prioridad de Colores

1. **Primera promoción con `config.discountBadgeColor`** → Se usa
2. **Si ninguna lo define** → Verde (#10b981) por defecto

---

## 🧪 Pruebas Recomendadas

### Test 1: Envío Gratis con Color Personalizado
1. Crear promo "Envío Gratis"
2. Badge: "GRATIS" → Azul (#3b82f6)
3. Descuento: 0% (sin descuento real)
4. Color badge descuento: Azul (#3b82f6)
5. **Verificar**: Si hay descuento por otra promo, el badge -X% es azul ✅

### Test 2: Black Friday
1. Crear promo "Black Friday"
2. Badge: "BLACK" → Negro (#000000)
3. Descuento: 50%
4. Color badge descuento: Negro (#000000) + Texto Blanco
5. **Verificar**: Badge "BLACK" negro + Badge "-50%" negro ✅

### Test 3: Sin Configuración (Por Defecto)
1. Crear promo sin tocar colores del badge descuento
2. Descuento: 20%
3. **Verificar**: Badge "-20%" es verde (#10b981) ✅

### Test 4: Edición de Promoción Existente
1. Editar promo existente
2. **Verificar**: Campos de color cargan valores guardados ✅
3. Cambiar color de verde a rojo
4. Guardar y recargar catálogo
5. **Verificar**: Badge "-X%" ahora es rojo ✅

---

## 🐛 Troubleshooting

### Problema: El badge de descuento sigue siendo verde
**Soluciones**:
1. Verificar que la promoción tenga `config.discountBadgeColor` guardado
2. Limpiar localStorage y recrear promoción
3. Verificar en consola (F12) que `promoResult.discountBadgeColor` tiene el valor correcto

### Problema: Los colores no se guardan al editar
**Soluciones**:
1. Verificar que los campos `#mkDiscountBadgeColor` y `#mkDiscountBadgeTextColor` existen en el DOM
2. Revisar consola para errores de JavaScript
3. Verificar que `onCreateSubmit()` está guardando correctamente

### Problema: El texto del badge no se ve (contraste bajo)
**Soluciones**:
1. Cambiar de "Auto" a color manual (Blanco o Negro)
2. Elegir un color de fondo más oscuro o más claro
3. Usar combinaciones de alto contraste (Negro+Blanco, Blanco+Negro)

---

## 📁 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `js/marketing.js` | • Agregados campos `#mkDiscountBadgeColor` y `#mkDiscountBadgeTextColor`<br>• Guardar valores en `config.discountBadgeColor` y `config.discountBadgeTextColor`<br>• Preservar valores al cambiar tipo de promoción<br>• Cargar valores al editar |
| `js/promo-engine.js` | • Agregado `result.discountBadgeColor` y `result.discountBadgeTextColor`<br>• Tomar colores de `promo.config.discountBadgeColor`<br>• Prioridad: primera promo que los defina |
| `js/catalog.js` | • Calcular `discountBadgeColor` y `discountBadgeTextColor` desde `promoResult`<br>• Aplicar colores en el HTML del badge `-X%`<br>• Auto-detección de contraste si es 'auto' |

---

## 🚀 Próximas Mejoras Sugeridas

- [ ] Previsualización en tiempo real del badge de descuento
- [ ] Paleta de colores sugeridos según el tema
- [ ] Configuración global de colores por defecto
- [ ] Animación al aplicar descuento
- [ ] Degradado de colores en badges

---

## 📞 Soporte

Si tienes dudas:
1. Revisa esta guía completa
2. Consulta `docs/guides/GUIA-COLOR-TEXTO-BADGES.md` para info sobre colores de texto
3. Abre consola (F12) para ver errores
4. Verifica que todos los scripts estén cargados

---

**Autor**: GitHub Copilot  
**Revisión**: Sistema KOND v3.2  
**Actualización**: Color personalizable del badge de descuento porcentual

