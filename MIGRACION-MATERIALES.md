# 🚀 MIGRACIÓN MATERIALES → SUPABASE

**Estado:** ✅ Completado (Paso 2)  
**Fecha:** 2025-01-14

---

## 📋 Resumen

Se migró el módulo `materiales` de **localStorage** a **Supabase PostgreSQL**, centralizando el inventario de materiales para todo el equipo.

---

## 🎯 Objetivos Logrados

### ✅ Creación de Esquema
- **Tabla:** `materiales` con campos normalizados (nombre, tipo, tamano, espesor, unidad, costo_unitario, proveedor, stock, notas)
- **Tabla:** `proveedores` - Catálogo normalizado de proveedores
- **Tabla:** `tamanos_materiales` - Tamaños comunes normalizados
- **Tabla:** `espesores_materiales` - Espesores comunes normalizados
- **RLS Policies:**
  - ✅ Usuarios autenticados pueden leer materiales (SELECT)
  - ✅ Solo admins pueden crear/actualizar/eliminar (INSERT/UPDATE/DELETE)

### ✅ Funciones CRUD Implementadas
**Archivo:** `next-app/utils/supabaseMateriales.js`

#### Materiales
- `getAllMateriales()` - Obtener todos los materiales
- `getMaterialById(id)` - Obtener material por ID
- `createMaterial(material)` - Crear nuevo material
- `updateMaterial(id, materialUpdate)` - Actualizar material
- `deleteMaterial(id)` - Eliminar material
- `updateStock(id, nuevoStock)` - Actualizar solo stock

#### Proveedores
- `getAllProveedores()` - Obtener todos los proveedores
- `createProveedor(proveedor)` - Crear nuevo proveedor

#### Tamaños
- `getAllTamanos()` - Obtener tamaños disponibles
- `createTamano(valor, descripcion)` - Crear nuevo tamaño

#### Espesores
- `getAllEspesores()` - Obtener espesores disponibles
- `createEspesor(valor, descripcion)` - Crear nuevo espesor

### ✅ Integración con `/materiales`
**Archivo:** `next-app/pages/materiales.js`

#### `loadData()` - Carga híbrida
```javascript
// 1. Intenta cargar desde Supabase (requiere auth)
// 2. Fallback a localStorage si falla
// 3. Mapea snake_case → camelCase
// 4. Mantiene catálogos auxiliares en localStorage temporalmente
```

#### `handleSubmit()` - Creación/Edición híbrida
```javascript
// Si editingId existe:
//   1. Intenta updateMaterial() en Supabase
//   2. Recarga datos desde Supabase
//   3. Fallback a localStorage si falla

// Si es nuevo:
//   1. Intenta createMaterial() en Supabase
//   2. Recarga datos desde Supabase
//   3. Mantiene form abierto para crear más
//   4. Fallback a localStorage si falla
```

#### `handleDelete()` - Eliminación híbrida
```javascript
// 1. Intenta deleteMaterial() de Supabase
// 2. Recarga datos desde Supabase
// 3. Fallback a localStorage si falla
```

---

## 🔄 Flujo de Trabajo

### Crear Material (Admin)
1. Admin accede a `/materiales`
2. Click en "Nuevo material"
3. Completa formulario (nombre, tipo, tamaño, espesor, costo, proveedor, stock)
4. Submit → `createMaterial()` guarda en Supabase
5. `loadData()` recarga lista actualizada
6. Form permanece abierto para crear otro material rápidamente

### Editar Material (Admin)
1. Click en "Editar" en tarjeta de material
2. Modifica datos en formulario
3. Submit → `updateMaterial()` actualiza en Supabase
4. `loadData()` recarga lista actualizada
5. Form se cierra

### Eliminar Material (Admin)
1. Click en "Eliminar"
2. Confirma diálogo
3. `deleteMaterial()` elimina de Supabase
4. `loadData()` recarga lista actualizada

### Ver Materiales (Desde Productos)
1. En `/products`, al crear/editar producto
2. Selector de material carga desde localStorage (temporal)
3. **Próximo paso:** Actualizar `/products` para cargar desde Supabase

---

## 🧪 Testing

### ✅ Verificar Creación de Material
1. Ir a: `http://localhost:3000/materiales`
2. Click en "Nuevo material"
3. Completar: 
   - Nombre: "Acrílico Cristal"
   - Tipo: "Acrílico"
   - Tamaño: "122x244"
   - Espesor: "3mm"
   - Costo unitario: 15000
4. Guardar
5. **Verificar en consola:** `✅ Material creado en Supabase`
6. **Verificar en Supabase Dashboard:** Tabla `materiales` tiene el registro

### ✅ Verificar Lectura de Materiales
1. Refrescar `/materiales`
2. **Verificar en consola:** `✅ Materiales cargados desde Supabase: [cantidad]`
3. Ver lista de materiales cargada

### ✅ Verificar Actualización
1. Click en "Editar" en un material
2. Cambiar costo unitario
3. Guardar
4. **Verificar en consola:** `✅ Material actualizado en Supabase`
5. Refrescar y verificar que el cambio persiste

### ✅ Verificar Eliminación
1. Click en "Eliminar" en un material
2. Confirmar
3. **Verificar en consola:** `✅ Material eliminado de Supabase`
4. Material desaparece de la lista

### ⚠️ Verificar Fallback
1. DevTools → Network → Offline
2. Intentar crear material
3. **Verificar en consola:** `⚠️ Fallback a localStorage`
4. Material se guarda en localStorage

---

## 📊 Comparación localStorage vs Supabase

| Aspecto | localStorage | Supabase |
|---------|-------------|----------|
| Acceso multiusuario | ❌ Solo local | ✅ Sincronizado |
| Control de inventario | ⚠️ Manual | ✅ Stock en tiempo real |
| Historial de cambios | ❌ No | ✅ created_at/updated_at |
| Búsqueda avanzada | ❌ Manual | ✅ SQL queries |
| Catálogos normalizados | ❌ Arrays simples | ✅ Tablas relacionadas |
| Auditoría | ❌ No | ✅ Logs de Supabase |

---

## 🔧 Configuración Necesaria

### Supabase Dashboard
1. ✅ Tabla `materiales` creada (`supabase/materiales-tables.sql`)
2. ✅ Tabla `proveedores` creada
3. ✅ Tabla `tamanos_materiales` creada
4. ✅ Tabla `espesores_materiales` creada
5. ✅ RLS policies aplicadas (`supabase/materiales-rls-policies.sql`)

### SQL Scripts Ejecutados
```bash
# En Supabase SQL Editor:
# 1. Ejecutar supabase/materiales-tables.sql
# 2. Ejecutar supabase/materiales-rls-policies.sql
```

---

## 🚨 Consideraciones

### Migración de Datos Existentes
- Los materiales existentes en localStorage **NO se migran automáticamente**
- Para migrar materiales antiguos:
  1. Ir a DevTools → Application → Local Storage
  2. Copiar valor de clave `materiales`
  3. Usar script de migración o crear manualmente en `/materiales`

### Compatibilidad con Productos
- Actualmente `/products` sigue leyendo materiales de localStorage
- **Próximo paso:** Actualizar `/products` para usar `getAllMateriales()` de Supabase
- **Próximo paso:** Actualizar `/catalog` para cargar materiales desde Supabase

### Catálogos Auxiliares (Proveedores, Tamaños, Espesores)
- Actualmente siguen en localStorage
- Las tablas en Supabase están creadas pero no integradas en UI
- **Mejora futura:** Crear selectores dinámicos que carguen desde Supabase

---

## 📝 Próximos Pasos

### Paso 3: Migrar Pedidos Internos
- Tabla: `pedidos_internos` (ya creada en init.sql)
- Beneficios: Calendario sincronizado, producción en tiempo real

### Mejoras Pendientes para Materiales
- [ ] Actualizar `/products` para cargar materiales desde Supabase
- [ ] Actualizar `/catalog` para mostrar info de materiales desde Supabase
- [ ] Integrar selectores de proveedores/tamaños/espesores con Supabase
- [ ] Script de migración masiva localStorage → Supabase
- [ ] Dashboard de alertas de stock bajo
- [ ] Historial de cambios de stock

---

## 🐛 Troubleshooting

### Error: "row-level security policy"
**Solución:** Verificar que el usuario está autenticado con rol admin

### Materiales no se cargan en `/materiales`
**Solución:** Verificar conexión a Supabase, revisar logs en consola

### Materiales creados no aparecen en `/products`
**Solución:** `/products` aún usa localStorage. Crear material también en localStorage temporalmente o esperar integración completa.

### Stock no se actualiza
**Solución:** Usar función `updateStock(id, nuevoStock)` específicamente para actualizaciones de stock

---

## 🔗 Archivos Creados/Modificados

### SQL Scripts
- ✅ `supabase/materiales-tables.sql` - Definición de tablas
- ✅ `supabase/materiales-rls-policies.sql` - Políticas de acceso

### Backend
- ✅ `next-app/utils/supabaseMateriales.js` - Funciones CRUD completas

### Frontend
- ✅ `next-app/pages/materiales.js` - Integración híbrida Supabase/localStorage

### Documentación
- ✅ `MIGRACION-MATERIALES.md` - Esta guía

---

## 📞 Soporte

Para dudas sobre la migración:
- Revisar logs en consola (🔍 buscar emojis: ✅ ⚠️ ❌)
- Verificar Supabase Dashboard → Logs → Recent queries
- Revisar `next-app/pages/materiales.js` función `loadData()`
- Revisar `next-app/utils/supabaseMateriales.js` para CRUD

---

**Última actualización:** 2025-01-14  
**Versión:** Sistema KOND 4.0 - Migración Supabase Paso 2
